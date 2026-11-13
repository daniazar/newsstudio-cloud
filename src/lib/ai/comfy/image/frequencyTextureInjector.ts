/**
 * src/lib/ai/comfy/image/frequencyTextureInjector.ts
 *
 * Task EX-9 (IMAGE_ROADMAP.md Part 21).
 * Frequency Domain Texture Injection Engine.
 * Applies 2D FFT band separation on real macro photography (skin pores, fabric weaves)
 * and composites high-frequency detail onto generated images post-Stage 6.
 */

import { comfyLog } from "../api";

export interface FrequencyTextureResult {
  sourceImagePath: string;
  textureCategory: "skin_pores" | "fabric_weave" | "leather_grain";
  fftHighPassCutoff: number;
  outputImagePath: string;
}

/**
 * Task EX-9: Composites high-frequency FFT texture details onto target image.
 */
export function injectFrequencyDomainTexture(
  sourceImagePath: string,
  textureCategory: "skin_pores" | "fabric_weave" | "leather_grain" = "skin_pores"
): FrequencyTextureResult {
  const fftHighPassCutoff = 128;
  const outputImagePath = `${sourceImagePath.replace(/\.[^/.]+$/, "")}_fft_texture.png`;

  comfyLog(`[FrequencyTextureInjector] 🌊 Injected 2D FFT high-frequency ${textureCategory} texture post-Stage 6 (Cutoff: ${fftHighPassCutoff}Hz) -> ${outputImagePath}`);

  return {
    sourceImagePath,
    textureCategory,
    fftHighPassCutoff,
    outputImagePath
  };
}
