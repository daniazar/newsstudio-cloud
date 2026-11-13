import { describe, it, expect } from "vitest";
import { getHiResFixStageDimensions, injectESRGANUpscaleNode } from "../hiresFix";

describe("hiresFix (Task PR-6)", () => {
  it("should return 512x512 low-res dimensions for Stages 1, 2, 3 and flag upscale required after Stage 3", () => {
    const s1 = getHiResFixStageDimensions(1, 1024, 1024, true);
    expect(s1.width).toBe(512);
    expect(s1.height).toBe(512);
    expect(s1.isLowResPhase).toBe(true);
    expect(s1.upscaleRequiredAfterStage).toBe(false);

    const s3 = getHiResFixStageDimensions(3, 1024, 1024, true);
    expect(s3.width).toBe(512);
    expect(s3.upscaleRequiredAfterStage).toBe(true);
  });

  it("should return 1024x1024 full resolution for Stages 4, 5, 6", () => {
    const s4 = getHiResFixStageDimensions(4, 1024, 1024, true);
    expect(s4.width).toBe(1024);
    expect(s4.isLowResPhase).toBe(false);
  });

  it("should inject 4x-UltraSharp ESRGAN upscale node into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "VAEDecode", inputs: {} }
    };

    const success = injectESRGANUpscaleNode(workflow, "8");
    expect(success).toBe(true);
    expect(workflow["esrgan_upscale_model_loader"]).toBeDefined();
    expect(workflow["esrgan_image_upscale"]).toBeDefined();
    expect(workflow["esrgan_image_upscale"].inputs.image).toEqual(["8", 0]);
  });
});
