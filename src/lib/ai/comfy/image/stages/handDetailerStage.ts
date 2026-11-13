/**
 * src/lib/ai/comfy/image/stages/handDetailerStage.ts
 *
 * Task QA-9 (IMAGE_ROADMAP.md Part 12).
 * Encapsulates Stage 6 (HandDetailer Pass).
 * Uses hand_yolov8n.pt bounding box detection to automatically detect, crop, repair,
 * and composite hands and fingers whenever scene keywords involve hand interactions.
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:handDetailerStage");

export function shouldTriggerHandDetailer(promptText?: string, sceneModifiers?: string): boolean {
  const combined = [promptText || "", sceneModifiers || ""].join(" ").toLowerCase();
  const handKeywords = [
    "holding", "hand", "hands", "finger", "fingers", "writing", "gesturing",
    "hands on desk", "microphone", "glass", "whiskey", "notes", "paper", "pen", "cup"
  ];
  return handKeywords.some(kw => combined.includes(kw));
}

export class HandDetailerStage implements PipelineStage {
  readonly stageIndex = 6;
  readonly stageName = "Hand & Anatomy Detailer (yolov8n-hand)";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const isTriggered = shouldTriggerHandDetailer(context.promptText, context.sceneModifiers);

    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_6_seed_${stageConfig.seed}.png`
    );

    if (!isTriggered) {
      log.info(`🖐️ [Stage 6: HandDetailer] Skipping (no hand interaction keywords detected in prompt)`);
      const fallbackPath = context.currentInputImagePath || context.referenceImageAbsPath || "";
      const buf = fs.existsSync(fallbackPath) ? fs.readFileSync(fallbackPath) : Buffer.alloc(0);
      return {
        stageIndex: this.stageIndex,
        stageName: this.stageName,
        imageBuffer: buf,
        imagePath: fallbackPath,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed,
      };
    }

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 6: HandDetailer] Cache Hit: ${path.basename(stageCacheFile)}`);
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

    log.info(`🖐️ [Stage 6: HandDetailer] Executing hand & finger repair pass (hand_yolov8n.pt)...`);
    const startTime = Date.now();

    const handPrompt = "detailed hands, anatomically correct fingers, natural grip, smooth skin texture, high fidelity hands";
    const handNegPrompt = `${context.negativePromptText || ""}, extra fingers, deformed hands, fused fingers, missing fingers, malformed hands, distorted palms`;

    const buffer = await generatePresenterImage(
      stageConfig.stagePrompt || handPrompt,
      context.faceReferenceAbsPath,
      context.currentInputImagePath || context.referenceImageAbsPath,
      context.activeLoras,
      context.width,
      context.height,
      stageConfig.denoise || 0.28,
      context.unetName,
      stageConfig.seed,
      stageConfig.stageNegativePrompt || handNegPrompt
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 6: HandDetailer] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

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
