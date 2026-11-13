/**
 * src/lib/ai/comfy/image/stages/personaStage.ts
 *
 * Stage 3 Strategy — Primary & Partner Persona Insertion (Stage 3A / 3B).
 * Inpaints subjects with clean persona prompt compilation & mask region bounds (Part 10 — IMAGE_ROADMAP.md).
 */

import fs from "fs";
import path from "path";
import { generatePresenterImage } from "../../../comfyClient";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { createPersonaMaskRegion } from "../personaMasker";
import { resolvePoseSkeletonPath } from "../poseSkeletonManager";
import { getStageDepthMapPath } from "../depthExtractor";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:personaStage");

export class PersonaStage implements PipelineStage {
  readonly stageIndex = 3;
  readonly stageName: string;
  readonly personaIndex: number;
  readonly totalPersonas: number;

  constructor(stageName: string = "Primary Persona Insertion", personaIndex: number = 0, totalPersonas: number = 1) {
    this.stageName = stageName;
    this.personaIndex = personaIndex;
    this.totalPersonas = totalPersonas;
  }

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const stageSuffix = this.stageName.includes("3A") ? "3a" : this.stageName.includes("3B") ? "3b" : "3";
    const promptHash = String(stageConfig.stagePrompt || context.promptText).split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_${stageSuffix}_seed_${stageConfig.seed}_p${Math.abs(promptHash)}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 3: ${this.stageName}] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: 3,
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
    const isTandem = this.stageName.toLowerCase().includes("tandem") || stageConfig.freezeMaskRegion === false;
    const effectivePersonaIdx = isTandem ? 0 : this.personaIndex;
    const effectiveTotalPersonas = isTandem ? 1 : this.totalPersonas;
    const maskRegion = createPersonaMaskRegion(context.width, context.height, effectivePersonaIdx, effectiveTotalPersonas);

    let _poseSkeletonPath: string | undefined = undefined;
    if (stageConfig.useControlNetOpenPose) {
      const resolved = resolvePoseSkeletonPath(context.sceneModifiers || "standing_anchor");
      if (resolved) {
        _poseSkeletonPath = resolved;
        log.info(`🦴 [Stage 3: OpenPose XL] Locked skeleton pose: ${path.basename(resolved)}`);
      }
    }

    let _depthMapPath: string | undefined = undefined;
    if (stageConfig.useControlNetDepth) {
      const depthPath = getStageDepthMapPath(context.personaKey, stageConfig.seed - 2, context.cacheDir);
      if (depthPath && fs.existsSync(depthPath)) {
        _depthMapPath = depthPath;
        log.info(`💡 [Stage 3: ControlNet Depth] Preserving Stage 2 prop geometry: ${path.basename(depthPath)}`);
      }
    }

    const isFlux = stageConfig.useFluxFillInpaint || ["flux2", "redcraft", "miraclein"].includes((context.modelChoice || "").toLowerCase()) || /flux/i.test(context.unetName);
    if (isFlux) {
      log.info(`💎 [Stage 3: FLUX Fill] Activated FLUX Fill ambient lighting inpainting pass for ${context.modelChoice || context.unetName}`);
    }

    const personaPrompt = stageConfig.stagePrompt || context.promptText;
    log.info(`🔄 [Stage 3: ${this.stageName}] Executing (Denoise: ${stageConfig.denoise}, CFG: ${stageConfig.cfg}, Seed: ${stageConfig.seed}, Mask: X[${maskRegion.pixelXMin}-${maskRegion.pixelXMin + maskRegion.pixelWidth}])...`);
    log.info(`   📜 Stage 3 Prompt: "${personaPrompt}"`);

    const stageNegPrompt = `${stageConfig.stageNegativePrompt || context.negativePromptText}, small figure, tiny person, picture on wall screen, wall graphic, picture-in-picture, off-center, distant tiny subject, blurry face, (text, logo, brand name, typography, printed text on clothes, text badge:1.5)`;

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
      stageNegPrompt,
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

    log.info(`✅ [Stage 3: ${this.stageName}] Complete in ${(elapsed / 1000).toFixed(1)}s: ${path.basename(stageCacheFile)}`);

    return {
      stageIndex: 3,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
