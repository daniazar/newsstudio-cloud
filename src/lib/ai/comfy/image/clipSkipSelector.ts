/**
 * src/lib/ai/comfy/image/clipSkipSelector.ts
 *
 * Task AD-1 (IMAGE_ROADMAP.md Part 15).
 * CLIP Skip Auto-Set Per Model Architecture Engine.
 * Resolves correct CLIP skip (stop_at_clip_layer) per model family to prevent prompt misinterpretation
 * (Pony v6 -> CLIP Skip 2, SDXL/RealVis -> CLIP Skip 1).
 */

import { comfyLog } from "../api";

export interface CLIPSkipResult {
  modelName: string;
  clipSkip: number; // 1 or 2
  stopAtClipLayer: number; // -1 or -2
  reasoning: string;
}

/**
 * Task AD-1: Resolves optimal CLIP skip for a given model architecture name.
 */
export function resolveClipSkipForModel(modelName: string): CLIPSkipResult {
  const lower = modelName.toLowerCase();

  if (lower.includes("pony")) {
    comfyLog(`[CLIPSkipSelector] 🎯 Model "${modelName}" detected as Pony family -> Applied CLIP Skip 2 (stop_at_clip_layer: -2)`);
    return {
      modelName,
      clipSkip: 2,
      stopAtClipLayer: -2,
      reasoning: "Pony v6 requires CLIP Skip 2 for proper Booru tag interpretation"
    };
  }

  comfyLog(`[CLIPSkipSelector] 🎯 Model "${modelName}" detected as SDXL standard family -> Applied CLIP Skip 1 (stop_at_clip_layer: -1)`);
  return {
    modelName,
    clipSkip: 1,
    stopAtClipLayer: -1,
    reasoning: "Standard SDXL requires CLIP Skip 1 for maximum photorealism"
  };
}

import { ComfyWorkflow } from "../types";

/**
 * Task AD-1: Injects CLIPSetLastLayer node into ComfyUI workflow graph.
 */
export function applyClipSkipToWorkflow(
  workflow: ComfyWorkflow,
  modelName: string,
  clipSourceId: string = "2"
): boolean {
  if (!workflow[clipSourceId]) return false;

  const result = resolveClipSkipForModel(modelName);

  workflow["clip_skip_node"] = {
    class_type: "CLIPSetLastLayer",
    inputs: {
      clip: [clipSourceId, 0],
      stop_at_clip_layer: result.stopAtClipLayer
    },
    _meta: { title: `CLIP Skip ${result.clipSkip} (${result.reasoning})` }
  };

  if (workflow["6"] && workflow["6"].inputs) {
    workflow["6"].inputs.clip = ["clip_skip_node", 0];
  }

  return true;
}
