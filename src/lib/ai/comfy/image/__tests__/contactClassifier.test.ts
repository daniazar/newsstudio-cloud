import { describe, it, expect } from "vitest";
import { computeInteractionIntensity, selectPipelineMode } from "../interactionDetector";
import { createDefaultMultiPassConfig } from "../../../../../../scripts/image-cli/runner";
import { CliRunConfig } from "../../../../../../scripts/image-cli/types";

describe("Scene Contact Intensity Scoring & Mode Selection Unit Tests (Tasks CC-1, CC-2, CC-3)", () => {
  it("should calculate exact interaction intensity scores per contact tier", () => {
    // Tier 1: Full contact (71-100) -> 85
    expect(computeInteractionIntensity("missionary position intercourse")).toBe(85);
    expect(computeInteractionIntensity("doggystyle penetration")).toBe(85);

    // Tier 2: Moderate contact (41-70) -> 55
    expect(computeInteractionIntensity("passionate kissing and hugging")).toBe(55);
    expect(computeInteractionIntensity("kneeling submissive pose")).toBe(85); // kneeling submissive matches fullContact

    // Tier 3: Soft contact (21-40) -> 30
    expect(computeInteractionIntensity("leaning toward each other, side by side")).toBe(30);

    // Tier 4: No contact (0-20) -> 5
    expect(computeInteractionIntensity("sitting at news desk, separate chairs")).toBe(5);
  });

  it("should map numerical intensity scores to correct pipeline mode enums", () => {
    expect(selectPipelineMode(85)).toBe("TANDEM_SKELETON");
    expect(selectPipelineMode(55)).toBe("SIMULTANEOUS");
    expect(selectPipelineMode(30)).toBe("HYBRID");
    expect(selectPipelineMode(5)).toBe("SEQUENTIAL");
  });

  it("should calculate interactionIntensityScore automatically in createDefaultMultiPassConfig", () => {
    const config: CliRunConfig = {
      personaKey: "RUBY",
      variantKey: "BODY_UNCENSORED",
      modelChoice: "z_image",
      unetName: "z_image_turbo_bf16.safetensors",
      width: 1024,
      height: 1024,
      sampleCount: 1,
      activeLoras: [],
      promptText: "ruby and storm in missionary position intercourse",
      sceneModifiers: "missionary position intercourse",
      negativePromptText: "",
      faceReferenceAbsPath: "",
      referenceImageAbsPath: ""
    };

    const mpConfig = createDefaultMultiPassConfig(config, 12345);
    expect(mpConfig.interactionIntensityScore).toBe(85);
  });
});
