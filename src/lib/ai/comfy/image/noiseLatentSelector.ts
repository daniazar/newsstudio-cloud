/**
 * src/lib/ai/comfy/image/noiseLatentSelector.ts
 *
 * Task XA-8 (IMAGE_ROADMAP.md Part 16).
 * Noise Latent Type Selection Engine.
 * Injects structured noise patterns (fractal for Stage 1 environment, directional for Stage 3 persona placement,
 * and gaussian for micro-detail passes) into latent initialization.
 */

import { comfyLog } from "../api";

export type NoiseType = "fractal" | "directional" | "gaussian";

export interface NoiseLatentConfig {
  stageIndex: number;
  noiseType: NoiseType;
  reasoning: string;
}

export function getStageNoiseType(stageIndex: number): NoiseLatentConfig {
  switch (stageIndex) {
    case 1:
      return { stageIndex: 1, noiseType: "fractal", reasoning: "Multi-scale structure favors architectural coherence" };
    case 3:
      return { stageIndex: 3, noiseType: "directional", reasoning: "Linear gradient guides subject placement" };
    default:
      return { stageIndex, noiseType: "gaussian", reasoning: "Unconstrained neutral noise for micro-refinement" };
  }
}

import { ComfyWorkflow } from "../types";

/**
 * Task XA-8: Injects LatentNoise node into ComfyUI workflow graph.
 */
export function injectNoiseLatentTypeNode(
  workflow: ComfyWorkflow,
  stageIndex: number
): boolean {
  const config = getStageNoiseType(stageIndex);

  workflow["structured_latent_noise"] = {
    class_type: "LatentNoise",
    inputs: {
      noise_type: config.noiseType
    },
    _meta: { title: `Structured Latent Noise (${config.noiseType})` }
  };

  comfyLog(`[NoiseLatentSelector] 🌊 Injected ${config.noiseType} noise latent node for Stage ${stageIndex} — ${config.reasoning}`);
  return true;
}
