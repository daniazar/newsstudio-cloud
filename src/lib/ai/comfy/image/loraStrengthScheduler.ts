/**
 * src/lib/ai/comfy/image/loraStrengthScheduler.ts
 *
 * Task QX-5 (IMAGE_ROADMAP.md Part 20).
 * Continuous LoRA Strength Modulation Engine.
 * Modulates LoRA strength dynamically along a lerp curve during KSampler steps
 * (e.g. 0.3 at step 1 → 0.85 at step 10 → 0.5 at step 20) via LoRAStrengthScheduler node.
 */

import { comfyLog } from "../api";

export interface LoRASchedulerConfig {
  startWeight: number; // e.g. 0.3
  peakWeight: number;  // e.g. 0.85
  endWeight: number;   // e.g. 0.50
}

import { ComfyWorkflow } from "../types";

/**
 * Task QX-5: Injects LoRAStrengthScheduler node into ComfyUI workflow graph.
 */
export function injectLoRAStrengthSchedulerNode(
  workflow: ComfyWorkflow,
  config: LoRASchedulerConfig = { startWeight: 0.3, peakWeight: 0.85, endWeight: 0.50 }
): boolean {
  workflow["lora_strength_scheduler"] = {
    class_type: "LoRAStrengthScheduler",
    inputs: {
      start_weight: config.startWeight,
      peak_weight: config.peakWeight,
      end_weight: config.endWeight
    },
    _meta: { title: "Continuous LoRA Strength Scheduler (Lerp Curve)" }
  };

  comfyLog(`[LoRAStrengthScheduler] 📈 Injected LoRA Strength Modulation Scheduler (Curve: ${config.startWeight} -> ${config.peakWeight} -> ${config.endWeight})`);
  return true;
}
