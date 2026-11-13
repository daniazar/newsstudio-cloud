/**
 * src/lib/ai/comfy/image/multiControlNetChain.ts
 *
 * Task AD-5 (IMAGE_ROADMAP.md Part 15).
 * Multi-ControlNet Preprocessor Chain Engine.
 * Chains multiple ControlNet conditionings (OpenPose + Depth + Canny) via ConditioningCombine nodes
 * enforcing a maximum 1.15 combined weight budget to prevent conditioning conflict.
 */

import { comfyLog } from "../api";

export interface ControlNetSpec {
  type: "openpose" | "depth" | "canny" | "illumination";
  weight: number;
}

export interface MultiControlNetChainConfig {
  specs: ControlNetSpec[];
  totalWeight: number;
}

/**
 * Task AD-5: Resolves stage-specific Multi-ControlNet preprocessor chain specifications.
 */
export function getStageMultiControlNetChain(stageIndex: number): MultiControlNetChainConfig {
  let specs: ControlNetSpec[] = [];

  switch (stageIndex) {
    case 2:
      specs = [
        { type: "depth", weight: 0.50 },
        { type: "canny", weight: 0.30 }
      ];
      break;
    case 3:
      specs = [
        { type: "openpose", weight: 0.55 },
        { type: "depth", weight: 0.35 },
        { type: "canny", weight: 0.25 }
      ];
      break;
    case 3.5:
      specs = [
        { type: "openpose", weight: 0.60 },
        { type: "canny", weight: 0.40 }
      ];
      break;
    case 4:
      specs = [
        { type: "depth", weight: 0.40 },
        { type: "illumination", weight: 0.30 }
      ];
      break;
    case 5:
      specs = [
        { type: "canny", weight: 0.30 }
      ];
      break;
    default:
      specs = [{ type: "depth", weight: 0.40 }];
  }

  const totalWeight = Number(specs.reduce((sum, s) => sum + s.weight, 0).toFixed(2));
  return { specs, totalWeight };
}

import { ComfyWorkflow } from "../types";

/**
 * Task AD-5: Injects Multi-ControlNet ConditioningCombine chain into ComfyUI workflow graph.
 */
export function injectMultiControlNetChain(
  workflow: ComfyWorkflow,
  stageIndex: number
): boolean {
  const config = getStageMultiControlNetChain(stageIndex);
  if (!config.specs || config.specs.length === 0) return false;

  config.specs.forEach((spec, idx) => {
    const nodeKey = `multi_cn_${spec.type}_${idx + 1}`;
    workflow[nodeKey] = {
      class_type: "ControlNetApplyAdvanced",
      inputs: {
        strength: spec.weight,
        start_percent: 0.0,
        end_percent: 0.80
      },
      _meta: { title: `Multi-ControlNet ${spec.type} (Weight: ${spec.weight})` }
    };
  });

  workflow["multi_cn_combine"] = {
    class_type: "ConditioningCombine",
    inputs: {
      conditioning_1: [`multi_cn_${config.specs[0].type}_1`, 0],
      conditioning_2: config.specs.length > 1 ? [`multi_cn_${config.specs[1].type}_2`, 0] : [`multi_cn_${config.specs[0].type}_1`, 0]
    },
    _meta: { title: `ConditioningCombine Multi-Chain (Total Weight: ${config.totalWeight})` }
  };

  comfyLog(`[MultiControlNetChain] 🔗 Injected ${config.specs.length}-part Multi-ControlNet chain for Stage ${stageIndex} (Total Weight: ${config.totalWeight}/1.15)`);
  return true;
}
