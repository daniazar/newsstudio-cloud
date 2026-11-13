/**
 * src/lib/ai/comfy/image/cannyLock.ts
 *
 * Task PR-9 (IMAGE_ROADMAP.md Part 13).
 * ControlNet Canny Structural Edge Locking Engine.
 * Extracts Canny edge maps from previous stage outputs and feeds them as ControlNet
 * conditioning during refinement passes (Stages 3.5, 4, 5) to prevent positional drift.
 */

import { comfyLog } from "../api";

export function getStageCannyStrength(stageIndex: number): number {
  switch (stageIndex) {
    case 3.5:
      return 0.50; // Contact coherence structural lock
    case 4:
      return 0.35; // Relighting structural lock
    case 5:
      return 0.25; // Micro-anatomy structural lock
    default:
      return 0.0;
  }
}

import { ComfyWorkflow } from "../types";

/**
 * Task PR-9: Injects Canny edge extraction and ControlNet conditioning into ComfyUI workflow graph.
 */
export function injectControlNetCannyLock(
  workflow: ComfyWorkflow,
  stageIndex: number,
  previousImageSourceId: string = "8",
  cannyModelName: string = "controlnet_sdxl_canny_1.0.safetensors"
): boolean {
  const strength = getStageCannyStrength(stageIndex);
  if (strength <= 0 || !workflow[previousImageSourceId]) return false;

  workflow["canny_preprocessor"] = {
    class_type: "CannyEdgePreprocessor",
    inputs: {
      image: [previousImageSourceId, 0],
      low_threshold: 100,
      high_threshold: 200
    },
    _meta: { title: "Canny Structural Edge Extractor" }
  };

  workflow["canny_controlnet_loader"] = {
    class_type: "ControlNetLoader",
    inputs: { control_net_name: cannyModelName },
    _meta: { title: "ControlNet Canny Model Loader" }
  };

  workflow["canny_controlnet_apply"] = {
    class_type: "ControlNetApplyAdvanced",
    inputs: {
      strength,
      start_percent: 0.0,
      end_percent: 0.75,
      positive: ["6", 0],
      negative: ["7", 0],
      control_net: ["canny_controlnet_loader", 0],
      image: ["canny_preprocessor", 0]
    },
    _meta: { title: `ControlNet Canny Lock (Stage ${stageIndex}, Strength: ${strength})` }
  };

  comfyLog(`[CannyLock] 📐 Injected ControlNet Canny Lock for Stage ${stageIndex} (Strength: ${strength})`);
  return true;
}
