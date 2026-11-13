/**
 * src/lib/ai/comfy/image/samplerScheduler.ts
 *
 * Task PR-1 (IMAGE_ROADMAP.md Part 13).
 * Per-Stage Sampler & Scheduler Selection Engine.
 * Dynamically assigns optimal KSampler sampler_name and scheduler choices per pipeline stage.
 */

import { comfyLog } from "../api";

export interface SamplerSchedulerConfig {
  samplerName: string;
  scheduler: string;
  reasoning: string;
}

const STAGE_SAMPLER_MAP: Record<number, SamplerSchedulerConfig> = {
  0.5: { samplerName: "euler_ancestral", scheduler: "sgm_uniform", reasoning: "Fast pose and framing geometry pre-pass" },
  1: { samplerName: "dpmpp_2m", scheduler: "karras", reasoning: "Optimal structure generation from pure noise" },
  2: { samplerName: "dpmpp_sde", scheduler: "karras", reasoning: "Stochastic placement for foreground props" },
  3: { samplerName: "dpmpp_2m_sde", scheduler: "exponential", reasoning: "Smooth organic skin, hair, and clothing rendering" },
  3.2: { samplerName: "dpmpp_2m", scheduler: "karras", reasoning: "Sharp fabric weave and wardrobe seams" },
  3.5: { samplerName: "euler_ancestral", scheduler: "normal", reasoning: "Stochastic jitter for contact boundary micro-corrections" },
  4: { samplerName: "ddim", scheduler: "ddim_uniform", reasoning: "Fully deterministic relighting control" },
  5: { samplerName: "dpmpp_2m", scheduler: "karras", reasoning: "Sharpest facial micro-anatomy detailer" },
  6: { samplerName: "uni_pc", scheduler: "karras", reasoning: "Anatomical finger structure reconstruction" }
};

/**
 * Task PR-1: Resolves optimal KSampler sampler and scheduler for a given stage index.
 */
export function getStageSamplerAndScheduler(stageIndex: number): SamplerSchedulerConfig {
  return STAGE_SAMPLER_MAP[stageIndex] || {
    samplerName: "dpmpp_2m",
    scheduler: "karras",
    reasoning: "Default high-fidelity fallback"
  };
}

import { ComfyWorkflow } from "../types";

/**
 * Applies per-stage sampler and scheduler mutations to ComfyUI workflow graph.
 */
export function applyPerStageSamplerAndScheduler(workflow: ComfyWorkflow, stageIndex: number): SamplerSchedulerConfig {
  const config = getStageSamplerAndScheduler(stageIndex);

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.sampler_name = config.samplerName;
    workflow["8"].inputs.scheduler = config.scheduler;
  } else {
    for (const key of Object.keys(workflow)) {
      if (workflow[key]?.class_type === "KSampler" && workflow[key]?.inputs) {
        workflow[key].inputs.sampler_name = config.samplerName;
        workflow[key].inputs.scheduler = config.scheduler;
      }
    }
  }

  comfyLog(`[SamplerScheduler] ⚙️ Applied Stage ${stageIndex} sampler: ${config.samplerName} (${config.scheduler}) — ${config.reasoning}`);
  return config;
}
