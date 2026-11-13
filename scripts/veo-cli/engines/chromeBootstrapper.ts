/**
 * scripts/veo-cli/engines/chromeBootstrapper.ts
 *
 * Autonomous Chrome Remote Debugging (port 9222) Bootstrapper.
 * 
 * Ensures Chrome CDP is online before any Flow Web / Veo generation starts.
 * If offline, launches Chrome with persistent automation profile in detached mode
 * and polls until ready. Never kills or interferes with existing user Chrome windows.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

export const DEFAULT_CHROME_CDP_PORT = 9222;
export const DEFAULT_CHROME_CDP_URL = `http://127.0.0.1:${DEFAULT_CHROME_CDP_PORT}`;
export const DEFAULT_FLOW_PROJECT_URL = "https://flow.google.com/project/065b7352-6e4f-4aa9-b420-eab8beeebcdd";

/**
 * Resolves Google Chrome executable path on Windows.
 */
export function getChromeExecutablePath(): string {
  const candidatePaths = [
    process.env.CHROME_BIN,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  // Fallback string
  return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
}

/**
 * Resolves persistent Automation Chrome profile directory.
 */
export function getChromeUserDataDir(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "C:\\Users\\danie", "AppData", "Local");
  const dataDir = path.join(localAppData, "Google", "Chrome", "AutomationData");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

/**
 * Probes the Chrome Remote Debugging port via HTTP GET /json/version.
 */
export function isChromeDebugPortActive(timeoutMs = 1500): Promise<{ active: boolean; browser?: string }> {
  return new Promise((resolve) => {
    const req = http.get(`${DEFAULT_CHROME_CDP_URL}/json/version`, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ active: true, browser: parsed.Browser });
        } catch {
          resolve({ active: true });
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ active: false });
    });

    req.on("error", () => {
      resolve({ active: false });
    });
  });
}

export interface EnsureChromeOptions {
  targetUrl?: string;
  maxWaitMs?: number;
  silent?: boolean;
}

/**
 * Autonomously ensures Chrome is running with remote debugging on port 9222.
 * If active, returns immediately. If inactive, spawns Chrome in background
 * with automation profile and polls until connected.
 */
export async function ensureChromeDebugRunning(options: EnsureChromeOptions = {}): Promise<boolean> {
  const targetUrl = options.targetUrl || DEFAULT_FLOW_PROJECT_URL;
  const maxWaitMs = options.maxWaitMs || 25000;
  const silent = options.silent ?? false;

  // 1. Check if already online
  const initialCheck = await isChromeDebugPortActive(1200);
  if (initialCheck.active) {
    if (!silent) {
      console.log(`[CDP] Chrome debugging port ${DEFAULT_CHROME_CDP_PORT} is ACTIVE (${initialCheck.browser || "Connected"})`);
    }
    return true;
  }

  // 2. Offline -> Launch Chrome autonomously
  const chromePath = getChromeExecutablePath();
  const userDataDir = getChromeUserDataDir();

  if (!fs.existsSync(chromePath)) {
    console.error(`[CDP Error] Chrome executable not found at: ${chromePath}`);
    return false;
  }

  if (!silent) {
    console.log(`\n==================================================================`);
    console.log(`🌐 AUTONOMOUSLY LAUNCHING CHROME ON DEBUGGING PORT ${DEFAULT_CHROME_CDP_PORT}`);
    console.log(`   Binary:   ${chromePath}`);
    console.log(`   Profile:  ${userDataDir}`);
    console.log(`   Target:   ${targetUrl}`);
    console.log(`==================================================================\n`);
  }

  const args = [
    `--remote-debugging-port=${DEFAULT_CHROME_CDP_PORT}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${userDataDir}`,
    "--new-window",
    "--no-first-run",
    "--no-default-browser-check",
    targetUrl,
  ];

  try {
    if (process.platform === "win32") {
      const { exec } = await import("child_process");
      const cmd = `start "" "${chromePath}" --remote-debugging-port=${DEFAULT_CHROME_CDP_PORT} --remote-allow-origins=* --user-data-dir="${userDataDir}" --new-window --no-first-run --no-default-browser-check "${targetUrl}"`;
      exec(cmd);
    } else {
      const child = spawn(chromePath, args, {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    }
  } catch (err: any) {
    console.error(`[CDP Error] Failed to spawn Chrome:`, err.message);
    return false;
  }

  // 3. Poll until port 9222 is alive
  const start = Date.now();
  const pollIntervalMs = 500;

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const probe = await isChromeDebugPortActive(1000);
    if (probe.active) {
      if (!silent) {
        console.log(`[CDP OK] Chrome debugging session online! (${probe.browser || "Active"})\n`);
      }
      return true;
    }
  }

  console.error(`[CDP Error] Timed out waiting for Chrome port ${DEFAULT_CHROME_CDP_PORT} after ${maxWaitMs / 1000}s`);
  return false;
}
