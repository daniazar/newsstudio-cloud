/**
 * src/lib/ai/comfy/image/stages/contactCoherenceStage.ts
 *
 * Stage 3.5 Strategy — Contact Coherence Micro-Anatomy Pass (Task CC-9).
 * Applies targeted low-denoise (0.28-0.35) inpainting over physical contact boundaries
 * (hugging, kissing, hand holding, intimate contact) to eliminate fused limbs and anatomical distortions.
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { generateContactZoneBounds } from "../contactZoneManager";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:contactCoherenceStage");

export class ContactCoherenceStage implements PipelineStage {
  readonly stageIndex = 3.5;
  readonly stageName = "Contact Coherence Micro-Anatomy";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_3_5_seed_${stageConfig.seed}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 3.5: Contact Coherence] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: 3.5,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed
      };
    }

    const startTime = Date.now();
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s3_5`;

    const contactBounds = generateContactZoneBounds(
      context.sceneModifiers || context.promptText,
      context.width,
      context.height
    );

    const contactPrompt = stageConfig.stagePrompt || `${context.promptText}, realistic skin contact, natural body weight compression, clean physical interaction boundary, detailed hands and fingers, anatomically correct body contact`;
    const contactNegPrompt = `${stageConfig.stageNegativePrompt || context.negativePromptText}, fused skin, extra fingers, melted limbs, mutated hands, floating fingers, awkward joint angle`;

    log.info(`🔄 [Stage 3.5: Contact Coherence] Executing for ${contactBounds.contactType} (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed})...`);

    const buffer = await generatePresenterImage(
      contactPrompt,
      context.faceReferenceAbsPath,
      context.currentInputImagePath || context.referenceImageAbsPath,
      context.activeLoras,
      context.width,
      context.height,
      stageConfig.denoise || 0.32,
      context.unetName,
      stageConfig.seed,
      contactNegPrompt,
      false,
      stagePrefix,
      false,
      true,
      false
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 3.5: Contact Coherence] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: 3.5,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
