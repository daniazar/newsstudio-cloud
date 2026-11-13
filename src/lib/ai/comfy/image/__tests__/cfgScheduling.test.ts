import { describe, it, expect } from "vitest";
import { applyPerStageCFGScheduling } from "../workflowMutator";

describe("applyPerStageCFGScheduling (Task QA-4)", () => {
  it("should keep full base CFG for Stage 1, 2, and 3", () => {
    const workflow: Record<string, any> = { "8": { class_type: "KSampler", inputs: { cfg: 6.0 } } };

    const s1Cfg = applyPerStageCFGScheduling(workflow, 1, 6.0);
    expect(s1Cfg).toBe(6.0);
    expect(workflow["8"].inputs.cfg).toBe(6.0);

    const s3Cfg = applyPerStageCFGScheduling(workflow, 3, 6.0);
    expect(s3Cfg).toBe(6.0);
    expect(workflow["8"].inputs.cfg).toBe(6.0);
  });

  it("should scale down CFG for Stage 3.2, 3.5, 4, and 5", () => {
    const workflow: Record<string, any> = { "8": { class_type: "KSampler", inputs: { cfg: 6.0 } } };

    const s32Cfg = applyPerStageCFGScheduling(workflow, 3.2, 6.0);
    expect(s32Cfg).toBe(4.5);

    const s4Cfg = applyPerStageCFGScheduling(workflow, 4, 6.0);
    expect(s4Cfg).toBe(3.9);

    const s5Cfg = applyPerStageCFGScheduling(workflow, 5, 6.0);
    expect(s5Cfg).toBe(3.6);
    expect(workflow["8"].inputs.cfg).toBe(3.6);
  });

  it("should enforce minimum safety floor of 2.5", () => {
    const workflow: Record<string, any> = { "8": { class_type: "KSampler", inputs: { cfg: 3.0 } } };
    const s5Cfg = applyPerStageCFGScheduling(workflow, 5, 3.0);
    expect(s5Cfg).toBe(2.5);
  });
});
