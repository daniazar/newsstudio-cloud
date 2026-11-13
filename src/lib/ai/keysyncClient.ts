import fs from 'fs';
import path from 'path';
import { pooledFetch } from '@/lib/network/httpPool';
import { createLogger } from "@/lib/logger";

const log = createLogger("ai:keysyncClient");

export interface KeySyncGenerateOptions {
  videoPath: string; // Input video (.mp4)
  audioPath: string; // Input speech audio (.wav)
  outputPath: string; // Desired output path (.mp4)
  fps?: number; // Default 25
  serverUrl?: string; // Default process.env.KEYSYNC_SERVER_URL || 'http://localhost:8008'
}

export interface KeySyncCachedOptions {
  clipKey: string; // Identifier of pre-vectorized clip (e.g. 'm2_raised_hand_gesture_loop')
  persona?: string; // Persona name (default 'ruby')
  audioPath: string; // Input speech audio (.wav)
  outputPath: string; // Desired output path (.mp4)
  fps?: number;
  serverUrl?: string;
}

export interface KeySyncGenerateResult {
  success: boolean;
  outputPath: string;
  durationSeconds?: number;
  cached?: boolean;
  error?: string;
}

/**
 * Checks if KeySync microservice is online and responsive on port 8008.
 */
export async function checkKeySyncHealth(serverUrl?: string): Promise<boolean> {
  const url = serverUrl || process.env.KEYSYNC_SERVER_URL || 'http://localhost:8008';
  try {
    const res = await pooledFetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Standalone HTTP Client for KeySync Real-Time Lip-Sync Microservice
 * Connects to a decoupled Python microservice or Docker container (Port 8008).
 */
export async function generateKeySyncLipSync(
  options: KeySyncGenerateOptions
): Promise<KeySyncGenerateResult> {
  const { videoPath, audioPath, outputPath, fps = 25 } = options;
  const serverUrl = options.serverUrl || process.env.KEYSYNC_SERVER_URL || 'http://localhost:8008';

  log.info(`🎤 [KeySync Client] Initiating lip-sync generation...`);
  log.info(`   Video: ${videoPath}`);
  log.info(`   Audio: ${audioPath}`);
  log.info(`   Server: ${serverUrl}`);

  if (!fs.existsSync(videoPath)) {
    throw new Error(`[KeySync Client] Input video not found: ${videoPath}`);
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`[KeySync Client] Input audio not found: ${audioPath}`);
  }

  try {
    const videoBuffer = await fs.promises.readFile(videoPath);
    const audioBuffer = await fs.promises.readFile(audioPath);

    const formData = new FormData();
    formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), path.basename(videoPath));
    formData.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }), path.basename(audioPath));
    formData.append('fps', String(fps));

    const response = await pooledFetch(`${serverUrl}/generate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned HTTP ${response.status}: ${errText}`);
    }

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      await fs.promises.mkdir(outDir, { recursive: true });
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));

    const isCached = response.headers.get('x-keysync-cached') === 'true';
    log.info(`✅ [KeySync Client] Generation complete (cached=${isCached}): ${outputPath}`);
    return {
      success: true,
      outputPath,
      cached: isCached,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [KeySync Client] Failed: ${msg}`);
    return {
      success: false,
      outputPath: '',
      error: msg,
    };
  }
}

/**
 * Ultra-Fast Cached Inference using Pre-Vectorized Action Loops.
 * Bypasses video decoding, landmark extraction, and VAE encoding.
 */
export async function generateKeySyncCachedLipSync(
  options: KeySyncCachedOptions
): Promise<KeySyncGenerateResult> {
  const { clipKey, persona = 'ruby', audioPath, outputPath, fps = 25 } = options;
  const serverUrl = options.serverUrl || process.env.KEYSYNC_SERVER_URL || 'http://localhost:8008';

  log.info(`⚡ [KeySync Client] Initiating ultra-fast cached lip-sync...`);
  log.info(`   Clip: ${clipKey} (Persona: ${persona})`);
  log.info(`   Audio: ${audioPath}`);
  log.info(`   Server: ${serverUrl}`);

  if (!fs.existsSync(audioPath)) {
    throw new Error(`[KeySync Client] Input audio not found: ${audioPath}`);
  }

  try {
    const audioBuffer = await fs.promises.readFile(audioPath);

    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }), path.basename(audioPath));
    formData.append('clip_key', clipKey);
    formData.append('persona', persona);
    formData.append('fps', String(fps));

    const response = await pooledFetch(`${serverUrl}/generate_cached`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned HTTP ${response.status}: ${errText}`);
    }

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      await fs.promises.mkdir(outDir, { recursive: true });
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));

    log.info(`✅ [KeySync Client] Cached generation complete: ${outputPath}`);
    return {
      success: true,
      outputPath,
      cached: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [KeySync Client] Cached generation failed: ${msg}`);
    return {
      success: false,
      outputPath: '',
      error: msg,
    };
  }
}

/**
 * Triggers offline precomputation for a video loop.
 */
export async function precomputeKeySyncClip(
  videoPath: string,
  persona: string = 'ruby',
  serverUrl?: string
): Promise<{ success: boolean; meta?: unknown; error?: string }> {
  const url = serverUrl || process.env.KEYSYNC_SERVER_URL || 'http://localhost:8008';
  try {
    const res = await pooledFetch(`${url}/precompute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_path: videoPath, persona }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Dispatches batch KeySync inference tasks with concurrency control.
 */
export async function generateKeySyncBatch(
  tasks: KeySyncGenerateOptions[],
  options: { concurrency?: number; maxRetries?: number } = {}
): Promise<KeySyncGenerateResult[]> {
  const concurrency = options.concurrency ?? 2;
  const results: KeySyncGenerateResult[] = new Array(tasks.length);

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchPromises = batch.map(async (task, idx) => {
      const overallIndex = i + idx;
      let attempt = 0;
      const maxAttempts = (options.maxRetries ?? 1) + 1;
      let res: KeySyncGenerateResult = { success: false, outputPath: '', error: 'Not executed' };

      while (attempt < maxAttempts) {
        attempt++;
        res = await generateKeySyncLipSync(task);
        if (res.success) break;
      }
      results[overallIndex] = res;
    });

    await Promise.all(batchPromises);
  }

  return results;
}
