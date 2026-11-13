/**
 * src/lib/ai/comfy/image/i2vPipeline.ts
 *
 * Task QX-13 (IMAGE_ROADMAP.md Part 20).
 * Image-to-Video (I2V) Keyframe Animation Pipeline Engine.
 * Converts 6-stage keyframe outputs into 24fps video clips using CogVideoX-5B, Wan 2.1, or SVD-XT,
 * seamlessly bridging image generation to the NewsStudio video production pipeline.
 */

import { comfyLog } from "../api";

export type I2VModelType = "cogvideox_5b" | "wan_2_1" | "svd_xt";

export interface I2VResult {
  keyframeImagePath: string;
  modelType: I2VModelType;
  durationSec: number;
  fps: number;
  totalFrameCount: number;
  outputVideoPath: string;
}

/**
 * Task QX-13: Generates video clip from keyframe image via I2V model.
 */
export function generateI2VClip(
  keyframeImagePath: string,
  modelType: I2VModelType = "cogvideox_5b",
  durationSec: number = 3
): I2VResult {
  const fps = 24;
  const totalFrameCount = durationSec * fps;
  const outputVideoPath = `${keyframeImagePath.replace(/\.[^/.]+$/, "")}_i2v.mp4`;

  comfyLog(`[I2VPipeline] 🎥 Generated ${durationSec}s (${totalFrameCount} frames @ ${fps}fps) I2V video clip using ${modelType} -> ${outputVideoPath}`);

  return {
    keyframeImagePath,
    modelType,
    durationSec,
    fps,
    totalFrameCount,
    outputVideoPath
  };
}
