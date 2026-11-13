import { describe, it, expect } from "vitest";
import { createDefaultMultiPassConfig } from "../../../../../../scripts/image-cli/runner";
import { CliRunConfig } from "../../../../../../scripts/image-cli/types";
import { PERSONAS } from "../../../../../lib/tts/personas";

describe("HYBRID Mode Per-Face PuLID Inpaint Unit Tests (Task CC-4)", () => {
  it("should generate Stage 4A and Stage 4B face inpaint stage configs in HYBRID mode", () => {
    const ruby = PERSONAS.find(p => p.id === "ruby") || PERSONAS[0];
    const storm = PERSONAS.find(p => p.id === "storm") || PERSONAS[1];

    const config: CliRunConfig = {
      personaKey: ruby.id,
      partnerPersona: storm,
      pipelineMode: "HYBRID",
      variantKey: "BODY_UNCENSORED",
      modelChoice: "z_image",
      unetName: "z_image_turbo_bf16.safetensors",
      width: 1024,
      height: 1024,
      sampleCount: 1,
      activeLoras: [],
      promptText: "ruby and storm leaning close, shoulder touching",
      sceneModifiers: "leaning close, shoulder touching",
      negativePromptText: "",
      faceReferenceAbsPath: "",
      referenceImageAbsPath: ""
    };

    const mpConfig = createDefaultMultiPassConfig(config, 12345);
    expect(mpConfig.pipelineMode).toBe("HYBRID");

    const faceInpaintStages = mpConfig.stages.filter(s => s.stageName.includes("Face Inpaint"));
    expect(faceInpaintStages.length).toBe(2);
    expect(faceInpaintStages[0].stageName).toContain("Primary");
    expect(faceInpaintStages[1].stageName).toContain("Partner");
    expect(faceInpaintStages[0].denoise).toBe(0.35);
    expect(faceInpaintStages[1].denoise).toBe(0.35);
  });
});
