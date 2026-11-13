/**
 * src/lib/ai/comfy/image/depthExtractor.ts
 *
 * Depth map extraction and cross-stage caching utilities for Multi-Pass Progressive Composition Pipeline
 * (Part 10 — IMAGE_ROADMAP.md).
 * Extracts 3D spatial depth maps from Stage 1 & 2 environment plates to lock background perspective
 * during Stage 3 (Persona Insertion) and Stage 4 (Relighting).
 */

import fs from "fs";
import path from "path";

export interface DepthMapResult {
  depthMapPath: string;
  cached: boolean;
}

/**
 * Derives and manages deterministic depth map filepaths for cross-stage ControlNet Depth locking.
 */
export function getStageDepthMapPath(personaKey: string, masterSeed: number, cacheDir: string): string {
  const filename = `${personaKey.toLowerCase()}_depth_map_seed_${masterSeed}.png`;
  return path.join(cacheDir, filename);
}

/**
 * Registers or copies an extracted environment depth map into the stage cache directory.
 */
export function cacheDepthMap(sourceImagePath: string, personaKey: string, masterSeed: number, cacheDir: string): DepthMapResult {
  const targetPath = getStageDepthMapPath(personaKey, masterSeed, cacheDir);

  if (fs.existsSync(targetPath)) {
    return { depthMapPath: targetPath, cached: true };
  }

  if (fs.existsSync(sourceImagePath)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.copyFileSync(sourceImagePath, targetPath);
    return { depthMapPath: targetPath, cached: false };
  }

  return { depthMapPath: sourceImagePath, cached: false };
}
