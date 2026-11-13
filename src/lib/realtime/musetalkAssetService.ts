/**
 * src/lib/realtime/musetalkAssetService.ts
 *
 * High-performance service for loading, caching, and serving precomputed MuseTalk
 * avatar asset packets (latents, geometry, coords) for WebGPU edge browser lip-sync.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getPythonPath } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";

const log = createLogger("realtime:musetalkAssetService");

import type {
  MuseTalkAvatarGeometry,
  MuseTalkAvatarMeta,
} from "../../../vendor/viseme-compositor-core/packages/core/src/types";
export type { MuseTalkAvatarGeometry, MuseTalkAvatarMeta };

const PUBLIC_LATENTS_DIR = path.join(process.cwd(), "public", "assets", "avatars", "latents");
const VENDOR_CACHE_DIR = path.join(process.cwd(), "vendor", "MuseTalk", "results", "v15", "avatars");
const PYTHON_EXE = getPythonPath();
const EXPORT_SCRIPT = path.join(process.cwd(), "scripts", "export_musetalk_latents.py");

export class MuseTalkAssetService {
  /**
   * Returns list of all available avatar IDs in either public latents cache or vendor cache.
   */
  public static async listAvatars(): Promise<string[]> {
    const avatarSet = new Set<string>();

    if (fs.existsSync(PUBLIC_LATENTS_DIR)) {
      const files = await fs.promises.readdir(PUBLIC_LATENTS_DIR);
      for (const f of files) {
        if (f.endsWith(".meta.json")) {
          avatarSet.add(f.replace(".meta.json", ""));
        }
      }
    }

    if (fs.existsSync(VENDOR_CACHE_DIR)) {
      const dirs = await fs.promises.readdir(VENDOR_CACHE_DIR);
      for (const d of dirs) {
        const fullDir = path.join(VENDOR_CACHE_DIR, d);
        const stat = await fs.promises.stat(fullDir);
        if (stat.isDirectory()) {
          avatarSet.add(d);
        }
      }
    }

    return Array.from(avatarSet);
  }

  /**
   * Retrieves avatar metadata. If the packed binary does not yet exist,
   * it triggers on-demand packaging from the vendor cache.
   */
  public static async getAvatarMeta(avatarId: string): Promise<MuseTalkAvatarMeta | null> {
    const metaPath = path.join(PUBLIC_LATENTS_DIR, `${avatarId}.meta.json`);
    const binPath = path.join(PUBLIC_LATENTS_DIR, `${avatarId}.latents.bin`);

    // Check if already packed
    if (fs.existsSync(metaPath) && fs.existsSync(binPath)) {
      try {
        const raw = await fs.promises.readFile(metaPath, "utf-8");
        return JSON.parse(raw) as MuseTalkAvatarMeta;
      } catch (e) {
        console.error(`[MuseTalkAssetService] Failed to read ${metaPath}:`, e);
      }
    }

    // Check if raw preprocessed files exist in vendor cache
    const vendorAvatarDir = path.join(VENDOR_CACHE_DIR, avatarId);
    const vendorLatents = path.join(vendorAvatarDir, "latents.pt");
    const vendorCoords = path.join(vendorAvatarDir, "coords.pkl");

    if (fs.existsSync(vendorLatents) && fs.existsSync(vendorCoords)) {
      log.info(`[MuseTalkAssetService] On-demand packing latent stream for '${avatarId}'...`);
      if (fs.existsSync(PYTHON_EXE) && fs.existsSync(EXPORT_SCRIPT)) {
        const res = spawnSync(PYTHON_EXE, [EXPORT_SCRIPT, "--avatar", avatarId], {
          cwd: process.cwd(),
          env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        });

        if (res.status === 0 && fs.existsSync(metaPath)) {
          const raw = await fs.promises.readFile(metaPath, "utf-8");
          return JSON.parse(raw) as MuseTalkAvatarMeta;
        } else {
          console.error(`[MuseTalkAssetService] Export script failed for '${avatarId}' (exit: ${res.status})`);
        }
      }
    }

    return null;
  }

  /**
   * Returns path to the binary latents file if present.
   */
  public static getLatentsBinPath(avatarId: string): string | null {
    const binPath = path.join(PUBLIC_LATENTS_DIR, `${avatarId}.latents.bin`);
    return fs.existsSync(binPath) ? binPath : null;
  }

  /**
   * Reads a single frame's FP16 latent tensor directly from the binary file.
   * Frame size is exactly 16,384 bytes (8 channels * 32 * 32 * 2 bytes).
   */
  public static async getFrameLatentBytes(avatarId: string, frameIndex: number): Promise<Buffer | null> {
    const meta = await this.getAvatarMeta(avatarId);
    const binPath = this.getLatentsBinPath(avatarId);
    if (!meta || !binPath) return null;

    const safeIndex = Math.max(0, Math.min(frameIndex, meta.frameCount - 1));
    const offset = safeIndex * meta.bytesPerFrame;
    const length = meta.bytesPerFrame;

    const fd = await fs.promises.open(binPath, "r");
    try {
      const buffer = Buffer.alloc(length);
      await fd.read(buffer, 0, length, offset);
      return buffer;
    } finally {
      await fd.close();
    }
  }
}
