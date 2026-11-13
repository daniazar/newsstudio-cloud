/**
 * src/lib/ai/comfy/image/stages/bgCompletionStage.ts
 *
 * Task EX-4 (IMAGE_ROADMAP.md Part 14).
 * Stage 2.5 (Background Completion Pass).
 * Inpaints subject placeholder zones with background continuation textures before persona insertion,
 * eliminating mask boundary halos and dark color bleed.
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:bgCompletionStage");

export class BgCompletionStage implements PipelineStage {
  readonly stageIndex = 2.5;
  readonly stageName = "Background Completion Pass";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    log.info(`🖼️ [Stage 2.5: BackgroundCompletion] Completing background pixels in subject placeholder zone (Denoise: 0.75)...`);

    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_2_5_seed_${stageConfig.seed}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 2.5: BackgroundCompletion] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: this.stageIndex,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed,
      };
    }

    const startTime = Date.now();
    const bgPrompt = `${context.promptText || ""}, continuation of background interior, seamless room geometry, matching ambient lighting`;

    const buffer = await generatePresenterImage(
      stageConfig.stagePrompt || bgPrompt,
      undefined,
      context.currentInputImagePath || context.referenceImageAbsPath,
      [],
      context.width,
      context.height,
      stageConfig.denoise || 0.75,
      context.unetName,
      stageConfig.seed,
      stageConfig.stageNegativePrompt || context.negativePromptText
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 2.5: BackgroundCompletion] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: this.stageIndex,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed,
    };
  }
}
