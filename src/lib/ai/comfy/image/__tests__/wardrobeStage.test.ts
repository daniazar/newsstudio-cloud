import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { WardrobeStage } from "../stages/wardrobeStage";
import { PipelineContext } from "../stages/baseStage";
import { StageConfig } from "../../types";

vi.mock("../../../comfyClient", () => ({
  generatePresenterImage: vi.fn().mockResolvedValue(Buffer.from("fake-wardrobe-image-buffer"))
}));

describe("WardrobeStage (Task CC-7B)", () => {
  const testCacheDir = path.join(process.cwd(), "scratch", "test_wardrobe_cache");

  beforeEach(() => {
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testCacheDir, { recursive: true });
  });

  it("should execute WardrobeStage and save cache file with stageIndex 3.2", async () => {
    const stage = new WardrobeStage();
    const currentImgPath = path.join(testCacheDir, "ruby_stage_3.png");
    const context: PipelineContext = {
      personaKey: "RUBY",
      promptText: "Ruby Vance wearing a dark navy formal news anchor blazer",
      width: 1024,
      height: 1024,
      masterSeed: 12345,
      cacheDir: testCacheDir,
      outputDir: testCacheDir,
      modelChoice: "z_image",
      unetName: "z_image_turbo_bf16.safetensors",
      activeLoras: [],
      isNsfw: false,
      currentInputImagePath: currentImgPath
    };

    fs.writeFileSync(currentImgPath, Buffer.from("fake-stage-3-buffer"));

    const config: StageConfig = {
      stageIndex: 3.2,
      stageName: "Wardrobe & Outfit Styling",
      stagePrompt: "Ruby Vance wearing a dark navy formal news anchor blazer",
      denoise: 0.38,
      cfg: 4.0,
      steps: 20,
      sampler: "dpmpp_2m",
      scheduler: "karras",
      seed: 12346
    };

    const result = await stage.execute(context, config);
    expect(result.stageIndex).toBe(3.2);
    expect(result.cached).toBe(false);
    expect(fs.existsSync(result.imagePath)).toBe(true);
  });
});
