import { describe, it, expect } from "vitest";
import { getStageMultiControlNetChain, injectMultiControlNetChain } from "../multiControlNetChain";

describe("multiControlNetChain (Task AD-5)", () => {
  it("should return optimal Multi-ControlNet specs and enforce <= 1.15 weight budget for Stage 3", () => {
    const res = getStageMultiControlNetChain(3);

    expect(res.specs.length).toBe(3);
    expect(res.totalWeight).toBe(1.15); // 0.55 + 0.35 + 0.25 = 1.15
  });

  it("should inject ControlNetApplyAdvanced and ConditioningCombine nodes into workflow graph", () => {
    const workflow: Record<string, any> = {};

    const success = injectMultiControlNetChain(workflow, 3);

    expect(success).toBe(true);
    expect(workflow["multi_cn_combine"]).toBeDefined();
    expect(workflow["multi_cn_combine"].class_type).toBe("ConditioningCombine");
  });
});
