/**
 * src/lib/ai/comfy/image/stepAdapter.ts
 *
 * Task AD-6 (IMAGE_ROADMAP.md Part 15).
 * Dynamic Step Count Adaptation Engine.
 * Scales KSampler step counts dynamically based on scene complexity score
 * (Simple <5, Moderate 5-10, Complex 10-15, Ultra >15).
 */

import { comfyLog } from "../api";

export interface ComplexityScoreResult {
  score: number;
  tier: "SIMPLE" | "MODERATE" | "COMPLEX" | "ULTRA";
}

export function computeSceneComplexityScore(
  objectCount: number = 2,
  personaCount: number = 1,
  isNsfw: boolean = false,
  contactIntensityScore: number = 0
): ComplexityScoreResult {
  const score = objectCount + (personaCount * 3) + (isNsfw ? 2 : 0) + Math.floor(contactIntensityScore / 10);

  let tier: ComplexityScoreResult["tier"] = "SIMPLE";
  if (score >= 15) tier = "ULTRA";
  else if (score >= 10) tier = "COMPLEX";
  else if (score >= 5) tier = "MODERATE";

  return { score, tier };
}

/**
 * Task AD-6: Resolves adaptive stage steps based on scene complexity tier.
 */
export function getAdaptiveStageSteps(stageIndex: number, complexityScore: number): number {
  let tier: "SIMPLE" | "MODERATE" | "COMPLEX" | "ULTRA" = "SIMPLE";
  if (complexityScore >= 15) tier = "ULTRA";
  else if (complexityScore >= 10) tier = "COMPLEX";
  else if (complexityScore >= 5) tier = "MODERATE";

  switch (stageIndex) {
    case 1:
      return tier === "ULTRA" ? 35 : tier === "COMPLEX" ? 30 : tier === "MODERATE" ? 25 : 20;
    case 2:
      return tier === "ULTRA" ? 30 : tier === "COMPLEX" ? 25 : tier === "MODERATE" ? 20 : 15;
    case 3:
      return tier === "ULTRA" ? 35 : tier === "COMPLEX" ? 28 : tier === "MODERATE" ? 22 : 18;
    case 3.5:
      return tier === "ULTRA" ? 25 : tier === "COMPLEX" ? 20 : tier === "MODERATE" ? 16 : 12;
    case 4:
      return tier === "ULTRA" ? 14 : tier === "COMPLEX" ? 12 : tier === "MODERATE" ? 10 : 8;
    case 5:
      return tier === "ULTRA" ? 30 : tier === "COMPLEX" ? 28 : tier === "MODERATE" ? 22 : 18;
    case 6:
      return tier === "ULTRA" ? 25 : tier === "COMPLEX" ? 22 : tier === "MODERATE" ? 18 : 15;
    default:
      return 20;
  }
}

import { ComfyWorkflow } from "../types";

/**
 * Task AD-6: Applies adaptive step count to workflow KSampler nodes.
 */
export function applyAdaptiveStepsToWorkflow(
  workflow: ComfyWorkflow,
  stageIndex: number,
  complexityScore: number
): number {
  const steps = getAdaptiveStageSteps(stageIndex, complexityScore);

  if (workflow["8"] && workflow["8"].inputs) {
    workflow["8"].inputs.steps = steps;
  }

  comfyLog(`[StepAdapter] ⏱️ Applied Stage ${stageIndex} adaptive steps: ${steps} (Complexity Score: ${complexityScore})`);
  return steps;
}
