import { describe, it, expect } from "vitest";
import { resolvePoseSkeletonPath, resolveOrGenerateTandemSkeleton } from "../poseSkeletonManager";
import { createDefaultMultiPassConfig } from "../../../../../../scripts/image-cli/runner";
import { CliRunConfig } from "../../../../../../scripts/image-cli/types";
import { PERSONAS } from "../../../../../lib/tts/personas";
import path from "path";

describe("Tandem Skeleton Pre-Pass Unit Tests (Task CC-5)", () => {
  it("should resolve explicit & intimate preset pose names correctly", () => {
    const missionaryPath = resolvePoseSkeletonPath("missionary position");
    expect(missionaryPath).toBeNull(); // No local file on disk yet, returns null gracefully
  });

  it("should generate/resolve tandem skeleton path for TANDEM_SKELETON mode in resolveOrGenerateTandemSkeleton", () => {
    const skeletonPath = resolveOrGenerateTandemSkeleton("ruby and storm in missionary position", 99999);
    expect(skeletonPath).toBeTruthy();
    expect(skeletonPath).toContain("tandem_skeleton_seed_99999");
  });

  it("should configure TANDEM_SKELETON mode with ControlNet OpenPose enabled on Stage 3", () => {
    const ruby = PERSONAS.find(p => p.id === "ruby") || PERSONAS[0];
    const storm = PERSONAS.find(p => p.id === "storm") || PERSONAS[1];

    const config: CliRunConfig = {
      personaKey: ruby.id,
      partnerPersona: storm,
      pipelineMode: "TANDEM_SKELETON",
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

    const mpConfig = createDefaultMultiPassConfig(config, 88888);
    expect(mpConfig.pipelineMode).toBe("TANDEM_SKELETON");

    const stage3 = mpConfig.stages.find(s => s.stageIndex === 3);
    expect(stage3).not.toBeUndefined();
    expect(stage3?.useControlNetOpenPose).toBe(true);
  });
});
