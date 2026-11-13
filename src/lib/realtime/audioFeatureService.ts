/**
 * src/lib/realtime/audioFeatureService.ts
 *
 * High-performance service for loading, caching, and serving precomputed MuseTalk
 * Whisper audio features (50x384 per frame) for WebGPU edge browser lip-sync.
 */

import { getPythonPath } from "@/lib/binaries";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { createLogger } from "@/lib/logger";

const log = createLogger("realtime:audioFeatureService");

import type { AudioFeatureMeta } from "../../../vendor/viseme-compositor-core/packages/core/src/types";
export type { AudioFeatureMeta };

const PUBLIC_AUDIO_FEAT_DIR = path.join(process.cwd(), "public", "assets", "audio_features");
const PYTHON_EXE = getPythonPath();
const EXTRACT_SCRIPT = path.join(process.cwd(), "scripts", "extract_musetalk_audio_features.py");

export class AudioFeatureService {
  /**
   * Returns list of all available audio feature IDs in public assets cache.
   */
  public static async listFeatures(): Promise<string[]> {
    const idSet = new Set<string>();

    if (fs.existsSync(PUBLIC_AUDIO_FEAT_DIR)) {
      const files = await fs.promises.readdir(PUBLIC_AUDIO_FEAT_DIR);
      for (const f of files) {
        if (f.endsWith(".audio_features.json")) {
          idSet.add(f.replace(".audio_features.json", ""));
        }
      }
    }

    return Array.from(idSet);
  }

  /**
   * Retrieves audio feature metadata by ID.
   */
  public static async getFeatureMeta(featureId: string): Promise<AudioFeatureMeta | null> {
    const safeId = path.basename(featureId).replace(/\.audio_features(\.json)?$/, "");
    const metaPath = path.join(PUBLIC_AUDIO_FEAT_DIR, `${safeId}.audio_features.json`);
    const binPath = path.join(PUBLIC_AUDIO_FEAT_DIR, `${safeId}.audio_features.bin`);

    if (fs.existsSync(metaPath) && fs.existsSync(binPath)) {
      try {
        const raw = await fs.promises.readFile(metaPath, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          id: safeId,
          ...parsed,
        } as AudioFeatureMeta;
      } catch (e) {
        console.error(`[AudioFeatureService] Failed to read ${metaPath}:`, e);
      }
    }

    return null;
  }

  /**
   * Returns the absolute path to the binary feature file.
   */
  public static getFeatureBinaryPath(featureId: string): string | null {
    const safeId = path.basename(featureId).replace(/\.audio_features(\.bin)?$/, "");
    const binPath = path.join(PUBLIC_AUDIO_FEAT_DIR, `${safeId}.audio_features.bin`);
    return fs.existsSync(binPath) ? binPath : null;
  }

  /**
   * Extracts or retrieves audio features for any given audio file on disk.
   */
  public static async extractFeatures(
    audioFilePath: string,
    fps: number = 25,
    customId?: string
  ): Promise<AudioFeatureMeta> {
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at: ${audioFilePath}`);
    }

    const featureId = customId || path.basename(audioFilePath, path.extname(audioFilePath));
    const metaPath = path.join(PUBLIC_AUDIO_FEAT_DIR, `${featureId}.audio_features.json`);
    const binPath = path.join(PUBLIC_AUDIO_FEAT_DIR, `${featureId}.audio_features.bin`);

    // Check if already extracted and up to date
    if (fs.existsSync(metaPath) && fs.existsSync(binPath)) {
      const existing = await this.getFeatureMeta(featureId);
      if (existing) return existing;
    }

    // Ensure output directory exists
    await fs.promises.mkdir(PUBLIC_AUDIO_FEAT_DIR, { recursive: true });

    log.info(`[AudioFeatureService] Extracting Whisper features for '${featureId}' (${audioFilePath})...`);
    if (!fs.existsSync(PYTHON_EXE)) {
      throw new Error(`Python interpreter not found at ${PYTHON_EXE}`);
    }
    if (!fs.existsSync(EXTRACT_SCRIPT)) {
      throw new Error(`Extraction script not found at ${EXTRACT_SCRIPT}`);
    }

    const res = spawnSync(
      PYTHON_EXE,
      [
        EXTRACT_SCRIPT,
        "--audio", audioFilePath,
        "--out-bin", binPath,
        "--out-json", metaPath,
        "--fps", String(fps),
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        encoding: "utf-8",
      }
    );

    if (res.status !== 0) {
      console.error("[AudioFeatureService] Extraction failed:", res.stderr || res.stdout);
      throw new Error(`Audio feature extraction failed with code ${res.status}: ${res.stderr || res.stdout}`);
    }

    const meta = await this.getFeatureMeta(featureId);
    if (!meta) {
      throw new Error(`Failed to load extracted metadata for '${featureId}'`);
    }

    log.info(`✅ [AudioFeatureService] Successfully extracted ${meta.numFrames} frames (${meta.durationSec}s) for '${featureId}'`);
    return meta;
  }
}
