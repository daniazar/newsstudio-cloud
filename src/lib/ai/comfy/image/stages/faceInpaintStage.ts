/**
 * src/lib/ai/comfy/image/stages/faceInpaintStage.ts
 *
 * Stage 4A / 4B Strategy — Hybrid Mode Isolated Per-Face PuLID Inpaint Pass (Task CC-4 — IMAGE_ROADMAP.md).
 * Inpaints target persona's face region at low denoise (0.35) to refine facial identity without altering body pose or shared geometry.
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { createPersonaMaskRegion } from "../personaMasker";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:faceInpaintStage");

export class FaceInpaintStage implements PipelineStage {
  readonly stageIndex = 4;
  readonly stageName: string;
  readonly personaIndex: number;
  readonly totalPersonas: number;

  constructor(stageName: string = "Per-Face PuLID Inpaint", personaIndex: number = 0, totalPersonas: number = 2) {
    this.stageName = stageName;
    this.personaIndex = personaIndex;
    this.totalPersonas = totalPersonas;
  }

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const stageSuffix = `4_${this.personaIndex === 0 ? "a" : "b"}`;
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_${stageSuffix}_seed_${stageConfig.seed}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 4: ${this.stageName}] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: 4,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed
      };
    }

    const startTime = Date.now();
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s${stageSuffix}`;
    const maskRegion = createPersonaMaskRegion(context.width, context.height, this.personaIndex, this.totalPersonas);

    log.info(`🔄 [Stage 4: ${this.stageName}] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed}, FaceMask: X[${maskRegion.pixelXMin}-${maskRegion.pixelXMin + maskRegion.pixelWidth}])...`);

    const buffer = await generatePresenterImage(
      stageConfig.stagePrompt || context.promptText,
      context.faceReferenceAbsPath,
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
      false,
      true,
      false
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 4: ${this.stageName}] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: 4,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
