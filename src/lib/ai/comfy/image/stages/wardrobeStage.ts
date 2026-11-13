/**
 * src/lib/ai/comfy/image/stages/wardrobeStage.ts
 *
 * Stage 3.2 Strategy — Dedicated Wardrobe & Outfit Styling Pass (Task CC-7B).
 * Executes targeted low-denoise (0.35-0.42) clothing & fabric inpainting over the torso region,
 * refining suit, blazer, costume, or fashion details without distorting facial identity.
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:wardrobeStage");

export class WardrobeStage implements PipelineStage {
  readonly stageIndex = 3.2;
  readonly stageName = "Wardrobe & Outfit Styling";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_3_2_seed_${stageConfig.seed}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 3.2: Wardrobe & Outfit Styling] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: 3.2,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed
      };
    }

    const startTime = Date.now();
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s3_2`;

    // Compile dedicated outfit & fabric prompt
    const attirePrompt = stageConfig.stagePrompt || `${context.promptText}, detailed clothing fabrics, sharp seam stitching, high quality tailored outfit, photorealistic clothing texture`;

    log.info(`🔄 [Stage 3.2: Wardrobe & Outfit Styling] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed})...`);
    log.info(`   📜 Stage 3.2 Prompt: "${attirePrompt}"`);

    const buffer = await generatePresenterImage(
      attirePrompt,
      context.faceReferenceAbsPath,
      context.currentInputImagePath || context.referenceImageAbsPath,
      context.activeLoras,
      context.width,
      context.height,
      stageConfig.denoise || 0.38,
      context.unetName,
      stageConfig.seed,
      `${stageConfig.stageNegativePrompt || context.negativePromptText}, (text, logo, brand name, typography, printed text on clothes, text badge:1.5)`,
      false,
      stagePrefix,
      false,
      false, // ✅ Disable IP-Adapter in Stage 3.2 wardrobe pass to prevent dual-persona scene collapsing
      false
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 3.2: Wardrobe & Outfit Styling] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: 3.2,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
