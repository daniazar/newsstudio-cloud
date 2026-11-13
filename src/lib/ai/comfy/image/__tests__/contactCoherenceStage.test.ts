import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { ContactCoherenceStage } from "../stages/contactCoherenceStage";
import { PipelineContext } from "../stages/baseStage";
import { StageConfig } from "../../types";

vi.mock("../../../comfyClient", () => ({
  generatePresenterImage: vi.fn().mockResolvedValue(Buffer.from("fake-contact-coherence-buffer"))
}));

describe("ContactCoherenceStage (Task CC-9)", () => {
  const testCacheDir = path.join(process.cwd(), "scratch", "test_contact_coherence_cache");

  beforeEach(() => {
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testCacheDir, { recursive: true });
  });

  it("should execute ContactCoherenceStage and save cache file with stageIndex 3.5", async () => {
    const stage = new ContactCoherenceStage();
    const currentImgPath = path.join(testCacheDir, "ruby_stage_3.png");
    const context: PipelineContext = {
      personaKey: "RUBY",
      promptText: "two personas hugging intimately on sofa",
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
      stageIndex: 3.5,
      stageName: "Contact Coherence Micro-Anatomy",
      stagePrompt: "two personas hugging intimately on sofa",
      denoise: 0.32,
      cfg: 4.0,
      steps: 20,
      sampler: "dpmpp_2m",
      scheduler: "karras",
      seed: 12347
    };

    const result = await stage.execute(context, config);
    expect(result.stageIndex).toBe(3.5);
    expect(result.cached).toBe(false);
    expect(fs.existsSync(result.imagePath)).toBe(true);
  });
});
