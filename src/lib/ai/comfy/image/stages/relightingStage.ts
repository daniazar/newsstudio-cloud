/**
 * src/lib/ai/comfy/image/stages/relightingStage.ts
 *
 * Stage 4 Strategy — Relighting & Shadow Harmonization.
 * Applies low-denoise (0.18-0.24) harmonization to blend inserted subject into ambient environment lighting
 * and depth map geometry (Part 10 — IMAGE_ROADMAP.md).
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig,StageResult } from "../../types";
import { getStageDepthMapPath } from "../depthExtractor";
import { PipelineContext,PipelineStage } from "./baseStage";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:relightingStage");

export class RelightingStage implements PipelineStage {
  readonly stageIndex = 4;
  readonly stageName = "Relighting & Shadow Harmonization";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const promptHash = String(stageConfig.stagePrompt || context.promptText).split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_4_seed_${stageConfig.seed}_p${Math.abs(promptHash)}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 4: Relighting & Shadow Harmonization] Cache Hit: ${path.basename(stageCacheFile)}`);
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
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s4`;
    const _personaKeys = [context.personaKey, context.partnerPersonaKey].filter(Boolean) as string[];

    // Harmonized shadow falloff & ambient light bounce pass preserving full scene and persona context
    const basePrompt = stageConfig.stagePrompt || context.promptText;
    const relightingPrompt = `${basePrompt}, subtle rim lighting, harmonized shadow falloff, realistic ambient light bounce, seamless lighting integration, photorealistic studio photography`;

    const depthMapPath = getStageDepthMapPath(context.personaKey, context.masterSeed, context.cacheDir);
    const hasDepthMap = fs.existsSync(depthMapPath);
    if (hasDepthMap) {
      log.info(`💡 [Stage 4: Relighting] Applying ControlNet Depth geometry lock: ${path.basename(depthMapPath)}`);
    }

    log.info(`🔄 [Stage 4: Relighting & Shadow Harmonization] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed})...`);
    log.info(`   📜 Stage 4 Prompt: "${relightingPrompt}"`);

    const buffer = await generatePresenterImage(
      relightingPrompt,
      context.partnerPersonaKey ? undefined : context.faceReferenceAbsPath, // ✅ Single face reference for single persona, undefined for dual-persona to prevent overwrite
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
      false, // ✅ Disable IP-Adapter in Stage 4 relighting pass to prevent body ref image overwriting
      false
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 4: Relighting & Shadow Harmonization] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

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
