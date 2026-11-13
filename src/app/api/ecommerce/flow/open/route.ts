/**
 * src/app/api/ecommerce/flow/open/route.ts
 *
 * API endpoint to reliably activate and bring Google Flow to the front.
 * 1. Checks if Chrome CDP on port 9222 has a flow.google.com target open.
 * 2. If found, calls /json/activate/{id} and activates the Chrome window on Windows.
 * 3. If not found or CDP offline, launches/opens the URL in the system browser.
 */

import { NextRequest, NextResponse } from "next/server";
import http from "http";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { requireTenant } from "@/lib/tenant";
import { DEFAULT_FLOW_PROJECT_URL } from "@/components/editor/shared/visuals/types";
import { getChromePath } from "@/lib/binaries";

interface CdpTarget {
  id?: string;
  type?: string;
  url?: string;
  devtoolsFrontendUrl?: string;
  webSocketDebuggerUrl?: string;
}

interface CdpVersion {
  webSocketDebuggerUrl?: string;
  [key: string]: unknown;
}

function queryCdpTargets(port: number = 9222): Promise<CdpTarget[]> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
    req.on("error", () => resolve([]));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve([]);
    });
  });
}

function queryCdpVersion(port: number = 9222): Promise<CdpVersion | null> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function activateCdpTarget(targetId: string, port: number = 9222): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/activate/${targetId}`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Uses Chrome DevTools Protocol to unminimize, restore, and maximize the window,
 * and brings the Flow page tab to the front.
 */
async function restoreAndMaximizeViaCdp(targetId: string, pageWsUrl?: string, port: number = 9222): Promise<void> {
  try {
    const version = await queryCdpVersion(port);
    if (!version?.webSocketDebuggerUrl) return;

    // 1. Unminimize / maximize the OS window via Browser domain
    const browserWs = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => resolve(), 2000);
      browserWs.addEventListener("open", () => {
        clearTimeout(t);
        resolve();
      }, { once: true });
      browserWs.addEventListener("error", () => {
        clearTimeout(t);
        resolve();
      }, { once: true });
    });

    let msgId = 1;
    const sendBrowser = (method: string, params: Record<string, unknown> = {}) =>
      new Promise<Record<string, unknown> | null>((resolve) => {
        const id = msgId++;
        const t = setTimeout(() => resolve(null), 2000);
        const onMsg = (e: MessageEvent) => {
          try {
            const m = JSON.parse(e.data.toString());
            if (m.id === id) {
              clearTimeout(t);
              browserWs.removeEventListener("message", onMsg);
              resolve(m.result as Record<string, unknown>);
            }
          } catch {
            clearTimeout(t);
            resolve(null);
          }
        };
        browserWs.addEventListener("message", onMsg);
        browserWs.send(JSON.stringify({ id, method, params }));
      });

    const winInfo = await sendBrowser("Browser.getWindowForTarget", { targetId });
    if (winInfo?.windowId) {
      await sendBrowser("Browser.setWindowBounds", {
        windowId: winInfo.windowId,
        bounds: { windowState: "normal" },
      });
      await sendBrowser("Browser.setWindowBounds", {
        windowId: winInfo.windowId,
        bounds: { windowState: "maximized" },
      });
    }
    browserWs.close();

    // 2. Bring page to front
    if (pageWsUrl) {
      const pageWs = new WebSocket(pageWsUrl);
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => resolve(), 2000);
        pageWs.addEventListener("open", () => {
          clearTimeout(t);
          resolve();
        }, { once: true });
      });
      pageWs.send(JSON.stringify({ id: 999, method: "Page.bringToFront" }));
      setTimeout(() => pageWs.close(), 500);
    }
  } catch (e) {
    console.warn("[restoreAndMaximizeViaCdp] Notice:", e);
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Browser automation is not available in cloud deployments" },
      { status: 503 }
    );
  }

  const t = await requireTenant();
  if (!t.ok) return t.response;

  try {
    const body = await req.json().catch(() => ({}));
    const rawTargetUrl = body.url || DEFAULT_FLOW_PROJECT_URL;

    // Validate target URL: Must be valid HTTPS URL on flow.google.com or labs.google
    let parsedTargetUrl: URL;
    try {
      parsedTargetUrl = new URL(rawTargetUrl);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid target URL format." }, { status: 400 });
    }

    if (
      parsedTargetUrl.protocol !== "https:" ||
      !["flow.google.com", "labs.google"].includes(parsedTargetUrl.hostname.toLowerCase())
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized destination host. Only flow.google.com and labs.google are allowed." },
        { status: 400 }
      );
    }

    const targetUrl = parsedTargetUrl.toString();

    // 1. Check CDP targets on port 9222
    let targets = await queryCdpTargets(9222);
    let flowTarget = targets.find(
      (t) =>
        t.url &&
        typeof t.url === "string" &&
        t.url.includes("flow.google.com") &&
        (t.type === "page" || !t.type)
    );

    const formatDevtoolsUrl = (url?: string) => {
      if (!url) return "http://127.0.0.1:9222";
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      return `http://127.0.0.1:9222${url.startsWith("/") ? "" : "/"}${url}`;
    };

    if (flowTarget?.id) {
      await activateCdpTarget(flowTarget.id, 9222);
      await restoreAndMaximizeViaCdp(flowTarget.id, flowTarget.webSocketDebuggerUrl, 9222);
      return NextResponse.json({
        success: true,
        action: "cdp_activated",
        targetId: flowTarget.id,
        url: flowTarget.url,
        devtoolsUrl: formatDevtoolsUrl(flowTarget.devtoolsFrontendUrl),
      });
    }

    // 2. If Chrome CDP is running but no Flow page is open, create a new tab via CDP
    const browserTarget = targets.find((t) => t.type === "page" || t.webSocketDebuggerUrl);
    if (browserTarget) {
      const newTarget: CdpTarget | null = await new Promise((resolve) => {
        const createReq = http.get(
          `http://127.0.0.1:9222/json/new?${encodeURIComponent(targetUrl)}`,
          (res) => {
            let d = "";
            res.on("data", (c) => (d += c));
            res.on("end", () => {
              try { resolve(JSON.parse(d)); } catch { resolve(null); }
            });
          }
        );
        createReq.on("error", () => resolve(null));
        createReq.setTimeout(2000, () => {
          createReq.destroy();
          resolve(null);
        });
      });

      if (newTarget?.id) {
        await restoreAndMaximizeViaCdp(newTarget.id, newTarget.webSocketDebuggerUrl, 9222);
      }

      return NextResponse.json({
        success: true,
        action: "cdp_new_tab",
        url: targetUrl,
        devtoolsUrl: newTarget?.devtoolsFrontendUrl,
      });
    }

    // 3. Fallback: Launch Chrome with Automation profile and debugging port 9222
    if ((process.env.NODE_ENV as string) === "production" && process.platform !== "win32") {
      return NextResponse.json(
        { success: false, error: "Local Chrome CDP browser automation is not available in headless container environments. Connect an external CDP sidecar or run on desktop." },
        { status: 503 }
      );
    }

    const chromePath = getChromePath();
    const userDataDir = path.join(
      process.env.LOCALAPPDATA || path.join(os.tmpdir(), "GoogleChromeData"),
      "Google",
      "Chrome",
      "AutomationData"
    );

    const chromeArgs = [
      "--remote-debugging-port=9222",
      "--remote-allow-origins=*",
      `--user-data-dir=${userDataDir}`,
      "--new-window",
      "--no-first-run",
      "--no-default-browser-check",
      targetUrl,
    ];

    const child = spawn(chromePath, chromeArgs, { detached: true, stdio: "ignore" });
    child.unref();

    // Give it 1.5s to initialize
    await new Promise((r) => setTimeout(r, 1500));
    targets = await queryCdpTargets(9222);
    flowTarget = targets.find((t) => t.url?.includes("flow.google.com") || t.type === "page");

    return NextResponse.json({
      success: true,
      action: "automation_chrome_launched",
      url: targetUrl,
      devtoolsUrl: flowTarget?.devtoolsFrontendUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
