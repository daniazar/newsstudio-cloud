/**
 * src/lib/ai/comfy/image/sdxlLightningScheduler.ts
 *
 * Task EV-5 (IMAGE_ROADMAP.md Part 18).
 * SDXL-Lightning Auto-Scheduler Engine.
 * Detects SDXL-Lightning acceleration LoRA in active stack and auto-configures KSampler nodes
 * (sampler: euler, scheduler: sgm_uniform, steps: 4, cfg: 1.0) for ultra-fast 4-step sampling.
 */

import { comfyLog } from "../api";

export interface LightningScheduleResult {
  isLightningActive: boolean;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
}

import { ComfyWorkflow } from "../types";

/**
 * Task EV-5: Auto-injects SDXL-Lightning sampler parameters when Lightning LoRA is present.
 */
export function injectSDXLLightningConfig(
  workflow: ComfyWorkflow,
  activeLoras: Array<{ name: string; strength: number }>
): LightningScheduleResult {
  const isLightningActive = activeLoras.some(l => l.name.toLowerCase().includes("lightning"));

  if (!isLightningActive) {
    return {
      isLightningActive: false,
      steps: 20,
      cfg: 6.5,
      samplerName: "dpmpp_2m",
      scheduler: "karras"
    };
  }

  // Mutate all KSampler nodes to Lightning parameters
  Object.keys(workflow).forEach(key => {
    const node = workflow[key];
    if (node && (node.class_type === "KSampler" || node.class_type === "KSamplerAdvanced")) {
      if (!node.inputs) node.inputs = {};
      node.inputs["steps"] = 4;
      node.inputs["cfg"] = 1.0;
      node.inputs["sampler_name"] = "euler";
      node.inputs["scheduler"] = "sgm_uniform";
    }
  });

  comfyLog(`[SDXLLightningScheduler] ⚡ SDXL-Lightning detected! Reconfigured KSamplers to 4 steps, euler, sgm_uniform, CFG 1.0`);

  return {
    isLightningActive: true,
    steps: 4,
    cfg: 1.0,
    samplerName: "euler",
    scheduler: "sgm_uniform"
  };
}
