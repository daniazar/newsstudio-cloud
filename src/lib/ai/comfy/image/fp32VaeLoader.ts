/**
 * src/lib/ai/comfy/image/fp32VaeLoader.ts
 *
 * Task AD-3 (IMAGE_ROADMAP.md Part 15).
 * Explicit FP32 VAE Decoder Engine.
 * Replaces checkpoint embedded bf16 VAE with explicit SDXL FP32 VAE loader (sdxl_vae.safetensors)
 * to eliminate blue/green color shift and preserve natural skin tones.
 */

import { comfyLog } from "../api";

export interface FP32VAEConfig {
  vaeName: string;
  isFP32: boolean;
}

import { ComfyWorkflow } from "../types";

/**
 * Task AD-3: Injects explicit FP32 VAE Loader and connects to terminal VAEDecode node.
 */
export function injectFP32VAEDecoder(
  workflow: ComfyWorkflow,
  latentSourceId: string = "8",
  vaeName: string = "sdxl_vae.safetensors"
): boolean {
  workflow["fp32_vae_loader"] = {
    class_type: "VAELoader",
    inputs: { vae_name: vaeName },
    _meta: { title: "SDXL Official FP32 VAE Loader (Fixes Color Shift)" }
  };

  workflow["terminal_vae_decode"] = {
    class_type: "VAEDecode",
    inputs: {
      samples: [latentSourceId, 0],
      vae: ["fp32_vae_loader", 0]
    },
    _meta: { title: "Terminal FP32 VAE Decode Pass" }
  };

  comfyLog(`[FP32VAELoader] 🎨 Injected explicit FP32 VAE loader (${vaeName}) for terminal decode pass`);
  return true;
}
