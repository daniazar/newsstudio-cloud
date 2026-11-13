/**
 * src/lib/ai/comfy/image/ggufFallback.ts
 *
 * Task XA-11 (IMAGE_ROADMAP.md Part 16).
 * GGUF Q4_K_M Fallback Engine for FLUX.
 * Auto-switches FLUX unet loader from fp8 to GGUF Q4_K_M (~8.5GB VRAM) via UnetLoaderGGUF
 * when fp8 quantization artifacts are detected.
 */

import { comfyLog } from "../api";

export interface GGUFFallbackResult {
  shouldSwitchToGGUF: boolean;
  selectedModelName: string;
  loaderType: "UNETLoader" | "UnetLoaderGGUF";
}

/**
 * Task XA-11: Resolves GGUF fallback for FLUX when quality degradation is detected.
 */
export function resolveFLUXFallbackModel(
  currentModelName: string,
  hasQualityIssues: boolean
): GGUFFallbackResult {
  if (hasQualityIssues && currentModelName.includes("fp8")) {
    const ggufModelName = "flux1-dev-Q4_K_M.gguf";
    comfyLog(`[GGUFFallback] 🔄 Auto-switched FLUX model from fp8 to GGUF Q4_K_M fallback (${ggufModelName})`);
    return {
      shouldSwitchToGGUF: true,
      selectedModelName: ggufModelName,
      loaderType: "UnetLoaderGGUF"
    };
  }

  return {
    shouldSwitchToGGUF: false,
    selectedModelName: currentModelName,
    loaderType: "UNETLoader"
  };
}
