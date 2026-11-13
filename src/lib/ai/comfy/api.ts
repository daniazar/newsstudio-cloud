/**
 * src/lib/ai/comfy/api.ts
 *
 * Low-level connection, queue management, polling, and download calls for ComfyUI.
 */

import fs from "fs";
import path from "path";

export function getComfyUIUrl(): string {
  return process.env.COMFYUI_URL || process.env.NEXT_PUBLIC_COMFYUI_URL || "http://localhost:8188";
}

export function getWsUrl(): string {
  return getComfyUIUrl().replace(/^http/, "ws");
}

export const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";
export const WS_URL = COMFYUI_URL.replace(/^http/, "ws");
export const CLIENT_ID = "1011678440";

export function comfyLog(...args: unknown[]): void {
  if (process.env.COMFY_VERBOSE === "true") {
    console.warn(...args);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Check if ComfyUI server is reachable.
 */
export async function checkComfyUIHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getComfyUIUrl()}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Purges ComfyUI VRAM cache, model memory, and PuLID face embeddings before new pipeline passes.
 */
export async function clearComfyUIMemory(): Promise<void> {
  try {
    const res = await fetch(`${getComfyUIUrl()}/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unload_models: false, free_memory: true })
    });
    if (res.ok) {
      console.warn(`🧹 [ComfyUI Memory Engine] Successfully purged GPU VRAM cache and latent tensors.`);
    }
  } catch {
    // Non-fatal if server endpoint not present
  }
}

/**
 * Upload a local file or buffer to ComfyUI's input directory.
 * Appends a timestamp hash to prevent ComfyUI from serving stale cached image tensors.
 * Returns the filename as stored by ComfyUI.
 */
export async function uploadFileToComfyUI(
  fileOrPath: string | Buffer,
  subfolder = "",
  overrideFilename?: string
): Promise<string> {
  let fileBuffer: Buffer;
  let filename: string;

  if (typeof fileOrPath === "string") {
    const ext = path.extname(fileOrPath);
    const base = path.basename(fileOrPath, ext);
    filename = overrideFilename || `${base}_${Date.now()}${ext}`;
    // Replaced sync read with async promise-based read
    fileBuffer = await fs.promises.readFile(fileOrPath);
  } else {
    filename = overrideFilename || `upload_${Date.now()}.png`;
    fileBuffer = fileOrPath;
  }

  // Use native FormData
  const form = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  form.append("image", blob, filename);
  if (subfolder) form.append("subfolder", subfolder);
  form.append("type", "input");
  form.append("overwrite", "true");

  const res = await fetch(`${getComfyUIUrl()}/upload/image`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ComfyUI upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.name as string;
}

/**
 * Purges ComfyUI VRAM memory cache and clears execution history.
 */
export async function freeComfyMemory(unloadModels: boolean = false): Promise<void> {
  try {
    const baseUrl = getComfyUIUrl();
    await fetch(`${baseUrl}/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unload_models: unloadModels, free_memory: true }),
    });
    await fetch(`${baseUrl}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    comfyLog("🧹 [ComfyClient] Purged VRAM cache & cleared execution history.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    comfyLog("⚠️ [ComfyClient] Failed to free ComfyUI memory:", msg);
  }
}

/**
 * Submit a workflow to ComfyUI.
 * Returns the prompt_id for status tracking.
 */
export async function submitPrompt(
  workflow: Record<string, unknown>,
  clientId: string = CLIENT_ID
): Promise<string> {
  // Purge VRAM cache, clear history, and interrupt running queue before submitting new prompt
  await freeComfyMemory(false);
  const baseUrl = getComfyUIUrl();
  try {
    await fetch(`${baseUrl}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    await fetch(`${baseUrl}/interrupt`, {
      method: "POST",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[ComfyClient] Failed to reset ComfyUI queue/interrupt:", msg);
  }

  const res = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ComfyUI prompt submission failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (!data.prompt_id) {
    const details = data.error?.message || data.error || data.node_errors || JSON.stringify(data);
    throw new Error(`ComfyUI rejected the workflow: ${typeof details === "string" ? details : JSON.stringify(details)}`);
  }
  return data.prompt_id as string;
}

/** Returns ComfyUI's recorded execution error for a prompt, when available. */
export async function getComfyJobError(promptId: string): Promise<string | null> {
  try {
    const res = await fetch(`${getComfyUIUrl()}/history/${promptId}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const history = await res.json();
    const entry = history[promptId];
    if (!entry) return null;

    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error("[ComfyClient Raw History Status]:", JSON.stringify(entry.status, null, 2));
    }
    const status = entry.status;
    if (!status || (status.status_str !== "error" && status.status_str !== "interrupted")) return null;

    const messages: unknown[] = Array.isArray(status.messages) ? status.messages : [];
    const errorMessage = messages
      .filter((message: unknown): message is unknown[] => Array.isArray(message))
      .map((message) => message[1])
      .find((details): details is Record<string, unknown> => (
        isRecord(details) && ("exception_message" in details || "error" in details || "message" in details)
      ));
    const details = errorMessage?.exception_message || errorMessage?.error || errorMessage?.message;
    const nodeId = errorMessage?.node_id;
    const node = typeof nodeId === "string" || typeof nodeId === "number" ? ` (node ${nodeId})` : "";
    return details
      ? `ComfyUI execution ${status.status_str}${node}: ${typeof details === "string" ? details : JSON.stringify(details)}`
      : `ComfyUI execution ${status.status_str}. Check the ComfyUI console for details.`;
  } catch {
    return null;
  }
}

async function getComfyOutputDirs(): Promise<string[]> {
  const dirs = [
    path.resolve(process.env.LOCALAPPDATA || 'C:/Users/danie/AppData/Local', 'Comfy-Desktop/ComfyUI-Installs/ComfyUI/ComfyUI/output'),
    path.resolve(process.env.LOCALAPPDATA || 'C:/Users/danie/AppData/Local', 'Comfy-Desktop/ComfyUI-Shared/output'),
    path.join(process.cwd(), 'vendor/ComfyUI/output'),
    path.join(process.cwd(), 'public/assets/completed')
  ];
  const existingDirs: string[] = [];
  for (const d of dirs) {
    try {
      await fs.promises.access(d, fs.constants.F_OK);
      existingDirs.push(d);
    } catch {
      // not exists
    }
  }
  return existingDirs;
}

interface ComfyOutputMedia {
  filename: string;
  subfolder?: string;
  type?: string;
}

interface ComfyNodeOutput {
  videos?: ComfyOutputMedia[];
  gifs?: ComfyOutputMedia[];
  images?: ComfyOutputMedia[];
}

export async function getOutputFilename(promptId: string, submitTime?: number, prefix?: string): Promise<string | null> {
  try {
    const res = await fetch(`${getComfyUIUrl()}/history/${promptId}`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const history = await res.json();
      const entry = history[promptId];
      if (entry && entry.outputs && Object.keys(entry.outputs).length > 0) {
        const outputs = entry.outputs as Record<string, ComfyNodeOutput>;
        const nodeEntries = Object.entries(outputs).reverse();
        const outputDirs = await getComfyOutputDirs();

        for (const [, nodeOutput] of nodeEntries) {
          if (nodeOutput?.videos && nodeOutput.videos.length > 0) {
            const v = nodeOutput.videos.find((item) => item.type !== "input") || nodeOutput.videos[0];
            const candidateFn = v.subfolder ? `${v.subfolder}/${v.filename}` : v.filename;
            
            // Check if a synchronized -audio.mp4 version exists
            const audioFn = candidateFn.replace(/\.mp4$/, "-audio.mp4");
            for (const d of outputDirs) {
              const audioPath = path.join(d, audioFn);
              try {
                const stat = await fs.promises.stat(audioPath);
                if (stat.size > 4096) return audioFn;
              } catch {}

              const regularPath = path.join(d, candidateFn);
              try {
                const stat = await fs.promises.stat(regularPath);
                if (stat.size > 4096) return candidateFn;
              } catch {}
            }
            return candidateFn;
          }
          if (nodeOutput?.gifs && nodeOutput.gifs.length > 0) {
            const g = nodeOutput.gifs.find((item) => item.type !== "input") || nodeOutput.gifs[0];
            const candidateFn = g.subfolder ? `${g.subfolder}/${g.filename}` : g.filename;

            // Check if a synchronized -audio.mp4 version exists for gifs/video-combine
            const audioFn = candidateFn.replace(/\.mp4$/, "-audio.mp4");
            for (const d of outputDirs) {
              const audioPath = path.join(d, audioFn);
              try {
                const stat = await fs.promises.stat(audioPath);
                if (stat.size > 4096) return audioFn;
              } catch {}

              const regularPath = path.join(d, candidateFn);
              try {
                const stat = await fs.promises.stat(regularPath);
                if (stat.size > 4096) return candidateFn;
              } catch {}
            }
            return candidateFn;
          }
          if (nodeOutput?.images && nodeOutput.images.length > 0) {
            const img = nodeOutput.images.find((item) => item.type !== "input") || nodeOutput.images[0];
            if (img && img.type !== "input") {
              const candidateFn = img.subfolder ? `${img.subfolder}/${img.filename}` : img.filename;
              return candidateFn;
            }
          }
        }
      }
    }

    // Direct filesystem scan for files matching the specific prompt prefix created after submitTime
    // CRITICAL: NEVER resolve if the prompt is still pending/running in ComfyUI queue or if the file is a partial stub <= 4KB!
    if (prefix && submitTime) {
      try {
        const queueRes = await fetch(`${getComfyUIUrl()}/queue`, { signal: AbortSignal.timeout(3000) });
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          const running = (queueData.queue_running || []).some((item: unknown[]) => item[1] === promptId);
          const pending = (queueData.queue_pending || []).some((item: unknown[]) => item[1] === promptId);
          if (running || pending) {
            // Still rendering or queued in ComfyUI
            return null;
          }
        }
      } catch {}

      const outputDirs = await getComfyOutputDirs();
      for (const outputDir of outputDirs) {
        let files: string[] = [];
        try {
          files = await fs.promises.readdir(outputDir);
        } catch {
          continue; // Directory doesn't exist or is unreadable
        }

        const filteredFiles = files.filter(f => f.startsWith(prefix) && (f.endsWith(".mp4") || f.endsWith(".gif") || f.endsWith(".png")));
        const statsPromises = filteredFiles.map(async f => {
          const fullPath = path.join(outputDir, f);
          try {
            const s = await fs.promises.stat(fullPath);
            return { name: f, time: s.mtimeMs, size: s.size };
          } catch {
            return null;
          }
        });

        const resolvedStats = await Promise.all(statsPromises);
        const rawFiles = resolvedStats
          .filter((item): item is { name: string; time: number; size: number } => item !== null && item.size > 4096)
          .sort((a, b) => b.time - a.time);

        if (rawFiles.length > 0 && rawFiles[0].time >= submitTime - 2000) {
          // If an audio version exists with same prefix, prefer it
          const audioCandidate = rawFiles.find(f => f.name.endsWith("-audio.mp4"));
          if (audioCandidate) {
            return audioCandidate.name;
          }
          return rawFiles[0].name;
        }
      }
    }
  } catch {
    // not ready yet
  }
  return null;
}

/**
 * Fast, self-healing ComfyUI completion detector.
 * Uses concurrent WebSocket, HTTP history polling (1s), and local disk monitoring.
 */
export async function waitForCompletion(
  promptId: string,
  clientIdOrProgress?: string | ((pct: number) => void),
  timeoutMs = 7_200_000,
  onProgress?: (pct: number) => void,
  workflow?: Record<string, unknown>
): Promise<string> {
  const actualClientId = typeof clientIdOrProgress === 'string' ? clientIdOrProgress : CLIENT_ID;
  const progressCb = typeof clientIdOrProgress === 'function' ? clientIdOrProgress : onProgress;
  const deadline = Date.now() + timeoutMs;
  const submitTime = Date.now();

  let prefix: string | undefined;
  if (workflow) {
    for (const node of Object.values(workflow)) {
      if (isRecord(node) && isRecord(node.inputs) && typeof node.inputs.filename_prefix === "string") {
        prefix = node.inputs.filename_prefix;
        break;
      }
    }
  }

  return new Promise<string>((resolve, reject) => {
    let isResolved = false;
    let pollInterval: NodeJS.Timeout | null = null;
    let ws: import("ws").WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectDelay = 500;
    const MAX_RECONNECT_DELAY = 5000;

    const cleanup = () => {
      isResolved = true;
      if (pollInterval) clearInterval(pollInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try {
          ws.removeAllListeners?.();
          ws.close();
        } catch {}
        ws = null;
      }
    };

    const done = (filename: string) => {
      if (!isResolved) {
        cleanup();
        resolve(filename);
      }
    };

    const fail = (err: Error) => {
      if (!isResolved) {
        cleanup();
        reject(err);
      }
    };

    // 1. Fast HTTP History & Filesystem Polling (Every 1000ms)
    pollInterval = setInterval(async () => {
      if (isResolved) return;
      if (Date.now() > deadline) {
        fail(new Error(`ComfyUI job ${promptId} timed out after ${timeoutMs / 1000}s`));
        return;
      }

      try {
        const jobError = await getComfyJobError(promptId);
        if (jobError) {
          fail(new Error(`[ComfyUI execution error] ${jobError}`));
          return;
        }

        const filename = await getOutputFilename(promptId, submitTime, prefix);
        if (filename) {
          done(filename);
        }
      } catch {}
    }, 1000);

    // 2. Resilient WebSocket Listener with Exponential Backoff Auto-Reconnect
    const connectWs = async () => {
      if (isResolved) return;
      try {
        const WebSocketClass = (await import("ws")).default;
        const socket = new WebSocketClass(`${getWsUrl()}/ws?clientId=${actualClientId}`);
        ws = socket;

        socket.on("open", () => {
          reconnectDelay = 500; // Reset backoff upon successful connection
        });

        socket.on("message", async (raw: Buffer) => {
          if (isResolved) return;
          try {
            const msg = JSON.parse(raw.toString());
            if (
              (msg.type === "execution_error" || msg.type === "execution_interrupted") &&
              (!msg.data?.prompt_id || msg.data?.prompt_id === promptId)
            ) {
              const details = msg.data?.exception_message || msg.data?.error || msg.data?.message || "Execution error.";
              fail(new Error(`[ComfyUI execution error] ${typeof details === "string" ? details : JSON.stringify(details)}`));
              return;
            }

            if (msg.type === "progress" && msg.data) {
              const val = msg.data.value || 0;
              const max = msg.data.max || 1;
              if (progressCb) progressCb(val / max);
            }

            if (
              (msg.type === "executing" && msg.data?.node === null && msg.data?.prompt_id === promptId) ||
              (msg.type === "executed" && msg.data?.prompt_id === promptId)
            ) {
              // Node completed execution — immediately fetch output
              setTimeout(async () => {
                const fn = await getOutputFilename(promptId);
                if (fn) done(fn);
              }, 500);
            }
          } catch {}
        });

        const scheduleReconnect = () => {
          if (isResolved) return;
          try {
            socket.removeAllListeners?.();
            socket.close();
          } catch {}
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            if (!isResolved) {
              reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
              connectWs();
            }
          }, reconnectDelay);
        };

        socket.on("close", scheduleReconnect);
        socket.on("error", scheduleReconnect);
      } catch {
        // If initial import or instantiation fails, retry with backoff
        if (!isResolved) {
          reconnectTimeout = setTimeout(() => {
            if (!isResolved) {
              reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
              connectWs();
            }
          }, reconnectDelay);
        }
      }
    };

    connectWs();
  });
}

export async function downloadOutput(filename: string, subfolder?: string, type?: string): Promise<Buffer> {
  let baseFilename = filename;
  let sub = subfolder || "";
  if (filename.includes("/")) {
    const parts = filename.split("/");
    sub = parts.slice(0, -1).join("/");
    baseFilename = parts[parts.length - 1];
  }

  // Prioritize -audio.mp4 if available
  if (baseFilename.endsWith(".mp4") && !baseFilename.endsWith("-audio.mp4")) {
    const audioCand = baseFilename.replace(/\.mp4$/, "-audio.mp4");
    const outputDirs = await getComfyOutputDirs();
    for (const dir of outputDirs) {
      const audioPath = path.join(dir, sub, audioCand);
      try {
        const stat = await fs.promises.stat(audioPath);
        if (stat.size > 4096) {
          baseFilename = audioCand;
          break;
        }
      } catch {}
    }
  }

  // 1. Direct filesystem read from all ComfyUI output directories
  const outputDirs = await getComfyOutputDirs();
  for (const dir of outputDirs) {
    const localPath = path.join(dir, sub, baseFilename);
    try {
      let stat = await fs.promises.stat(localPath);
      // If file is tiny (<= 1024 bytes), wait briefly for ffmpeg to finish flush
      let size = stat.size;
      let retries = 6;
      while (size <= 1024 && retries > 0) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          stat = await fs.promises.stat(localPath);
          size = stat.size;
        } catch {}
        retries--;
      }
      return await fs.promises.readFile(localPath);
    } catch {}
  }

  // 2. Fetch from ComfyUI /view endpoint
  let url = `${getComfyUIUrl()}/view?filename=${encodeURIComponent(baseFilename)}&type=${type || 'output'}`;
  if (sub) {
    url += `&subfolder=${encodeURIComponent(sub)}`;
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    throw new Error(`Failed to download ComfyUI output from ${url}: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function clearComfyUIVRAM(): Promise<void> {
  comfyLog("[ComfyClient] Requesting ComfyUI VRAM release via native API...");
  try {
    const freeRes = await fetch(`${getComfyUIUrl()}/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (freeRes.ok) {
      comfyLog("[ComfyClient] Native VRAM release complete (models unloaded & memory freed).");
    } else {
      comfyLog(`[ComfyClient] Native VRAM release finished (status: ${freeRes.status}).`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[ComfyClient] Failed to clear VRAM via native API:", msg);
  }
}

export async function checkSupportedNodes(nodeClasses: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  await Promise.all(
    nodeClasses.map(async (cls) => {
      try {
        const res = await fetch(`${getComfyUIUrl()}/object_info/${cls}`, {
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) {
          result[cls] = false;
        } else {
          const data = await res.json();
          result[cls] = !!(data && data[cls]);
        }
      } catch {
        result[cls] = false;
      }
    })
  );
  return result;
}

export async function getAvailableCheckpoints(): Promise<Set<string>> {
  try {
    const res = await fetch(`${getComfyUIUrl()}/object_info/CheckpointLoaderSimple`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return new Set();
    const data = await res.json();
    const ckptList = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
    if (Array.isArray(ckptList)) {
      return new Set(ckptList.map((c: string) => c.toLowerCase()));
    }
  } catch {
    // ignore
  }
  return new Set();
}
