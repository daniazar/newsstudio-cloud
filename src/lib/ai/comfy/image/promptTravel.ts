/**
 * src/lib/ai/comfy/image/promptTravel.ts
 *
 * Task PR-2 (IMAGE_ROADMAP.md Part 13).
 * 3-Phase Step-Scheduled Prompt Travel Engine.
 * Schedules prompt conditionings at specific denoising step intervals (0-30% Layout, 30-70% Subject, 70-100% Detail)
 * to maximize diffusion UNet step efficiency.
 */

import { comfyLog } from "../api";

export interface PromptTravelSchedule {
  layoutStepEnd: number;
  subjectStepEnd: number;
  totalSteps: number;
  scheduleMap: Record<number, string>;
}

/**
 * Task PR-2: Compiles a 3-phase prompt travel schedule for step-interval conditioning switching.
 */
export function compile3PhasePromptTravelSchedule(
  totalSteps: number = 28,
  layoutPrompt: string = "establishing broadcast studio, architectural forms, ambient lighting",
  subjectPrompt: string = "female news presenter, copper red hair, green eyes, dark navy blazer",
  detailPrompt: string = "photorealistic, skin texture, visible pores, 8k resolution, sharp focus"
): PromptTravelSchedule {
  const layoutStepEnd = Math.max(1, Math.round(totalSteps * 0.30));
  const subjectStepEnd = Math.max(layoutStepEnd + 1, Math.round(totalSteps * 0.70));

  const scheduleMap: Record<number, string> = {
    0: layoutPrompt,
    [layoutStepEnd]: subjectPrompt,
    [subjectStepEnd]: detailPrompt
  };

  comfyLog(`[PromptTravel] ⏱️ Compiled 3-Phase Schedule (0-${layoutStepEnd}: Layout, ${layoutStepEnd}-${subjectStepEnd}: Subject, ${subjectStepEnd}-${totalSteps}: Detail)`);

  return {
    layoutStepEnd,
    subjectStepEnd,
    totalSteps,
    scheduleMap
  };
}

import { ComfyWorkflow } from "../types";

/**
 * Injects PromptTravel schedule into ComfyUI workflow graph.
 */
export function injectPromptTravelSchedule(
  workflow: ComfyWorkflow,
  schedule: PromptTravelSchedule,
  clipSource: [string, number] = ["2", 1]
): boolean {
  if (!workflow["8"]) return false;

  workflow["prompt_travel_schedule"] = {
    class_type: "CLIPTextEncodeSequence",
    inputs: {
      text: Object.entries(schedule.scheduleMap)
        .map(([step, text]) => `"${step}": "${text}"`)
        .join("\n"),
      clip: clipSource
    },
    _meta: { title: "3-Phase Prompt Travel Schedule (Layout -> Subject -> Detail)" }
  };

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.positive = ["prompt_travel_schedule", 0];
  }

  comfyLog(`[PromptTravel] ✅ Injected CLIPTextEncodeSequence node into workflow graph`);
  return true;
}
