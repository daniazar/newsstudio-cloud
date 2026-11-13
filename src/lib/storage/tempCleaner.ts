/**
 * src/lib/storage/tempCleaner.ts
 *
 * Automated Temp Artifact & Orphaned Video/Audio Garbage Collector.
 * Sweeps stale rendering buffers, temporary WAV files, and orphaned ffmpeg probes.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { createLogger } from "@/lib/logger";

const log = createLogger("storage:cleaner");

export interface TempCleanerOptions {
  maxAgeMs?: number; // Default: 24 hours
  dryRun?: boolean;
}

export interface TempCleanerResult {
  scannedCount: number;
  cleanedCount: number;
  freedBytes: number;
  freedMB: number;
  errors: string[];
}

const TEMP_PREFIXES = [
  "hybrid_stream_",
  "render_",
  "tts_",
  "musetalk_",
  "keysync_",
  "liveportrait_",
  "newsstudio_",
  "fsm_stitch_",
  "presenter-",
  "audio-fsm-",
  "video-fsm-",
  "beat_chunker_",
];

/**
 * Sweeps orphaned temp files and directories created during rendering and AI generation.
 */
export function cleanOrphanedTempFiles(options: TempCleanerOptions = {}): TempCleanerResult {
  const maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1000; // 24 Hours
  const dryRun = options.dryRun ?? false;
  const now = Date.now();
  const tmpDir = os.tmpdir();

  const result: TempCleanerResult = {
    scannedCount: 0,
    cleanedCount: 0,
    freedBytes: 0,
    freedMB: 0,
    errors: [],
  };

  try {
    const entries = fs.readdirSync(tmpDir);

    for (const entry of entries) {
      const isCandidate = TEMP_PREFIXES.some((prefix) => entry.startsWith(prefix));
      if (!isCandidate) continue;

      result.scannedCount++;
      const fullPath = path.join(tmpDir, entry);

      try {
        const stat = fs.statSync(fullPath);
        const age = now - stat.mtimeMs;

        if (age > maxAgeMs) {
          let size = 0;
          if (stat.isDirectory()) {
            size = calculateDirSize(fullPath);
            if (!dryRun) {
              fs.rmSync(fullPath, { recursive: true, force: true });
            }
          } else {
            size = stat.size;
            if (!dryRun) {
              fs.unlinkSync(fullPath);
            }
          }

          result.cleanedCount++;
          result.freedBytes += size;
        }
      } catch (entryErr) {
        const msg = entryErr instanceof Error ? entryErr.message : String(entryErr);
        result.errors.push(`Failed to inspect/delete ${entry}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to read temp directory: ${msg}`);
  }

  result.freedMB = Math.round((result.freedBytes / 1024 / 1024) * 100) / 100;
  if (result.cleanedCount > 0) {
    log.info(`Swept ${result.cleanedCount} stale artifacts (${result.freedMB} MB freed).`);
  }
  return result;
}

function calculateDirSize(dirPath: string): number {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const p = path.join(dirPath, file);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        size += calculateDirSize(p);
      } else {
        size += stat.size;
      }
    }
  } catch {
    // Best effort size calculation
  }
  return size;
}
