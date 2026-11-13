import { describe, it, expect } from "vitest";
import { MultiPassPipelineOrchestrator, CheckpointEvent, CheckpointResponse } from "../pipelineOrchestrator";
import { MultiPassPipelineConfig, StageResult } from "../../types";
import { PipelineContext } from "../stages/baseStage";
import path from "path";
import fs from "fs";

describe("MultiPassPipelineOrchestrator Checkpoint Callback Unit Tests (Task MP-11)", () => {
  it("should trigger checkpoint callback at each stage and support FAST_FORWARD action", async () => {
    const orchestrator = new MultiPassPipelineOrchestrator();
    const checkpointCalls: CheckpointEvent[] = [];

    orchestrator.setCheckpointCallback(async (event) => {
      checkpointCalls.push(event);
      return { action: "FAST_FORWARD" };
    });

    const dummyContext: PipelineContext = {
      masterSeed: 12345,
      personaKey: "RUBY",
      modelChoice: "z_image_turbo",
      unetName: "z_image_turbo_bf16.safetensors",
      width: 512,
      height: 512,
      activeLoras: [],
      faceReferenceAbsPath: "",
      referenceImageAbsPath: "",
      negativePromptText: "",
      promptText: "test prompt",
      cacheDir: path.join(process.cwd(), "scratch", "test_cache"),
      outputDir: path.join(process.cwd(), "scratch", "test_output"),
      isNsfw: false
    };

    const dummyConfig: MultiPassPipelineConfig = {
      masterSeed: 12345,
      pipelineMode: "SEQUENTIAL",
      contentMode: "SFW",
      stages: [
        { stageIndex: 1, stageName: "Environment", stagePrompt: "test prompt", denoise: 1.0, cfg: 4, steps: 1, sampler: "euler", scheduler: "karras", seed: 12345 }
      ],
      cacheEnabled: false,
      cacheDir: path.join(process.cwd(), "scratch", "test_cache")
    };

    // Pre-create fake output file for stage 1 strategy cache hit
    const runCacheSubdir = path.join(dummyContext.cacheDir, "ruby_12345");
    fs.mkdirSync(runCacheSubdir, { recursive: true });
    const fakeCacheFile = path.join(runCacheSubdir, "ruby_stage_1_seed_12345.png");
    fs.writeFileSync(fakeCacheFile, "fake image data");

    const results = await orchestrator.runPipeline(dummyContext, dummyConfig);

    expect(results.length).toBe(1);
    expect(checkpointCalls.length).toBe(1);
    expect(checkpointCalls[0].stageIndex).toBe(1);
    expect(checkpointCalls[0].stageName).toBe("Environment");
  });
});
