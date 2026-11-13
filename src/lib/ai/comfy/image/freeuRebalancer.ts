/**
 * src/lib/ai/comfy/image/freeuRebalancer.ts
 *
 * Task EX-2 (IMAGE_ROADMAP.md Part 14).
 * FreeU v2 UNet Feature Stream Rebalancing Engine.
 * Re-weights backbone (layout) and skip (texture) UNet feature streams per stage phase
 * to enhance global composition coherence and eliminate noise artifacts.
 */

import { comfyLog } from "../api";

export interface FreeUParameters {
  b1: number;
  b2: number;
  s1: number;
  s2: number;
  phaseName: string;
}

/**
 * Task EX-2: Resolves stage-appropriate FreeU v2 parameters (Structure phase vs Detail phase).
 */
export function getStageFreeUParameters(stageIndex: number): FreeUParameters {
  if (stageIndex <= 2) {
    return {
      b1: 1.3,
      b2: 1.4,
      s1: 0.9,
      s2: 0.2,
      phaseName: "Structure-Building Phase (Stage 1-2)"
    };
  }

  return {
    b1: 1.1,
    b2: 1.2,
    s1: 0.6,
    s2: 0.4,
    phaseName: "Detail-Refinement Phase (Stage 3-6)"
  };
}

import { ComfyWorkflow } from "../types";

/**
 * Task EX-2: Injects FreeU_V2 node into ComfyUI workflow graph.
 */
export function injectFreeUV2Node(
  workflow: ComfyWorkflow,
  stageIndex: number,
  modelSourceId: string = "1"
): boolean {
  if (!workflow[modelSourceId]) return false;

  const params = getStageFreeUParameters(stageIndex);

  workflow["freeu_v2_node"] = {
    class_type: "FreeU_V2",
    inputs: {
      model: [modelSourceId, 0],
      b1: params.b1,
      b2: params.b2,
      s1: params.s1,
      s2: params.s2
    },
    _meta: { title: `FreeU v2 Feature Stream Rebalancer (${params.phaseName})` }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.model = ["freeu_v2_node", 0];
  }

  comfyLog(`[FreeURebalancer] 🎛️ Injected FreeU_V2 node for Stage ${stageIndex} (b1:${params.b1}, b2:${params.b2}, s1:${params.s1}, s2:${params.s2})`);
  return true;
}
