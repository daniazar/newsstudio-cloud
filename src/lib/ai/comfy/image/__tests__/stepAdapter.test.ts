import { describe, it, expect } from "vitest";
import { computeSceneComplexityScore, getAdaptiveStageSteps, applyAdaptiveStepsToWorkflow } from "../stepAdapter";

describe("stepAdapter (Task AD-6)", () => {
  it("should calculate complexity score and tier correctly", () => {
    const res = computeSceneComplexityScore(3, 2, false, 0); // 3 + 6 = 9 -> MODERATE
    expect(res.score).toBe(9);
    expect(res.tier).toBe("MODERATE");
  });

  it("should return adaptive steps based on complexity score", () => {
    expect(getAdaptiveStageSteps(1, 3)).toBe(20); // Simple
    expect(getAdaptiveStageSteps(1, 8)).toBe(25); // Moderate
    expect(getAdaptiveStageSteps(1, 12)).toBe(30); // Complex
  });

  it("should apply adaptive steps to workflow KSampler node", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: { steps: 20 } }
    };

    const steps = applyAdaptiveStepsToWorkflow(workflow, 3, 12);
    expect(steps).toBe(28);
    expect(workflow["8"].inputs.steps).toBe(28);
  });
});
