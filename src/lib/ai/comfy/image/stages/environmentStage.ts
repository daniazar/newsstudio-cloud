/**
 * src/lib/ai/comfy/image/stages/environmentStage.ts
 *
 * Stage 1 Strategy — Environment & Architecture Generation.
 * Generates a pure background plate with persona & body tags stripped (Part 10 — IMAGE_ROADMAP.md).
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage, clearComfyUIMemory } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { scopePromptForStage1 } from "../promptScoper";
import { scopeLorasForStage } from "../loraManager";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:environmentStage");

export class EnvironmentStage implements PipelineStage {
  readonly stageIndex = 1;
  readonly stageName = "Environment & Architecture";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_1_seed_${stageConfig.seed}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 1: Environment & Architecture] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: 1,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed
      };
    }

    const startTime = Date.now();
    await clearComfyUIMemory();

    const personaKeys = [context.personaKey, context.partnerPersonaKey].filter(Boolean) as string[];
    const rawPrompt = stageConfig.stagePrompt || scopePromptForStage1(context.promptText, personaKeys);

    const isPony = /pony|coreshift|moody|catalyst|iniverse/i.test(context.unetName || "");
    const sceneryPrefix = isPony ? "rating_sfw, score_9, score_8_up, score_7_up, scenery, scenery_only, background_only, no_humans, empty_room, interior_design, " : "scenery, background_only, no_humans, empty_room, ";

    // Append photorealistic quality & scenery tags — forces Pony/SDXL to render empty background without characters
    const scopedPrompt = `${sceneryPrefix}${rawPrompt}, RAW photo, photorealistic, shot on 35mm lens, 8k UHD, sharp focus, natural studio lighting, architectural photography`;
    const negPrompt = `${stageConfig.stageNegativePrompt || context.negativePromptText}, 1girl, 1boy, 2girls, 2boys, female, male, woman, man, person, human, people, character, face, body, portrait, camera, dslr, camera lens, camera body, tripod, camera gear, camera equipment, close-up camera object, product shot, anime, cartoon, illustration, 3d render, painting, drawing, CGI`;
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s1`;

    log.info(`🔄 [Stage 1: Environment & Architecture] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed})...`);
    log.info(`   📜 Stage 1 Prompt: "${scopedPrompt}"`);

    const stageLoras = scopeLorasForStage(context.activeLoras, 1);

    const buffer = await generatePresenterImage(
      scopedPrompt,
      undefined, // ✅ No PuLID face injection — pure background plate
      undefined, // ✅ No img2img structure reference — full latent canvas
      stageLoras,
      context.width,
      context.height,
      stageConfig.denoise,
      context.unetName,
      stageConfig.seed,
      negPrompt,
      true, // useEmptyLatent
      stagePrefix,
      false,
      false, // ✅ No IP-Adapter
      false
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    log.info(`✅ [Stage 1: Environment & Architecture] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: 1,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
