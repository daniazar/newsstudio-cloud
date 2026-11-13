import { checkComfyUIHealth, clearComfyUIVRAM, COMFYUI_URL } from './api';

export interface WatchdogOptions {
  timeoutMs?: number; // Default: 20 minutes (1,200,000 ms)
}

/**
 * Self-healing ComfyUI Watchdog: Checks if server is stuck > 20 minutes (1,200,000 ms),
 * interrupts the hanging generation queue, and purges GPU VRAM.
 */
export async function monitorComfyUIWatchdog(startTime: number, options: WatchdogOptions = {}): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 1_200_000; // 20 minutes
  const elapsed = Date.now() - startTime;

  if (elapsed > timeoutMs) {
    console.warn(`⚠️ [ComfyWatchdog] ComfyUI generation job exceeded ${timeoutMs / 60000} minutes! Executing self-healing interrupt & VRAM purge...`);
    try {
      await fetch(`${COMFYUI_URL}/interrupt`, { method: "POST" }).catch(() => {});
      await fetch(`${COMFYUI_URL}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      }).catch(() => {});
    } catch {}

    await clearComfyUIVRAM();
    const isOnline = await checkComfyUIHealth();
    return isOnline;
  }

  return true;
}

