/**
 * src/lib/ai/comfy/image/pagGuidance.ts
 *
 * Task EX-1 (IMAGE_ROADMAP.md Part 14).
 * Perturbed Attention Guidance (PAG) Engine.
 * Applies SOTA self-attention perturbation guidance to Stages 3, 3.5, 5, and 6
 * to eliminate CFG over-saturation, joint warping, and plastic skin artifacts.
 */

import { comfyLog } from "../api";

export interface PAGConfig {
  enablePAG: boolean;
  scale: number;
  reasoning: string;
}

/**
 * Task EX-1: Resolves stage-specific Perturbed Attention Guidance (PAG) scale.
 */
export function getStagePAGConfig(stageIndex: number): PAGConfig {
  switch (stageIndex) {
    case 3:
      return { enablePAG: true, scale: 3.0, reasoning: "Prevents anatomy warping during persona insertion" };
    case 3.5:
      return { enablePAG: true, scale: 3.5, reasoning: "Critical — prevents finger fusion artifacts in contact zones" };
    case 5:
      return { enablePAG: true, scale: 2.5, reasoning: "Prevents over-saturated artificial eye and skin sheen" };
    case 6:
      return { enablePAG: true, scale: 3.0, reasoning: "Anatomical finger structure reconstruction guidance" };
    default:
      return { enablePAG: false, scale: 0.0, reasoning: "Standard CFG structural guidance" };
  }
}

import { ComfyWorkflow } from "../types";

/**
 * Task EX-1: Injects PerturbedAttentionGuidance node into ComfyUI workflow graph for stage.
 */
export function injectPAGGuidanceNode(
  workflow: ComfyWorkflow,
  stageIndex: number,
  modelSourceId: string = "1"
): boolean {
  const config = getStagePAGConfig(stageIndex);
  if (!config.enablePAG || !workflow[modelSourceId]) return false;

  workflow["pag_guidance_node"] = {
    class_type: "PerturbedAttentionGuidance",
    inputs: {
      model: [modelSourceId, 0],
      scale: config.scale
    },
    _meta: { title: `Perturbed Attention Guidance (PAG Scale: ${config.scale})` }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.model = ["pag_guidance_node", 0];
  }

  comfyLog(`[PAGGuidance] ✨ Injected PAG Guidance node for Stage ${stageIndex} (Scale: ${config.scale}) — ${config.reasoning}`);
  return true;
}
