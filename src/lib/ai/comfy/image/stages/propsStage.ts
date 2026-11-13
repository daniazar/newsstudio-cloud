/**
 * src/lib/ai/comfy/image/stages/propsStage.ts
 *
 * Stage 2 Strategy — Props & Foreground Elements Generation.
 * Adds set furniture, desks, and prop elements onto Stage 1 background plate (Part 10 — IMAGE_ROADMAP.md).
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage, clearComfyUIMemory } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { scopePromptForStage2 } from "../promptScoper";
import { cacheDepthMap } from "../depthExtractor";
import { scopeLorasForStage } from "../loraManager";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:propsStage");

export class PropsStage implements PipelineStage {
  readonly stageIndex = 2;
  readonly stageName = "Props & Foreground Elements";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_2_seed_${stageConfig.seed}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 2: Props & Foreground Elements] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      cacheDepthMap(stageCacheFile, context.personaKey, context.masterSeed, context.cacheDir);
      return {
        stageIndex: 2,
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
    const rawPrompt = stageConfig.stagePrompt || scopePromptForStage2(context.promptText, personaKeys);

    const isPony = /pony|coreshift|moody|catalyst|iniverse/i.test(context.unetName || "");
    const sceneryPrefix = isPony ? "rating_sfw, score_9, score_8_up, score_7_up, scenery, background_only, no_humans, broadcast_studio_set, set_furniture, " : "broadcast studio set, background_only, no_humans, set_furniture, ";

    const scopedPrompt = `${sceneryPrefix}${rawPrompt}, RAW photo, photorealistic, shot on 35mm lens, 8k UHD, sharp focus, professional interior photography`;
    const negPrompt = `${stageConfig.stageNegativePrompt || context.negativePromptText}, 1girl, 1boy, 2girls, 2boys, female, male, woman, man, person, human, people, character, face, body, portrait, camera, dslr, camera lens, camera body, tripod, camera gear, camera equipment, close-up camera object, product shot, anime, cartoon, illustration, 3d render, painting, drawing, CGI`;
    const stagePrefix = `${context.personaKey.toLowerCase()}_multipass_s2`;

    log.info(`🔄 [Stage 2: Props & Foreground Elements] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed})...`);
    log.info(`   📜 Stage 2 Prompt: "${scopedPrompt}"`);

    const stageLoras = scopeLorasForStage(context.activeLoras, 2);
    const inputImagePath = context.currentInputImagePath;
    const useEmptyLatent = !inputImagePath;

    const buffer = await generatePresenterImage(
      scopedPrompt,
      undefined, // ✅ No PuLID face injection — props-only refinement pass
      inputImagePath, // img2img from previous stage if available
      stageLoras,
      context.width,
      context.height,
      stageConfig.denoise,
      context.unetName,
      stageConfig.seed,
      negPrompt,
      useEmptyLatent, // ✅ use empty_latent_canvas (768x1344 9:16 vertical) when starting clean
      stagePrefix,
      false,
      false, // ✅ No IP-Adapter
      false
    );

    fs.mkdirSync(path.dirname(stageCacheFile), { recursive: true });
    fs.writeFileSync(stageCacheFile, buffer);
    context.currentInputImagePath = stageCacheFile;

    // Cache environment depth map for Stage 3 & 4 ControlNet Depth locking
    const depthRes = cacheDepthMap(stageCacheFile, context.personaKey, context.masterSeed, context.cacheDir);
    if (!depthRes.cached) {
      log.info(`📐 [Stage 2: ControlNet Depth] Extracted 3D depth map: ${path.basename(depthRes.depthMapPath)}`);
    }

    const elapsed = Date.now() - startTime;
    log.info(`✅ [Stage 2: Props & Foreground Elements] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: 2,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
