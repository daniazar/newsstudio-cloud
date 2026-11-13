import { describe, it, expect } from "vitest";
import { injectFLUXStage1Nodes } from "../fluxLoader";

describe("fluxLoader (Task XA-2)", () => {
  it("should inject UNETLoader (fp8_e4m3fn), DualCLIPLoader, and VAELoader into workflow graph", () => {
    const workflow: Record<string, any> = {};

    const success = injectFLUXStage1Nodes(workflow, "flux1-dev-fp8.safetensors", "ae.safetensors");

    expect(success).toBe(true);
    expect(workflow["flux_unet_loader"]).toBeDefined();
    expect(workflow["flux_unet_loader"].inputs.weight_dtype).toBe("fp8_e4m3fn");
    expect(workflow["flux_dual_clip_loader"]).toBeDefined();
    expect(workflow["flux_vae_loader"]).toBeDefined();
  });
});
