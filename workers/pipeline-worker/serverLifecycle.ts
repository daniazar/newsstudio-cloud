/**
 * workers/pipeline-worker/serverLifecycle.ts
 *
 * Local server lifecycle management (Modern-TTS, SadTalker, ComfyUI).
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getPythonPath } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";
import { resolveVendorRoot } from "./config";

const log = createLogger("worker:serverLifecycle");

const _isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";

export let modernTtsProcess: ReturnType<typeof spawn> | null = null;
export let modernTalkingHeadProcess: ReturnType<typeof spawn> | null = null;
export let sadtalkerProcess: ReturnType<typeof spawn> | null = null;
export let comfyuiProcess: ReturnType<typeof spawn> | null = null;

let isShuttingDown = false;

const pythonUtf8Env = {
  PYTHONUTF8: "1",
  PYTHONIOENCODING: "utf-8",
  PYTHONUNBUFFERED: "1",
};

export function setShuttingDown(val: boolean) {
  isShuttingDown = val;
}

export async function startModernTtsServer(): Promise<void> {
  const PORT = process.env.MODERN_TTS_PORT || 8005;
  const URL = process.env.MODERN_TTS_SERVER_URL || `http://localhost:${PORT}`;
  const healthUrl = `${URL.replace(/\/+$/, "")}/health`;

  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      log.info(`  ✅ Modern TTS server is already running at ${URL}`);
      return;
    }
  } catch {}

  log.info(`  🚀 Starting Modern TTS Server (Port ${PORT}, RTX 5090 BF16)...`);
  const modernTtsDir = path.join(resolveVendorRoot(), "Modern-TTS-Server");
  const isWinOS = process.platform === "win32";
  const pyBin = isWinOS
    ? path.join(modernTtsDir, "venv/Scripts/python.exe")
    : path.join(modernTtsDir, "venv/bin/python");
  const pyCmd = fs.existsSync(pyBin) ? pyBin : getPythonPath();

  const activeProfile = process.env.TTS_PROFILE || "studio";
  let childExited = false;
  let exitInfo = "";

  modernTtsProcess = spawn(pyCmd, ["server.py", "--port", String(PORT), "--profile", activeProfile], {
    cwd: modernTtsDir,
    stdio: "inherit",
    env: { ...process.env, ...pythonUtf8Env, TTS_PROFILE: activeProfile },
  });

  modernTtsProcess.on("error", (err) => {
    childExited = true;
    exitInfo = err.message;
    modernTtsProcess = null;
    log.error({ err: err.message }, "Failed to start Modern TTS Server");
  });

  modernTtsProcess.on("exit", (code, signal) => {
    childExited = true;
    exitInfo = `code=${code ?? "null"}, signal=${signal ?? "null"}`;
    modernTtsProcess = null;
    log.warn({ code, signal }, "Modern TTS Server process exited");
  });

  for (let i = 0; i < 60; i++) {
    if (isShuttingDown) break;
    if (childExited) {
      throw new Error(`Modern TTS Server process exited during startup (${exitInfo})`);
    }
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        log.info("  ✅ Modern TTS server is ready");
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export function stopModernTtsServer(): void {
  if (modernTtsProcess) {
    log.info("  🛑 Stopping Modern TTS Server to free VRAM...");
    modernTtsProcess.kill("SIGTERM");
    modernTtsProcess = null;
  }
}

export async function startModernTalkingHeadServer(): Promise<void> {
  const PORT = process.env.MODERN_TALKINGHEAD_PORT || 8010;
  const URL = process.env.MODERN_TALKINGHEAD_SERVER_URL || process.env.TALKINGHEAD_SERVER_URL || `http://localhost:${PORT}`;
  const healthUrl = `${URL.replace(/\/+$/, "")}/health`;

  const isExternal = !healthUrl.includes("localhost") && !healthUrl.includes("127.0.0.1") && !healthUrl.includes("::1");

  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      log.info(`  ✅ Modern TalkingHead server is already running at ${URL}`);
      return;
    }
  } catch {}

  if (isExternal) {
    log.info(`  ⏳ Waiting for external TalkingHead server at ${URL} to become ready...`);
    for (let i = 0; i < 30; i++) {
      if (isShuttingDown) break;
      try {
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          log.info(`  ✅ External TalkingHead server is ready at ${URL}`);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.warn(`  ⚠️ External TalkingHead server at ${URL} did not respond; proceeding with fallback.`);
    return;
  }

  log.info(`  🚀 Starting Modern TalkingHead Server (Port ${PORT}, MuseTalk / Ditto)...`);
  const talkingHeadDir = path.join(resolveVendorRoot(), "Modern-TalkingHead-Server");
  const isWinOS = process.platform === "win32";
  const pyBin = isWinOS
    ? path.join(talkingHeadDir, "venv/Scripts/python.exe")
    : path.join(talkingHeadDir, "venv/bin/python");
  const pyCmd = fs.existsSync(pyBin) ? pyBin : getPythonPath();

  if (fs.existsSync(talkingHeadDir)) {
    modernTalkingHeadProcess = spawn(pyCmd, ["server.py", "--port", String(PORT)], {
      cwd: talkingHeadDir,
      stdio: "inherit",
      env: { ...process.env, ...pythonUtf8Env },
    });

    modernTalkingHeadProcess.on("error", (err) => console.error("  ❌ Failed to start Modern TalkingHead Server:", err));
    modernTalkingHeadProcess.on("exit", () => {
      modernTalkingHeadProcess = null;
    });

    for (let i = 0; i < 60; i++) {
      if (isShuttingDown) break;
      try {
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          log.info("  ✅ Modern TalkingHead server is ready");
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
    }
  } else {
    console.warn(`  ⚠️ Modern TalkingHead directory not found at ${talkingHeadDir}`);
  }
}

export function stopModernTalkingHeadServer(): void {
  if (modernTalkingHeadProcess) {
    log.info("  🛑 Stopping Modern TalkingHead Server to free VRAM...");
    modernTalkingHeadProcess.kill("SIGTERM");
    modernTalkingHeadProcess = null;
  }
}

// Backwards-compatible aliases for legacy SadTalker calls
export async function startSadtalkerServer(): Promise<void> {
  return startModernTalkingHeadServer();
}

export function stopSadtalkerServer(): void {
  stopModernTalkingHeadServer();
}

export async function startComfyUIServer(): Promise<void> {
  const COMFYUI_PORT = process.env.COMFYUI_PORT || 8188;
  const COMFYUI_URL = process.env.COMFYUI_URL || process.env.NEXT_PUBLIC_COMFYUI_URL || `http://127.0.0.1:${COMFYUI_PORT}`;
  const url = `${COMFYUI_URL.replace(/\/+$/, "")}/system_stats`;

  const isExternal = !url.includes("localhost") && !url.includes("127.0.0.1") && !url.includes("::1");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      log.info(`  ✅ ComfyUI is already running at ${url}`);
      return;
    }
  } catch {}

  if (isExternal) {
    log.info(`  ⏳ Waiting for external ComfyUI server at ${url} to become ready...`);
    for (let i = 0; i < 150; i++) {
      if (isShuttingDown) break;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          log.info(`  ✅ External ComfyUI is ready at ${url}`);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`External ComfyUI server at ${url} failed to respond within 5 minutes`);
  }

  log.info(`  🚀 Starting ComfyUI Server...`);
  const env = { ...process.env };
  const comfyDir = path.join(resolveVendorRoot(), "ComfyUI");

  const comfyPythonCmd = fs.existsSync(path.join(comfyDir, "venv/bin/python"))
    ? path.join(comfyDir, "venv/bin/python")
    : isWindows && fs.existsSync(path.join(comfyDir, "venv/Scripts/python.exe"))
    ? path.join(comfyDir, "venv/Scripts/python.exe")
    : getPythonPath();

  Object.assign(env, pythonUtf8Env);
  env.PYTORCH_CUDA_ALLOC_CONF = "expandable_segments:True";
  comfyuiProcess = spawn(comfyPythonCmd, ["main.py", "--reserve-vram", "2.5", "--vram-headroom", "1.0", "--disable-pinned-memory", "--port", String(COMFYUI_PORT)], {
    cwd: comfyDir,
    stdio: "inherit",
    env,
  });

  comfyuiProcess.on("error", (err) => console.error("  ❌ Failed to start ComfyUI:", err));
  comfyuiProcess.on("exit", () => {
    log.info("  ⚠️ ComfyUI process exited unexpectedly");
    comfyuiProcess = null;
  });

  for (let i = 0; i < 150; i++) {
    if (isShuttingDown) break;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        log.info("  ✅ ComfyUI is ready");
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("ComfyUI server failed to start within 5 minutes");
}

export function stopComfyUIServer(): void {
  if (comfyuiProcess) {
    log.info("  🛑 Stopping ComfyUI Server to free VRAM...");
    comfyuiProcess.kill("SIGTERM");
    comfyuiProcess = null;
  }
}
