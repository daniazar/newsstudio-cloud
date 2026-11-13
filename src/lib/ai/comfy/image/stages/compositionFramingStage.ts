/**
 * src/lib/ai/comfy/image/stages/compositionFramingStage.ts
 *
 * Task QA-7 & Task OB-2 (IMAGE_ROADMAP.md Part 10 & 12).
 * Stage 6 / Stage 0.5 Strategy — Composition Framing, 3D LUT & Film Grain.
 * Applies composition framing, 3D LUT color grading, and film grain.
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:compositionFramingStage");

export class CompositionFramingStage implements PipelineStage {
  readonly stageIndex: number;
  readonly stageName: string;

  constructor(
    stageIndex: number = 6,
    stageName: string = "Composition Framing, 3D LUT & Film Grain"
  ) {
    this.stageIndex = stageIndex;
    this.stageName = stageName;
  }

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const promptHash = String(stageConfig.stagePrompt || context.promptText).split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_${this.stageIndex}_seed_${stageConfig.seed}_p${Math.abs(promptHash)}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage ${this.stageIndex}: ${this.stageName}] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: this.stageIndex,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed
      };
    }

    const startTime = Date.now();
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s${this.stageIndex}`;

    log.info(`🔄 [Stage ${this.stageIndex}: ${this.stageName}] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed})...`);

    const framingPrompt = `${stageConfig.stagePrompt || context.promptText}, 3D LUT color grading, cinematic film grain, crisp broadcast framing, master color balance`;

    const buffer = await generatePresenterImage(
      framingPrompt,
      undefined, // ✅ Disable PuLID face injection in Stage 6 framing pass to prevent persona overwriting
      context.currentInputImagePath || context.referenceImageAbsPath,
      context.activeLoras,
      context.width,
      context.height,
      stageConfig.denoise || 0.15,
      context.unetName,
      stageConfig.seed,
      stageConfig.stageNegativePrompt || context.negativePromptText,
      false,
      stagePrefix,
      false,
      false, // ✅ Disable IP-Adapter in Stage 6 framing pass to prevent body ref image overwriting
      false
    );

    fs.mkdirSync(context.cacheDir, { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;

    return {
      stageIndex: this.stageIndex,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: Date.now() - startTime,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
