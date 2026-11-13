/**
 * src/lib/ai/comfy/image/fluxQuantDetector.ts
 *
 * Task XA-6 (IMAGE_ROADMAP.md Part 16).
 * FLUX Quantization Auto-Detector & UNETLoader Fallback Engine.
 * Detects FLUX quantization format (fp8_e4m3fn vs GGUF Q4_K_M vs native bf16)
 * to enforce safe 12GB VRAM allocation.
 */

import { comfyLog } from "../api";

export interface FLUXQuantSpec {
  modelName: string;
  isQuantized: boolean;
  quantType: "fp8_e4m3fn" | "gguf_q4_k_m" | "bf16_native";
  recommendedLoader: "UNETLoader" | "UnetLoaderGGUF" | "CheckpointLoaderSimple";
  vramUsageGb: number;
}

/**
 * Task XA-6: Auto-detects FLUX quantization format and loader strategy.
 */
export function detectFLUXQuantization(modelName: string): FLUXQuantSpec {
  const lower = modelName.toLowerCase();

  if (lower.includes("gguf") || lower.includes("q4")) {
    comfyLog(`[FLUXQuantDetector] 📦 Detected FLUX GGUF quantization (${modelName}) -> UnetLoaderGGUF (~8.5GB VRAM)`);
    return {
      modelName,
      isQuantized: true,
      quantType: "gguf_q4_k_m",
      recommendedLoader: "UnetLoaderGGUF",
      vramUsageGb: 8.5
    };
  }

  if (lower.includes("fp8") || lower.includes("e4m3fn")) {
    comfyLog(`[FLUXQuantDetector] 📦 Detected FLUX fp8 quantization (${modelName}) -> UNETLoader (~12.0GB VRAM)`);
    return {
      modelName,
      isQuantized: true,
      quantType: "fp8_e4m3fn",
      recommendedLoader: "UNETLoader",
      vramUsageGb: 12.0
    };
  }

  comfyLog(`[FLUXQuantDetector] ⚠️ Detected native bf16 FLUX model (${modelName}) -> High VRAM risk (~24.0GB VRAM)`);
  return {
    modelName,
    isQuantized: false,
    quantType: "bf16_native",
    recommendedLoader: "UNETLoader",
    vramUsageGb: 24.0
  };
}
