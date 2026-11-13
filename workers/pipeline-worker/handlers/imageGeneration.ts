/**
 * workers/pipeline-worker/handlers/imageGeneration.ts
 *
 * Decoupled Image and Thumbnail Generation handler for Pipeline Workers.
 * Communicates via dynamic HTTP endpoints (COMFYUI_URL) supporting local testing,
 * Docker containers (docker-compose.ai.yml), and Azure cloud deployments.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { storage, generateKey } from "@/lib/storage";
import { reportProgress } from "../api";
import { resolveLocalAvatarFile } from "../config";
import { generatePresenterImage } from "@/lib/ai/comfy/imageGen";
import type { LoraConfig } from "@/lib/ai/comfy/image/loraManager";
import { checkComfyUIHealth, getComfyUIUrl } from "@/lib/ai/comfy/api";
import {
  buildBroadcastCleanThumbnailPrompt,
  sanitizeBroadcastPrompt,
  resolvePersonaAvatarRef,
  DEFAULT_NEGATIVE_PROMPT,
} from "@/lib/thumbnail/thumbnailEngine";
import { getPersonaById, PERSONAS } from "@/lib/tts/personas";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:handlers:imageGeneration");

export interface ImageGenerationPayload {
  jobId: string;
  companyId: string;
  storyId?: string;
  prompt: string;
  referenceImageKey?: string;
  referenceImagePath?: string;
  personaId?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  width?: number;
  height?: number;
  denoise?: number;
  unetNameOverride?: string;
  seed?: number;
  negativePrompt?: string;
  loras?: { name: string; strength: number }[];
  filenamePrefixOverride?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageStorageKey: string;
  imageUrl?: string;
  width: number;
  height: number;
  seed: number;
  prompt: string;
  error?: string;
}

export interface ThumbnailGenerationPayload {
  jobId: string;
  companyId: string;
  storyId?: string;
  personaId?: string;
  hookPresetKey?: string;
  headline?: string;
  subtext?: string;
  badgeText?: string;
  aspectRatio?: "16:9" | "9:16";
  textPosition?: "left" | "right";
  engine?: string;
  seed?: number;
}

/**
 * Handles generic presenter / story image generation using decoupled ComfyUI.
 */
