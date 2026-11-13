/**
 * src/lib/ai/comfy/image/reactorFallback.ts
 *
 * Task EX-8 (IMAGE_ROADMAP.md Part 14).
 * ReActor Face Swap Conditional Fallback Engine.
 * Triggers inswapper_128.onnx surgical face swap + CodeFormer face restoration
 * ONLY when CLIP identity similarity score falls below 0.80 after Stage 5.
 */

import { comfyLog } from "../api";

export interface ReActorFallbackResult {
  shouldTrigger: boolean;
  score: number;
  threshold: number;
}

export function shouldTriggerReActorFallback(clipIdentityScore: number, threshold: number = 0.80): ReActorFallbackResult {
  const shouldTrigger = clipIdentityScore < threshold;

  if (shouldTrigger) {
    comfyLog(`[ReActorFallback] ⚠️ Identity score (${(clipIdentityScore * 100).toFixed(1)}%) < threshold (${(threshold * 100).toFixed(0)}%) — Triggering ReActor fallback!`);
  } else {
    comfyLog(`[ReActorFallback] ✅ Identity score (${(clipIdentityScore * 100).toFixed(1)}%) >= threshold (${(threshold * 100).toFixed(0)}%) — Skipping ReActor fallback`);
  }

  return {
    shouldTrigger,
    score: clipIdentityScore,
    threshold
  };
}

import { ComfyWorkflow } from "../types";

/**
 * Task EX-8: Injects ReActor Face Swap node into ComfyUI workflow graph.
 */
export function injectReActorFallbackNode(
  workflow: ComfyWorkflow,
  stage5ImageSourceId: string = "8",
  faceRefPath: string = "personas/ruby/ruby.png"
): boolean {
  if (!workflow[stage5ImageSourceId]) return false;

  workflow["reactor_face_swap"] = {
    class_type: "ReActorFaceSwap",
    inputs: {
      input_image: [stage5ImageSourceId, 0],
      source_image: faceRefPath,
      swap_model: "inswapper_128.onnx",
      face_restore_model: "CodeFormer",
      face_restore_visibility: 0.5,
      codeformer_weight: 0.7
    },
    _meta: { title: "ReActor Conditional Fallback Face Swap (inswapper_128.onnx)" }
  };

  comfyLog(`[ReActorFallback] 🎭 Injected ReActor Face Swap node wired to Stage 5 output`);
  return true;
}
