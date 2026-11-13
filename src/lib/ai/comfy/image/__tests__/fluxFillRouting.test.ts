import { describe, it, expect } from "vitest";
import { createDefaultMultiPassConfig } from "../../../../../../scripts/image-cli/runner";
import { CliRunConfig } from "../../../../../../scripts/image-cli/types";

describe("FLUX Fill / Inpaint Workflow Routing Unit Tests (Task MP-13)", () => {
  it("should set useFluxFillInpaint: true for FLUX-based architectures (flux2, redcraft, miraclein)", () => {
    const fluxConfig: CliRunConfig = {
      personaKey: "RUBY",
      variantKey: "BODY_DRESSED",
      modelChoice: "redcraft",
      unetName: "redCraft_v30.safetensors",
      width: 1024,
      height: 1024,
      sampleCount: 1,
      activeLoras: [],
      promptText: "test prompt",
      sceneModifiers: "studio",
      negativePromptText: "",
      faceReferenceAbsPath: "",
      referenceImageAbsPath: ""
    };

    const mpConfig = createDefaultMultiPassConfig(fluxConfig, 12345);
    const stage3 = mpConfig.stages.find(s => s.stageIndex === 3);

    expect(stage3).not.toBeUndefined();
    expect(stage3?.useFluxFillInpaint).toBe(true);
  });

  it("should not set useFluxFillInpaint for non-FLUX models (z_image, pony, catalyst)", () => {
    const sdxlConfig: CliRunConfig = {
      personaKey: "RUBY",
      variantKey: "BODY_DRESSED",
      modelChoice: "z_image",
      unetName: "z_image_turbo_bf16.safetensors",
      width: 1024,
      height: 1024,
      sampleCount: 1,
      activeLoras: [],
      promptText: "test prompt",
      sceneModifiers: "studio",
      negativePromptText: "",
      faceReferenceAbsPath: "",
      referenceImageAbsPath: ""
    };

    const mpConfig = createDefaultMultiPassConfig(sdxlConfig, 12345);
    const stage3 = mpConfig.stages.find(s => s.stageIndex === 3);

    expect(stage3).not.toBeUndefined();
    expect(stage3?.useFluxFillInpaint).toBe(false);
  });
});
