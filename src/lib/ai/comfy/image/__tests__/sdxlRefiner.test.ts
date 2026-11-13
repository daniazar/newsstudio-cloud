import { describe, it, expect } from "vitest";
import { injectSDXLRefinerPass } from "../sdxlRefiner";

describe("sdxlRefiner (Task AD-7)", () => {
  it("should inject CheckpointLoaderSimple and KSamplerAdvanced refiner nodes into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: {} }
    };

    const success = injectSDXLRefinerPass(workflow, "8", 22, 30);

    expect(success).toBe(true);
    expect(workflow["refiner_checkpoint_loader"]).toBeDefined();
    expect(workflow["sdxl_refiner_ksampler"]).toBeDefined();
    expect(workflow["sdxl_refiner_ksampler"].inputs.start_at_step).toBe(22);
    expect(workflow["sdxl_refiner_ksampler"].inputs.add_noise).toBe("disable");
  });
});
