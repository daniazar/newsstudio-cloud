import { describe, it, expect } from "vitest";
import { injectVAEArchitectureBridge } from "../vaeBridge";

describe("vaeBridge (Task XA-3)", () => {
  it("should inject FLUX VAEDecode, SDXL VAELoader, and VAEEncode bridge nodes into workflow graph", () => {
    const workflow: Record<string, any> = {
      "flux_ksampler": { class_type: "KSampler", inputs: {} },
      "8": { class_type: "KSampler", inputs: {} }
    };

    const success = injectVAEArchitectureBridge(workflow, "flux_ksampler", 0.60);

    expect(success).toBe(true);
    expect(workflow["flux_vae_decode"]).toBeDefined();
    expect(workflow["sdxl_fp32_vae_loader"]).toBeDefined();
    expect(workflow["sdxl_vae_encode_bridge"]).toBeDefined();
    expect(workflow["8"].inputs.latent_image).toEqual(["sdxl_vae_encode_bridge", 0]);
    expect(workflow["8"].inputs.denoise).toBe(0.60);
  });
});
