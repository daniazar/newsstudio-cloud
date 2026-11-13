import { describe, it, expect, vi, beforeEach } from "vitest";
import { BgCompletionStage } from "../stages/bgCompletionStage";
import * as comfyClient from "../../../comfyClient";
import fs from "fs";
import path from "path";

vi.mock("../../../comfyClient", () => ({
  generatePresenterImage: vi.fn().mockResolvedValue(Buffer.from("fake-bg-completion-buffer"))
}));

describe("BgCompletionStage (Task EX-4)", () => {
  const testCacheDir = path.join(process.cwd(), "scratch", "test_cache_bg");

  beforeEach(() => {
    vi.clearAllMocks();
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  it("should execute Stage 2.5 background completion pass at denoise 0.75", async () => {
    const stage = new BgCompletionStage();
    expect(stage.stageIndex).toBe(2.5);
    expect(stage.stageName).toContain("Background Completion Pass");

    const context: any = {
      personaKey: "ruby",
      modelChoice: "z_image",
      unetName: "z_image_turbo_bf16.safetensors",
      width: 1024,
      height: 1024,
      promptText: "hotel lounge bar interior",
      cacheDir: testCacheDir,
      activeLoras: [],
      currentInputImagePath: "ruby_stage_2_seed_12345.png"
    };

    const stageConfig: any = {
      stageIndex: 2.5,
      stageName: "Background Completion Pass",
      stagePrompt: "hotel lounge bar interior",
      denoise: 0.75,
      seed: 12345
    };

    const res = await stage.execute(context, stageConfig);

    expect(res.stageIndex).toBe(2.5);
    expect(comfyClient.generatePresenterImage).toHaveBeenCalled();
  });
});
