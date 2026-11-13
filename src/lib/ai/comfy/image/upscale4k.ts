/**
 * src/lib/ai/comfy/image/upscale4k.ts
 *
 * Task PR-14 (IMAGE_ROADMAP.md Part 13).
 * Ultimate 4K Upscale Post-Pipeline Refinement Stage.
 * Performs tile-based 4096x4096 upscale with low-denoise (0.25) micro-texture refinement
 * when triggered by the --quality 4k flag.
 */

import { comfyLog } from "../api";

export interface Ultimate4KConfig {
  targetResolution: number; // 4096
  tileSize: number; // 512
  denoise: number; // 0.25
  texturePrompt: string;
}

import { ComfyWorkflow } from "../types";

/**
 * Task PR-14: Injects Ultimate SD Upscale nodes into ComfyUI workflow graph for 4K broadcast refinement.
 */
export function injectUltimate4KUpscaleStage(
  workflow: ComfyWorkflow,
  stage6ImageSourceId: string = "8",
  denoise: number = 0.25
): boolean {
  if (!workflow[stage6ImageSourceId]) return false;

  workflow["ultimate_upscale_model_loader"] = {
    class_type: "UpscaleModelLoader",
    inputs: { model_name: "4x-UltraSharp.pth" },
    _meta: { title: "4x-UltraSharp 4K Upscale Model Loader" }
  };

  workflow["ultimate_sd_upscale"] = {
    class_type: "UltimateSDUpscale",
    inputs: {
      image: [stage6ImageSourceId, 0],
      upscale_model: ["ultimate_upscale_model_loader", 0],
      tile_width: 512,
      tile_height: 512,
      denoise,
      mode_type: "Linear",
      upscale_by: 4
    },
    _meta: { title: "Ultimate SD Upscale to 4K (4096x4096 Tile Refinement)" }
  };

  comfyLog(`[Upscale4K] 🖼️ Injected Ultimate SD Upscale 4K refinement pass (4096x4096, Denoise: ${denoise})`);
  return true;
}
