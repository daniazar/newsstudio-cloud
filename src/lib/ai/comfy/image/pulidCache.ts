/**
 * src/lib/ai/comfy/image/pulidCache.ts
 *
 * Task PR-5 (IMAGE_ROADMAP.md Part 13).
 * PuLID Embedding Caching Engine.
 * Extracts InsightFace 512-dim face identity vectors once, serializes to disk,
 * and reloads on subsequent runs to save 2-4s and prevent detection failures.
 */

import fs from "fs";
import path from "path";
import { comfyLog } from "../api";

export interface PuLIDEmbeddingCacheRecord {
  personaId: string;
  sourceImageMtimeMs: number;
  embeddingVector: number[];
  extractedAt: string;
}

/**
 * Task PR-5: Resolves cached PuLID identity embedding or marks for extraction if expired.
 */
export function getOrExtractPuLIDEmbedding(
  personaId: string,
  faceRefPath: string,
  cacheDir: string = path.join(process.cwd(), "public", "avatars", "cache")
): { isCached: boolean; cachePath: string; embeddingRecord?: PuLIDEmbeddingCacheRecord } {
  const cachePath = path.join(cacheDir, `${personaId.toLowerCase()}_pulid_embedding.json`);

  if (!fs.existsSync(faceRefPath)) {
    comfyLog(`⚠️ [PuLIDCache] Face reference image not found at ${faceRefPath}`);
    return { isCached: false, cachePath };
  }

  const stat = fs.statSync(faceRefPath);
  const mtimeMs = stat.mtimeMs;

  if (fs.existsSync(cachePath)) {
    try {
      const raw = fs.readFileSync(cachePath, "utf-8");
      const record: PuLIDEmbeddingCacheRecord = JSON.parse(raw);

      if (record.sourceImageMtimeMs === mtimeMs && record.embeddingVector && record.embeddingVector.length > 0) {
        comfyLog(`⚡ [PuLIDCache] Cache Hit for ${personaId} — InsightFace extraction skipped (~3s saved)`);
        return { isCached: true, cachePath, embeddingRecord: record };
      }
    } catch {
      comfyLog(`⚠️ [PuLIDCache] Cache file corrupt for ${personaId}, re-extracting...`);
    }
  }

  return { isCached: false, cachePath };
}

/**
 * Saves extracted PuLID identity embedding vector to disk cache.
 */
export function savePuLIDEmbeddingCache(
  personaId: string,
  faceRefPath: string,
  embeddingVector: number[],
  cacheDir: string = path.join(process.cwd(), "public", "avatars", "cache")
): string {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${personaId.toLowerCase()}_pulid_embedding.json`);
  const mtimeMs = fs.existsSync(faceRefPath) ? fs.statSync(faceRefPath).mtimeMs : Date.now();

  const record: PuLIDEmbeddingCacheRecord = {
    personaId: personaId.toLowerCase(),
    sourceImageMtimeMs: mtimeMs,
    embeddingVector,
    extractedAt: new Date().toISOString()
  };

  fs.writeFileSync(cachePath, JSON.stringify(record, null, 2), "utf-8");
  comfyLog(`💾 [PuLIDCache] Saved ${embeddingVector.length}-dim PuLID embedding to ${path.basename(cachePath)}`);
  return cachePath;
}
