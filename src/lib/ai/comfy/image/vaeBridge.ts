/**
 * src/lib/ai/comfy/image/vaeBridge.ts
 *
 * Task XA-3 (IMAGE_ROADMAP.md Part 16).
 * Architecture Crossing VAE Pixel Bridge Engine (FLUX 16-channel -> SDXL 4-channel).
 * Bridges incompatible latent spaces at FLUX -> SDXL architecture boundaries
 * by decoding FLUX 16-channel latents to pixel space and re-encoding with SDXL FP32 VAE.
 */

import { comfyLog } from "../api";

export interface VAEBridgeResult {
  sourceChannels: 16;
  targetChannels: 4;
  denoise: number;
}

import { ComfyWorkflow } from "../types";

/**
 * Task XA-3: Injects VAE decode -> pixel space -> VAE encode bridge nodes into ComfyUI workflow graph.
 */
export function injectVAEArchitectureBridge(
  workflow: ComfyWorkflow,
  fluxLatentSourceId: string = "flux_ksampler",
  denoise: number = 0.60
): boolean {
  workflow["flux_vae_decode"] = {
    class_type: "VAEDecode",
    inputs: {
      samples: [fluxLatentSourceId, 0],
      vae: ["flux_vae_loader", 0]
    },
    _meta: { title: "FLUX 16-Channel VAE Decode Pass" }
  };

  workflow["sdxl_fp32_vae_loader"] = {
    class_type: "VAELoader",
    inputs: { vae_name: "sdxl_vae.safetensors" },
    _meta: { title: "SDXL FP32 VAE Loader for Bridge Re-encode" }
  };

  workflow["sdxl_vae_encode_bridge"] = {
    class_type: "VAEEncode",
    inputs: {
      pixels: ["flux_vae_decode", 0],
      vae: ["sdxl_fp32_vae_loader", 0]
    },
    _meta: { title: "SDXL 4-Channel VAE Encode Bridge (Pixel Space Re-encode)" }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.latent_image = ["sdxl_vae_encode_bridge", 0];
    workflow["8"].inputs.denoise = denoise;
  }

  comfyLog(`[VAEBridge] 🌉 Injected VAE Pixel Bridge (FLUX 16ch -> Pixel -> SDXL 4ch, Denoise: ${denoise})`);
  return true;
}
