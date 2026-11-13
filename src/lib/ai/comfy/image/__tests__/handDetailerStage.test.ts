import { describe, it, expect, vi, beforeEach } from "vitest";
import { HandDetailerStage, shouldTriggerHandDetailer } from "../stages/handDetailerStage";
import * as comfyClient from "../../../comfyClient";
import fs from "fs";
import path from "path";

vi.mock("../../../comfyClient", () => ({
  generatePresenterImage: vi.fn().mockResolvedValue(Buffer.from("fake-hand-image-buffer"))
}));

describe("HandDetailerStage (Task QA-9)", () => {
  const testCacheDir = path.join(process.cwd(), "scratch", "test_cache_hand");

  beforeEach(() => {
    vi.clearAllMocks();
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  it("should detect hand interaction keywords accurately in shouldTriggerHandDetailer", () => {
    expect(shouldTriggerHandDetailer("holding a whiskey glass")).toBe(true);
    expect(shouldTriggerHandDetailer("hands on desk writing notes")).toBe(true);
    expect(shouldTriggerHandDetailer("empty newsroom broadcast studio")).toBe(false);
  });

  it("should execute HandDetailerStage when hand interaction keywords are present", async () => {
    const stage = new HandDetailerStage();
    expect(stage.stageIndex).toBe(6);
    expect(stage.stageName).toContain("Hand & Anatomy Detailer");

    const context: any = {
      personaKey: "ruby",
      modelChoice: "z_image",
      unetName: "z_image_turbo_bf16.safetensors",
      width: 1024,
      height: 1024,
      masterSeed: 12345,
      cacheDir: testCacheDir,
      activeLoras: [],
      promptText: "holding a microphone",
      negativePromptText: "blurry",
      currentInputImagePath: "ruby_stage_5_seed_12345.png"
    };

    const stageConfig: any = {
      stageIndex: 6,
      stageName: "Hand & Anatomy Detailer",
      stagePrompt: "holding a microphone",
      denoise: 0.28,
      seed: 12345
    };

    const res = await stage.execute(context, stageConfig);
    expect(res.stageIndex).toBe(6);
    expect(comfyClient.generatePresenterImage).toHaveBeenCalled();
  });
});
