/**
 * src/lib/ai/comfy/comfyLauncher.ts
 *
 * Centralized utility for checking ComfyUI server health, detecting standalone Desktop environments,
 * and auto-starting the ComfyUI background process if offline.
 */

import { execSync, spawn } from "child_process";
import path from "path";
import { checkComfyUIHealth } from "./api";
import { getPythonPath, getComfyModelsDir } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:comfyLauncher");

export interface EnsureComfyUIOptions {
  timeoutMs?: number;
  comfyCwd?: string;
  pythonExe?: string;
  quiet?: boolean;
}

/**
 * Ensures that the local ComfyUI server is running and accessible on port 8188.
 * If offline, attempts to auto-launch the ComfyUI Python process and waits until ready.
 */
export async function ensureComfyUIOnline(options: EnsureComfyUIOptions = {}): Promise<boolean> {
  const defaultComfyCwd = path.dirname(getComfyModelsDir());
  const {
    timeoutMs = 60000,
    comfyCwd = defaultComfyCwd,
    pythonExe = getPythonPath(),
    quiet = false
  } = options;

  // 1. Check for standalone Desktop environment on Windows
  if (process.platform === "win32" && !quiet) {
    try {
      const isStandalone = execSync(
        'powershell -NoProfile -Command "Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*standalone-env*\' }"',
        { encoding: "utf8" }
      ).trim();

      if (isStandalone) {
        log.info("\n⚠️  Warning: ComfyUI is currently running via the ComfyUI Desktop GUI app (standalone-env).");
        log.info("   If you experience generation errors like '[Errno 22] Invalid argument', please close the Desktop app and re-run to launch the correct background environment.\n");
      }
    } catch {
      // Ignore PowerShell query failures
    }
  }

  // 2. Ping ComfyUI health
  const isOnline = await checkComfyUIHealth();
  if (isOnline) {
    if (!quiet) log.info("✅ ComfyUI server is online and ready on port 8188.");
    return true;
  }

  // In production or when auto-start is not explicitly enabled, do not attempt to spawn local desktop processes
  if (process.env.NODE_ENV === "production" || process.env.COMFYUI_AUTO_START !== "true") {
    if (!quiet) console.warn("⚠️  ComfyUI is offline. Background process auto-start is disabled in this environment.");
    return false;
  }

  if (!quiet) log.info("\n⚠️  ComfyUI is offline. Starting ComfyUI server process...");

  // 3. Spawn Python process in detached background mode
  try {
    const proc = spawn(pythonExe, ["main.py", "--reserve-vram", "2.5", "--vram-headroom", "1.0", "--disable-pinned-memory", "--listen", "127.0.0.1", "--port", "8188"], {
      cwd: comfyCwd,
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        PYTORCH_CUDA_ALLOC_CONF: "expandable_segments:True",
      },
    });
    proc.unref();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Failed to spawn ComfyUI process:", message);
    return false;
  }

  if (!quiet) log.info(`Waiting for ComfyUI to respond on port 8188 (timeout: ${Math.round(timeoutMs / 1000)}s)...`);

  // 4. Poll until online or timeout
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const onlineNow = await checkComfyUIHealth();
    if (onlineNow) {
      if (!quiet) log.info("\n✅ ComfyUI is now online and ready!\n");
      return true;
    }
    if (!quiet) process.stdout.write(".");
  }

  if (!quiet) console.error("\n❌ Timeout: ComfyUI server failed to respond within timeout.");
  return false;
}
