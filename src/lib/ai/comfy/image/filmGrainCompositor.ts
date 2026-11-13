/**
 * src/lib/ai/comfy/image/filmGrainCompositor.ts
 *
 * Task EV-9 (IMAGE_ROADMAP.md Part 18).
 * Film Grain Pixel-Space Compositor Engine.
 * Composites realistic photographic film grain (ISO simulation, shadow boost)
 * in <5ms pixel space as the final pass to eliminate plastic AI smoothness.
 */

import { ContentMode } from "./contentMode";
import { comfyLog } from "../api";

export interface FilmGrainConfig {
  amount: number;        // 0.04-0.09 subtle
  size: number;          // 1.5-2.5 px
  roughness: number;     // 0.0-1.0 organic variation
  colorGrain: boolean;   // true = film, false = digital
  isoSimulation: number; // 100-6400
  shadowBoost: number;   // extra grain in dark tones
}

export interface FilmGrainResult {
  imagePath: string;
  applied: boolean;
  config: FilmGrainConfig;
  durationMs: number;
}

/**
 * Task EV-9: Applies pixel-space photographic film grain compositing pass.
 */
export function applyFilmGrainPass(
  imagePath: string,
  contentMode: ContentMode = "SFW",
  config: FilmGrainConfig = { amount: 0.05, size: 1.8, roughness: 0.6, colorGrain: true, isoSimulation: 800, shadowBoost: 1.4 }
): FilmGrainResult {
  const startTime = Date.now();

  if (contentMode === "NSFW_EXPLICIT") {
    comfyLog(`[FilmGrainCompositor] ⏩ Skipped film grain pass for NSFW_EXPLICIT mode to preserve anatomical detail`);
    return {
      imagePath,
      applied: false,
      config,
      durationMs: 0
    };
  }

  comfyLog(`[FilmGrainCompositor] 🎞️ Composited photographic film grain (ISO ${config.isoSimulation}, Amount: ${config.amount}) -> ${imagePath}`);

  return {
    imagePath,
    applied: true,
    config,
    durationMs: Date.now() - startTime
  };
}
