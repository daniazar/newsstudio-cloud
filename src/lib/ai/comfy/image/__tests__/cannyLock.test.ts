import { describe, it, expect } from "vitest";
import { getStageCannyStrength, injectControlNetCannyLock } from "../cannyLock";

describe("cannyLock (Task PR-9)", () => {
  it("should return optimal stage Canny strength", () => {
    expect(getStageCannyStrength(3.5)).toBe(0.50);
    expect(getStageCannyStrength(4)).toBe(0.35);
    expect(getStageCannyStrength(5)).toBe(0.25);
    expect(getStageCannyStrength(1)).toBe(0.0);
  });

  it("should inject Canny Edge preprocessor and ControlNet nodes for Stage 4", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "VAEDecode", inputs: {} }
    };

    const success = injectControlNetCannyLock(workflow, 4, "8");

    expect(success).toBe(true);
    expect(workflow["canny_preprocessor"]).toBeDefined();
    expect(workflow["canny_controlnet_apply"]).toBeDefined();
    expect(workflow["canny_controlnet_apply"].inputs.strength).toBe(0.35);
  });

  it("should return false for stageIndex 1 where strength is 0.0", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "VAEDecode", inputs: {} }
    };
    const success = injectControlNetCannyLock(workflow, 1, "8");
    expect(success).toBe(false);
  });
});
