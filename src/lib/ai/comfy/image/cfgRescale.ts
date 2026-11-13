/**
 * src/lib/ai/comfy/image/cfgRescale.ts
 *
 * Task AD-2 (IMAGE_ROADMAP.md Part 15).
 * CFG Rescale Guidance Re-Normalization Engine.
 * Re-normalizes guidance vector magnitude (0.0 to 1.0) post-CFG computation
 * to eliminate over-saturation while preserving prompt adherence.
 */

import { comfyLog } from "../api";

export interface CFGRescaleConfig {
  cfg: number;
  rescale: number; // 0.0 to 1.0
  reasoning: string;
}

/**
 * Task AD-2: Resolves stage-specific CFG scale and rescale factor.
 */
export function getStageCFGRescale(stageIndex: number): CFGRescaleConfig {
  switch (stageIndex) {
    case 1:
      return { cfg: 7.0, rescale: 0.3, reasoning: "Strong structural guidance from empty noise" };
    case 3:
      return { cfg: 6.0, rescale: 0.6, reasoning: "Balanced identity lock and natural skin tone" };
    case 5:
      return { cfg: 5.0, rescale: 0.5, reasoning: "Natural face skin tones priority" };
    default:
      return { cfg: 4.5, rescale: 0.4, reasoning: "Default balanced CFG rescale" };
  }
}

import { ComfyWorkflow } from "../types";

/**
 * Task AD-2: Injects CFGRescale node into ComfyUI workflow graph.
 */
export function injectCFGRescaleNode(
  workflow: ComfyWorkflow,
  stageIndex: number,
  modelSourceId: string = "1"
): boolean {
  if (!workflow[modelSourceId]) return false;

  const config = getStageCFGRescale(stageIndex);

  workflow["cfg_rescale_node"] = {
    class_type: "RescaleCFG",
    inputs: {
      model: [modelSourceId, 0],
      multiplier: config.rescale
    },
    _meta: { title: `CFG Rescale Re-Normalization (Rescale: ${config.rescale})` }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.model = ["cfg_rescale_node", 0];
  }

  comfyLog(`[CFGRescale] 🎛️ Injected RescaleCFG node for Stage ${stageIndex} (Rescale: ${config.rescale}) — ${config.reasoning}`);
  return true;
}
