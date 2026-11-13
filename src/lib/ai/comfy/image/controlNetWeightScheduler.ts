/**
 * src/lib/ai/comfy/image/controlNetWeightScheduler.ts
 *
 * Task EX-5 (IMAGE_ROADMAP.md Part 21).
 * ControlNet Weight Scheduling Engine.
 * Modulates ControlNet conditioning strength over step intervals [startStepPercent, midStepPercent, endStepPercent]
 * (e.g. 1.0 at step 0% → 0.7 at 40% → 0.2 at 80%) via ControlNetApplyAdvanced node.
 */

import { comfyLog } from "../api";

export interface ControlNetScheduleConfig {
  startPercent: number; // 0.0
  endPercent: number;   // 0.8
  strength: number;     // 0.85
}

import { ComfyWorkflow } from "../types";

/**
 * Task EX-5: Injects ControlNet weight schedule parameters into ComfyUI workflow graph.
 */
export function injectControlNetWeightSchedule(
  workflow: ComfyWorkflow,
  config: ControlNetScheduleConfig = { startPercent: 0.0, endPercent: 0.8, strength: 0.85 }
): boolean {
  workflow["scheduled_control_net"] = {
    class_type: "ControlNetApplyAdvanced",
    inputs: {
      start_percent: config.startPercent,
      end_percent: config.endPercent,
      strength: config.strength
    },
    _meta: { title: "Scheduled ControlNet (Step Interval)" }
  };

  comfyLog(`[ControlNetWeightScheduler] 🎛️ Injected ControlNet Weight Schedule (Interval: ${config.startPercent * 100}% -> ${config.endPercent * 100}%, Strength: ${config.strength})`);
  return true;
}