export async function handleImageGeneration(
  payload: ImageGenerationPayload
): Promise<ImageGenerationResult> {
  const {
    jobId,
    companyId,
    storyId = "images",
    prompt: rawPrompt,
    referenceImageKey,
    referenceImagePath,
    personaId,
    aspectRatio = "16:9",
    width: customWidth,
    height: customHeight,
    denoise = 0.85,
    unetNameOverride,
    seed: customSeed,
    negativePrompt = DEFAULT_NEGATIVE_PROMPT,
    loras,
    filenamePrefixOverride,
  } = payload;

  const prompt = sanitizeBroadcastPrompt(rawPrompt);
  const seed = typeof customSeed === "number" ? customSeed : Math.floor(Math.random() * 1_000_000_000);

  let nativeWidth = customWidth;
  let nativeHeight = customHeight;
  if (!nativeWidth || !nativeHeight) {
    if (aspectRatio === "9:16") {
      nativeWidth = 768;
      nativeHeight = 1344;
    } else if (aspectRatio === "1:1") {
      nativeWidth = 1024;
      nativeHeight = 1024;
    } else {
      nativeWidth = 1280;
      nativeHeight = 720;
    }
  }

  log.info(`🎨 [Image Handler] Generating decoupled image via ComfyUI (${getComfyUIUrl()})...`);
  log.info(`   Dimensions: ${nativeWidth}x${nativeHeight}, Seed: ${seed}`);

  let tempRefPath = "";
  let faceRefAbsPath = referenceImagePath || "";

  try {
    // 1. Download or resolve reference image if provided
    if (referenceImageKey) {
      log.info(`   Downloading reference image key from storage: ${referenceImageKey}`);
      const refBuffer = await storage.download(referenceImageKey);
      if (refBuffer) {
        const tmpDir = os.tmpdir();
        const ext = path.extname(referenceImageKey) || ".png";
        tempRefPath = path.join(tmpDir, `ref-${jobId}-${Date.now()}${ext}`);
        fs.writeFileSync(tempRefPath, refBuffer);
        faceRefAbsPath = tempRefPath;
      }
    } else if (!faceRefAbsPath && personaId) {
      faceRefAbsPath = resolvePersonaAvatarRef(personaId);
    }

    // 2. Report progress
    await reportProgress(jobId, {
      step: "image_diffusion_pass",
      status: "IMAGE_IN_PROGRESS",
      doneSteps: 0.2,
    }).catch(() => {});

    // 3. Dispatch image generation via ComfyUI
    const isOnline = await checkComfyUIHealth();
    let generatedBuffer: Buffer;

    if (isOnline) {
      generatedBuffer = await generatePresenterImage(
        prompt,
        faceRefAbsPath || undefined,
        undefined,
        loras as LoraConfig[],
        nativeWidth,
        nativeHeight,
        denoise,
        unetNameOverride,
        seed,
        negativePrompt,
        true,
        filenamePrefixOverride || `job_${jobId}`
      );
    } else {
      console.warn("⚠️ [Image Handler] ComfyUI server is offline. Using high-res persona avatar fallback.");
      const fallbackPath = faceRefAbsPath || resolveLocalAvatarFile("ruby.png");
      generatedBuffer = fallbackPath
        ? fs.readFileSync(fallbackPath)
        : await storage.download("avatars/ruby.png");
    }

    // 4. Upload generated image to tenant storage
    const filename = `gen_${jobId}_${Date.now().toString().slice(-6)}.png`;
    const objectKey = generateKey({
      companyId,
      type: "thumbnails",
      id: storyId,
      filename,
    });

    const imageUrl = await storage.upload(objectKey, generatedBuffer, "image/png");

    await reportProgress(jobId, {
      step: "image_complete",
      status: "DONE",
      doneSteps: 1.0,
      result: { imageStorageKey: objectKey, imageUrl },
    }).catch(() => {});

    log.info(`✅ [Image Handler] Image successfully generated and uploaded to: ${objectKey}`);

    return {
      success: true,
      imageStorageKey: objectKey,
      imageUrl,
      width: nativeWidth,
      height: nativeHeight,
      seed,
      prompt,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`💥 [Image Handler] Failed to generate image:`, errMsg);
    throw err;
  } finally {
    if (tempRefPath && fs.existsSync(tempRefPath)) {
      try {
        fs.unlinkSync(tempRefPath);
      } catch {}
    }
  }
}

/**
 * Handles high-CTR broadcast thumbnail generation for pipeline jobs.
 */
export async function handleThumbnailGeneration(
  payload: ThumbnailGenerationPayload
): Promise<ImageGenerationResult> {
  const persona = getPersonaById(payload.personaId || "ruby") || PERSONAS[0];
  const compiled = buildBroadcastCleanThumbnailPrompt({
    persona,
    hookPresetKey: payload.hookPresetKey,
    headline: payload.headline,
    subtext: payload.subtext,
    badgeText: payload.badgeText,
    aspectRatio: payload.aspectRatio || "16:9",
    textPosition: payload.textPosition || "left",
    engine: payload.engine,
  });

  return handleImageGeneration({
    jobId: payload.jobId,
    companyId: payload.companyId,
    storyId: payload.storyId,
    prompt: compiled.prompt,
    personaId: persona.id,
    aspectRatio: compiled.aspectRatio,
    width: compiled.width,
    height: compiled.height,
    seed: payload.seed,
    negativePrompt: compiled.negativePrompt,
    filenamePrefixOverride: compiled.baseName,
  });
}
