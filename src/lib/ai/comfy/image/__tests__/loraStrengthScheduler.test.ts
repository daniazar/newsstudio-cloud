import { describe, it, expect } from "vitest";
import { injectLoRAStrengthSchedulerNode } from "../loraStrengthScheduler";

describe("loraStrengthScheduler (Task QX-5)", () => {
  it("should inject LoRAStrengthScheduler node into ComfyUI workflow graph", () => {
    const workflow: Record<string, any> = {};

    const injected = injectLoRAStrengthSchedulerNode(workflow, { startWeight: 0.3, peakWeight: 0.85, endWeight: 0.5 });

    expect(injected).toBe(true);
    expect(workflow["lora_strength_scheduler"]).toBeDefined();
    expect(workflow["lora_strength_scheduler"].inputs.peak_weight).toBe(0.85);
  });
});
