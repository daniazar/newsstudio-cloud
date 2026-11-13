/**
 * src/lib/ai/comfy/image/hiresFix.ts
 *
 * Task PR-6 (IMAGE_ROADMAP.md Part 13).
 * Two-Resolution Hi-Res Fix Strategy.
 * Generates initial structural stages (1-3) at 512x512 for 4x faster composition,
 * upscales via 4x-UltraSharp ESRGAN, and runs detail passes (3.5-6) at 1024x1024.
 */

import { comfyLog } from "../api";

export interface StageDimensionResult {
  width: number;
  height: number;
  isLowResPhase: boolean;
  upscaleRequiredAfterStage: boolean;
}

/**
 * Task PR-6: Resolves resolution dimensions for a given stage index when Hi-Res Fix is enabled.
 */
export function getHiResFixStageDimensions(
  stageIndex: number,
  targetWidth: number = 1024,
  targetHeight: number = 1024,
  enableHiresFix: boolean = true
): StageDimensionResult {
  if (!enableHiresFix) {
    return {
      width: targetWidth,
      height: targetHeight,
      isLowResPhase: false,
      upscaleRequiredAfterStage: false
    };
  }

  // Stages 1, 2, 3 run at half resolution (512x512) for 4x faster UNet composition
  if (stageIndex <= 3) {
    const lowWidth = Math.max(512, Math.round(targetWidth / 2));
    const lowHeight = Math.max(512, Math.round(targetHeight / 2));
    return {
      width: lowWidth,
      height: lowHeight,
      isLowResPhase: true,
      upscaleRequiredAfterStage: stageIndex === 3
    };
  }

  // Stages 3.2, 3.5, 4, 5, 6 run at full target resolution (1024x1024)
  return {
    width: targetWidth,
    height: targetHeight,
    isLowResPhase: false,
    upscaleRequiredAfterStage: false
  };
}

import { ComfyWorkflow } from "../types";

/**
 * Injects 4x-UltraSharp ESRGAN Upscale node into workflow graph between Stage 3 and Stage 4.
 */
export function injectESRGANUpscaleNode(
  workflow: ComfyWorkflow,
  imageSourceId: string = "8",
  modelName: string = "4x-UltraSharp.pth"
): boolean {
  if (!workflow[imageSourceId]) return false;

  workflow["esrgan_upscale_model_loader"] = {
    class_type: "UpscaleModelLoader",
    inputs: { model_name: modelName },
    _meta: { title: "4x-UltraSharp ESRGAN Model Loader" }
  };

  workflow["esrgan_image_upscale"] = {
    class_type: "ImageUpscaleWithModel",
    inputs: {
      upscale_model: ["esrgan_upscale_model_loader", 0],
      image: [imageSourceId, 0]
    },
    _meta: { title: "4x-UltraSharp Tile-Based Upscale (512 -> 1024)" }
  };

  comfyLog(`[HiResFix] 🔍 Injected 4x-UltraSharp ESRGAN upscale node wired to Node "${imageSourceId}"`);
  return true;
}
