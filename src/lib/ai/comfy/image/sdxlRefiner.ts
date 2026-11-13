/**
 * src/lib/ai/comfy/image/sdxlRefiner.ts
 *
 * Task AD-7 (IMAGE_ROADMAP.md Part 15).
 * SDXL Refiner Handoff Pass Engine.
 * Passes Stage 5 latent outputs to sd_xl_refiner_1.0 at step ~22 (timesteps 800-1000) via KSamplerAdvanced
 * for ultra-sharp iris textures, skin micro-pores, and fabric weave clarity.
 */

import { comfyLog } from "../api";

export interface RefinerConfig {
  refinerModelName: string;
  startAtStep: number;
  totalSteps: number;
}

import { ComfyWorkflow } from "../types";

/**
 * Task AD-7: Injects SDXL Refiner loader and KSamplerAdvanced handoff pass into ComfyUI workflow graph.
 */
export function injectSDXLRefinerPass(
  workflow: ComfyWorkflow,
  stage5LatentSourceId: string = "8",
  startAtStep: number = 22,
  totalSteps: number = 30,
  refinerModelName: string = "sd_xl_refiner_1.0.safetensors"
): boolean {
  workflow["refiner_checkpoint_loader"] = {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: refinerModelName },
    _meta: { title: "SDXL Official Refiner Checkpoint Loader" }
  };

  workflow["sdxl_refiner_ksampler"] = {
    class_type: "KSamplerAdvanced",
    inputs: {
      model: ["refiner_checkpoint_loader", 0],
      add_noise: "disable",
      noise_seed: 12345,
      steps: totalSteps,
      start_at_step: startAtStep,
      end_at_step: totalSteps,
      latent_image: [stage5LatentSourceId, 0],
      positive: ["6", 0],
      negative: ["7", 0]
    },
    _meta: { title: `SDXL Refiner Handoff Pass (Steps ${startAtStep}-${totalSteps})` }
  };

  comfyLog(`[SDXLRefiner] ✨ Injected SDXL Refiner handoff pass (${refinerModelName}, Steps ${startAtStep}-${totalSteps})`);
  return true;
}
