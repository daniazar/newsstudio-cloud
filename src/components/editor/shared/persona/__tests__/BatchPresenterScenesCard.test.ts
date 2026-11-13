import { describe, it, expect } from "vitest";
import { getAlgorithmicActionLoop } from "@/lib/types/stateMachine";

describe("BatchPresenterScenesCard logic & FSM Action Loops", () => {
  it("assigns opening welcome loop to first scene (index 0)", () => {
    const loop0 = getAlgorithmicActionLoop(0, 3, "Welcome to our store!");
    expect(loop0.loopName).toBe("ruby_intro_welcome");
    expect(loop0.label).toBe("Intro Welcome");
    expect(loop0.cameraCue).toBe("cam1_wide");
  });

  it("assigns closing sign-off loop to final scene", () => {
    const loopOutro = getAlgorithmicActionLoop(2, 3, "Order yours now at our website.");
    expect(loopOutro.loopName).toBe("ruby_signoff_outro");
    expect(loopOutro.label).toBe("Sign-Off Outro");
    expect(loopOutro.cameraCue).toBe("cam1_wide");
  });

  it("assigns emphasis and thought loops for intermediate scenes", () => {
    const loop1 = getAlgorithmicActionLoop(1, 4, "Here is the key feature you need to know.");
    expect(loop1.loopName).toBe("ruby_emphasis_nod");

    const loop2 = getAlgorithmicActionLoop(2, 4, "Think about how much time you will save.");
    expect(loop2.loopName).toBe("ruby_deep_thought_analyst");
  });

  it("safely handles edge cases like undefined, NaN, and negative indices without returning undefined", () => {
    const loopUndefined = getAlgorithmicActionLoop(undefined, undefined);
    expect(loopUndefined).toBeDefined();
    expect(loopUndefined.loopName).toBe("ruby_intro_welcome");

    const loopNaN = getAlgorithmicActionLoop(NaN, NaN);
    expect(loopNaN).toBeDefined();
    expect(loopNaN.loopName).toBe("ruby_intro_welcome");

    const loopNegative = getAlgorithmicActionLoop(-1, 5);
    expect(loopNegative).toBeDefined();
    expect(loopNegative.loopName).toBe("ruby_intro_welcome");
  });

  it("normalizes MinIO S3 presenter video URLs to local same-origin public cache path", async () => {
    const { resolvePublicVideoUrl } = await import("../BatchPresenterScenesCard");

    const minioUrl = "http://localhost:9000/news-studio/tenants/org_123/ecommerce/m1_dynamic_v1/videos/presenter_m1_dynamic_v1_1789085421884.mp4";
    expect(resolvePublicVideoUrl(minioUrl)).toBe("/assets/cache/ecommerce/presenter_m1_dynamic_v1_1789085421884.mp4");

    const webmMinioUrl = "http://localhost:9000/news-studio/tenants/org_123/ecommerce/m1_dynamic_v1/videos/presenter_m1_dynamic_v1_1789085421884.webm";
    expect(resolvePublicVideoUrl(webmMinioUrl)).toBe("/assets/cache/ecommerce/presenter_m1_dynamic_v1_1789085421884.webm");

    const alreadyPublic = "/assets/cache/ecommerce/presenter_m1_dynamic_v1_1789085421884.mp4";
    expect(resolvePublicVideoUrl(alreadyPublic)).toBe("/assets/cache/ecommerce/presenter_m1_dynamic_v1_1789085421884.mp4");

    expect(resolvePublicVideoUrl("")).toBe("");
    expect(resolvePublicVideoUrl(undefined)).toBe("");
  });

  it("recognizes Veo video scenes as having native video/lip-sync", async () => {
    const { isVideoScene } = await import("@/lib/ecommerce/voiceSynthesisCalibrator");

    const veoScene = {
      id: "scene_veo",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 240,
      sceneType: "custom_veo_hero" as const,
      headline: "Veo Scene",
      voiceoverScript: "Script",
      visualActionPrompt: "Prompt",
      primaryMediaUrl: "/storage/veo.mp4",
      customVeoVideoUrl: "/storage/veo.mp4",
    };

    const regularScene = {
      id: "scene_photo",
      sceneIndex: 1,
      startFrame: 240,
      durationFrames: 90,
      sceneType: "pattern_interrupt_hook" as const,
      headline: "Photo",
      voiceoverScript: "Script",
      visualActionPrompt: "Prompt",
      primaryMediaUrl: "/photo.png",
    };

    expect(isVideoScene(veoScene)).toBe(true);
    expect(isVideoScene(regularScene)).toBe(false);
  });
});
