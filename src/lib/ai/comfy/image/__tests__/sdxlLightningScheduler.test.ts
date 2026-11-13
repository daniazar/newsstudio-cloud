import { describe, it, expect } from "vitest";
import { injectSDXLLightningConfig } from "../sdxlLightningScheduler";

describe("sdxlLightningScheduler (Task EV-5)", () => {
  it("should configure KSampler nodes for 4-step Lightning sampling when Lightning LoRA detected", () => {
    const workflow: Record<string, any> = {
      sampler_1: {
        class_type: "KSampler",
        inputs: { steps: 20, cfg: 7.0 }
      }
    };

    const res = injectSDXLLightningConfig(workflow, [{ name: "sdxl_lightning_4step.safetensors", strength: 1.0 }]);

    expect(res.isLightningActive).toBe(true);
    expect(res.steps).toBe(4);
    expect(workflow.sampler_1.inputs.steps).toBe(4);
    expect(workflow.sampler_1.inputs.cfg).toBe(1.0);
    expect(workflow.sampler_1.inputs.sampler_name).toBe("euler");
  });

  it("should preserve standard sampling parameters when Lightning LoRA is absent", () => {
    const workflow: Record<string, any> = {};

    const res = injectSDXLLightningConfig(workflow, [{ name: "ruby_char.safetensors", strength: 0.8 }]);

    expect(res.isLightningActive).toBe(false);
    expect(res.steps).toBe(20);
  });
});
