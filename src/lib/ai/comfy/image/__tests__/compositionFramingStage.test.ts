import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { CompositionFramingStage } from "../stages/compositionFramingStage";
import * as comfyClient from "../../../comfyClient";

vi.mock("../../../comfyClient", () => ({
  generatePresenterImage: vi.fn().mockResolvedValue(Buffer.from("fake_png"))
}));

describe("CompositionFramingStage (Task QA-7 & Task OB-2)", () => {
  const testDir = path.join(process.cwd(), "scratch", "test_framing");

  beforeEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should execute CompositionFramingStage with default stageIndex 6 for final framing pass", async () => {
    const stage = new CompositionFramingStage();
    expect(stage.stageIndex).toBe(6);
    expect(stage.stageName).toBe("Composition Framing, 3D LUT & Film Grain");

    const context: any = {
      masterSeed: 12345,
      personaKey: "ruby",
      unetName: "z_image_turbo_bf16.safetensors",
      modelChoice: "z_image",
      width: 1024,
      height: 1024,
      activeLoras: [],
      promptText: "cyberpunk newsroom broadcast studio",
      cacheDir: testDir,
      outputDir: testDir
    };

    const stageConfig: any = {
      stageIndex: 6,
      stageName: "Composition Framing, 3D LUT & Film Grain",
      stagePrompt: "cyberpunk newsroom broadcast studio",
      denoise: 0.15,
      cfg: 4.0,
      seed: 12345
    };

    const res = await stage.execute(context, stageConfig);
    expect(res.stageIndex).toBe(6);
    expect(res.cached).toBe(false);
    expect(comfyClient.generatePresenterImage).toHaveBeenCalled();
  });

  it("should execute CompositionFramingStage with stageIndex 0.5 for pre-pass when specified", () => {
    const stage = new CompositionFramingStage(0.5, "Composition Framing Pre-Pass");
    expect(stage.stageIndex).toBe(0.5);
    expect(stage.stageName).toBe("Composition Framing Pre-Pass");
  });
});
