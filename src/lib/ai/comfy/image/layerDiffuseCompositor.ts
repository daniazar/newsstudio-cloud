/**
 * src/lib/ai/comfy/image/layerDiffuseCompositor.ts
 *
 * Task OB-1 (IMAGE_ROADMAP.md Part 19).
 * LayerDiffuse Alpha-Compositing Engine.
 * Injects LayerDiffuse RGBA nodes for Stage 3 transparent persona generation,
 * strictly gated to low contact scenes (contactIntensityScore < 15).
 */

import { comfyLog } from "../api";

export interface LayerDiffuseConfig {
  contactIntensityScore: number;
  weight: number;
}

import { ComfyWorkflow } from "../types";

/**
 * Task OB-1: Injects LayerDiffuse nodes into ComfyUI workflow graph if contact score < 15.
 */
export function injectLayerDiffuseNodes(
  workflow: ComfyWorkflow,
  config: LayerDiffuseConfig
): boolean {
  if (config.contactIntensityScore >= 15) {
    comfyLog(`[LayerDiffuse] ⚠️ Blocked LayerDiffuse injection (contact score ${config.contactIntensityScore} >= 15 threshold)`);
    return false;
  }

  workflow["layer_diffuse_loader"] = {
    class_type: "LayerDiffuseModelLoader",
    inputs: { model_type: "SDXL_TRANSPARENT_CHOICE" },
    _meta: { title: "LayerDiffuse Model Loader (RGBA)" }
  };

  workflow["apply_layer_diffuse"] = {
    class_type: "LayerDiffuseApply",
    inputs: {
      layer_model: ["layer_diffuse_loader", 0],
      weight: config.weight || 1.0
    },
    _meta: { title: "Apply LayerDiffuse Alpha Composite" }
  };

  comfyLog(`[LayerDiffuse] 🎨 Injected LayerDiffuse RGBA alpha-compositing node (Weight: ${config.weight || 1.0})`);
  return true;
}
