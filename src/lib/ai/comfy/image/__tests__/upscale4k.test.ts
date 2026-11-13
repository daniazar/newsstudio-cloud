import { describe, it, expect } from "vitest";
import { injectUltimate4KUpscaleStage } from "../upscale4k";

describe("upscale4k (Task PR-14)", () => {
  it("should inject UltimateSDUpscale and UpscaleModelLoader nodes into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "VAEDecode", inputs: {} }
    };

    const success = injectUltimate4KUpscaleStage(workflow, "8", 0.25);

    expect(success).toBe(true);
    expect(workflow["ultimate_upscale_model_loader"]).toBeDefined();
    expect(workflow["ultimate_sd_upscale"]).toBeDefined();
    expect(workflow["ultimate_sd_upscale"].inputs.upscale_by).toBe(4);
    expect(workflow["ultimate_sd_upscale"].inputs.denoise).toBe(0.25);
  });
});
