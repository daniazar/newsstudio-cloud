/**
 * src/lib/ai/comfy/image/modelBlender.ts
 *
 * Task EX-9 (IMAGE_ROADMAP.md Part 14).
 * Runtime Checkpoint Blending Engine.
 * In-memory model merging of two SDXL checkpoints (e.g. CyberRealistic 0.65 + RealVisXL 0.35)
 * at inference time via ModelMergeSimple to achieve custom aesthetic combinations.
 */

import { comfyLog } from "../api";

export interface ModelBlendConfig {
  modelA: string;
  modelB: string;
  ratio: number; // 0.0 to 1.0
}

import { ComfyWorkflow } from "../types";

/**
 * Task EX-9: Injects ModelMergeSimple node into ComfyUI workflow graph.
 */
export function injectModelMergeNode(
  workflow: ComfyWorkflow,
  modelA: string = "cyberrealisticPony_v180Coreshift.safetensors",
  modelB: string = "realvisxl_v50.safetensors",
  ratio: number = 0.65
): boolean {
  workflow["checkpoint_loader_a"] = {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: modelA },
    _meta: { title: `Checkpoint A (${modelA})` }
  };

  workflow["checkpoint_loader_b"] = {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: modelB },
    _meta: { title: `Checkpoint B (${modelB})` }
  };

  workflow["runtime_model_merge"] = {
    class_type: "ModelMergeSimple",
    inputs: {
      model1: ["checkpoint_loader_a", 0],
      model2: ["checkpoint_loader_b", 0],
      ratio
    },
    _meta: { title: `ModelMergeSimple (Ratio: ${ratio})` }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.model = ["runtime_model_merge", 0];
  }

  comfyLog(`[ModelBlender] 🧪 Injected ModelMergeSimple runtime blend (${modelA} x ${ratio} + ${modelB} x ${(1 - ratio).toFixed(2)})`);
  return true;
}
