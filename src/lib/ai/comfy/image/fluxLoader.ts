/**
 * src/lib/ai/comfy/image/fluxLoader.ts
 *
 * Task XA-2 (IMAGE_ROADMAP.md Part 16).
 * FLUX fp8 UNet Loader Split Engine.
 * Configures FLUX.2 Dev fp8 Stage 1 environment generation graph via UNETLoader (weight_dtype: fp8_e4m3fn)
 * split from DualCLIPLoader (clip_l + t5xxl) and FLUX 16-channel VAELoader.
 */

import { comfyLog } from "../api";

export interface FLUXLoaderConfig {
  unetModelName: string;
  weightDtype: string;
  vaeName: string;
}

import { ComfyWorkflow } from "../types";

/**
 * Task XA-2: Injects FLUX.2 fp8 UNet, DualCLIP, and 16-channel VAE loaders into ComfyUI workflow graph.
 */
export function injectFLUXStage1Nodes(
  workflow: ComfyWorkflow,
  unetModelName: string = "flux1-dev-fp8.safetensors",
  vaeName: string = "ae.safetensors"
): boolean {
  workflow["flux_unet_loader"] = {
    class_type: "UNETLoader",
    inputs: {
      unet_name: unetModelName,
      weight_dtype: "fp8_e4m3fn"
    },
    _meta: { title: "FLUX.2 Dev fp8 UNet Loader (12GB VRAM)" }
  };

  workflow["flux_dual_clip_loader"] = {
    class_type: "DualCLIPLoader",
    inputs: {
      clip_name1: "clip_l.safetensors",
      clip_name2: "t5xxl_fp8_e4m3fn.safetensors",
      type: "flux"
    },
    _meta: { title: "FLUX Dual CLIP Loader (CLIP-L + T5-XXL)" }
  };

  workflow["flux_vae_loader"] = {
    class_type: "VAELoader",
    inputs: { vae_name: vaeName },
    _meta: { title: "FLUX 16-Channel VAE Loader" }
  };

  comfyLog(`[FLUXLoader] 🚀 Injected FLUX.2 fp8 Stage 1 environment generation nodes (${unetModelName})`);
  return true;
}
