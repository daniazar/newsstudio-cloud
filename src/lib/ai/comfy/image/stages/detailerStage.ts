/**
 * src/lib/ai/comfy/image/stages/detailerStage.ts
 *
 * Stage 5 Strategy — Micro-Anatomy & FaceDetailer.
 * Refines facial micro-details, skin texture, and iris clarity (Part 10 — IMAGE_ROADMAP.md).
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:detailerStage");

export class DetailerStage implements PipelineStage {
  readonly stageIndex = 5;
  readonly stageName = "Micro-Anatomy & FaceDetailer";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const promptHash = String(stageConfig.stagePrompt || context.promptText).split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_5_seed_${stageConfig.seed}_p${Math.abs(promptHash)}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 5: Micro-Anatomy & FaceDetailer] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: 5,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed
      };
    }

    const startTime = Date.now();
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s5`;

    const detailerPrompt = stageConfig.stagePrompt || context.promptText;
    log.info(`🔄 [Stage 5: Micro-Anatomy & FaceDetailer] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed})...`);
    log.info(`   📜 Stage 5 Prompt: "${detailerPrompt}"`);

    const buffer = await generatePresenterImage(
      stageConfig.stagePrompt || context.promptText,
      context.partnerPersonaKey ? undefined : context.faceReferenceAbsPath,
      context.currentInputImagePath || context.referenceImageAbsPath,
      context.activeLoras,
      context.width,
      context.height,
      stageConfig.denoise,
      context.unetName,
      stageConfig.seed,
      stageConfig.stageNegativePrompt || context.negativePromptText,
      false,
      stagePrefix,
      true, // enable FaceDetailer pass
      true,
      false
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 5: Micro-Anatomy & FaceDetailer] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: 5,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
