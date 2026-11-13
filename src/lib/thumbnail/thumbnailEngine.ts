/**
 * src/lib/thumbnail/thumbnailEngine.ts
 *
 * Broadcast-Ready Viral Thumbnail Engine for NewsStudio.
 * Provides:
 *   - Production-safe broadcast prompt filtering & studio quality styling (zero NSFW)
 *   - 6 High-CTR emotional hook presets (Shock, Secret, Bullish, Warning, Fact-Check, Futurism)
 *   - 16:9 Widescreen (YouTube Master) and 9:16 Vertical (Shorts / TikTok / Reels) negative space layouts
 *   - Dynamic CTR prediction scoring
 *   - Decoupled ComfyUI execution with graceful fallback
 */

import { checkComfyUIHealth } from "@/lib/ai/comfy/api";
import { generatePresenterImage } from "@/lib/ai/comfy/imageGen";
import { getPersonaById,PERSONAS } from "@/lib/tts/personas";
import fs from "fs";
import path from "path";
import {
buildBroadcastCleanThumbnailPrompt,
sanitizeBroadcastPrompt,
ThumbnailGenerateRequest,
ThumbnailGenerateResult
} from "./thumbnailPresets";
import { createLogger } from "@/lib/logger";

const log = createLogger("thumbnail:thumbnailEngine");

// Re-export all client-safe types, presets, and calculation functions
export * from "./thumbnailPresets";

/**
 * Resolves the best available reference avatar image on disk for a given persona.
 */
export function resolvePersonaAvatarRef(personaId: string): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "avatars", `${personaId}_ref.png`),
    path.join(cwd, "public", "avatars", `${personaId}.png`),
    path.join(cwd, "public", "avatars", "ruby_ref.png"),
    path.join(cwd, "public", "avatars", "ruby.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(cwd, "public", "avatars", "ruby.png");
}

/**
 * Executes decoupled thumbnail generation via local/Docker ComfyUI or returns a fallback preview.
 */
export async function executeThumbnailGeneration(
  request: ThumbnailGenerateRequest
): Promise<ThumbnailGenerateResult> {
  const personaId = request.personaId || "ruby";
  const persona = getPersonaById(personaId) || PERSONAS.find((p) => p.id === "ruby") || PERSONAS[0];

  const compiled = buildBroadcastCleanThumbnailPrompt({
    persona,
    hookPresetKey: request.hookPresetKey,
    headline: request.headline,
    subtext: request.subtext,
    badgeText: request.badgeText,
    aspectRatio: request.aspectRatio,
    textPosition: request.textPosition,
    engine: request.engine,
  });

  const finalPrompt = request.customPrompt
    ? sanitizeBroadcastPrompt(request.customPrompt)
    : compiled.prompt;

  const finalNegativePrompt = request.negativePrompt || compiled.negativePrompt;
  const seed = typeof request.seed === "number" ? request.seed : Math.floor(Math.random() * 1_000_000_000);
  const engine = request.engine || "comfy";

  // Dry run mode (returns compiled prompt without calling model)
  if (request.dryRun) {
    return {
      success: true,
      imageUrl: persona.avatarUrl,
      prompt: finalPrompt,
      negativePrompt: finalNegativePrompt,
      baseName: compiled.baseName,
      aspectRatio: compiled.aspectRatio,
      textPosition: compiled.textPosition,
      predictedCtr: compiled.predictedCtr,
      hook: compiled.hook,
      persona: {
        id: persona.id,
        name: persona.name,
        title: persona.title,
        avatarUrl: persona.avatarUrl,
      },
      seed,
      engine,
      source: "fallback",
      message: "Dry-run mode: prompt compiled successfully",
    };
  }

  // Check ComfyUI server availability via dynamic HTTP endpoint
  const isOnline = await checkComfyUIHealth();

  if (isOnline) {
    try {
      const faceRefPath = resolvePersonaAvatarRef(persona.id);
      log.info(`[ThumbnailEngine] Generating thumbnail via ComfyUI (seed: ${seed}, dims: ${compiled.width}x${compiled.height})...`);

      const imageBuffer = await generatePresenterImage(
        finalPrompt,
        faceRefPath,
        undefined,
        undefined,
        compiled.width,
        compiled.height,
        0.85,
        engine === "sdxl" ? "cyberrealisticXL_v3.safetensors" : "z_image_turbo_bf16.safetensors",
        seed,
        finalNegativePrompt,
        true,
        compiled.baseName
      );

      // Save output to public directory for immediate preview
      const publicOutputDir = path.join(process.cwd(), "public", "thumbnails");
      if (!fs.existsSync(publicOutputDir)) {
        fs.mkdirSync(publicOutputDir, { recursive: true });
      }

      const outFilename = `${compiled.baseName}.png`;
      const outPath = path.join(publicOutputDir, outFilename);
      fs.writeFileSync(outPath, imageBuffer);

      return {
        success: true,
        imageUrl: `/thumbnails/${outFilename}`,
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
        baseName: compiled.baseName,
        aspectRatio: compiled.aspectRatio,
        textPosition: compiled.textPosition,
        predictedCtr: compiled.predictedCtr,
        hook: compiled.hook,
        persona: {
          id: persona.id,
          name: persona.name,
          title: persona.title,
          avatarUrl: persona.avatarUrl,
        },
        seed,
        engine,
        source: "comfyui",
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[ThumbnailEngine] ComfyUI generation failed, falling back to persona template:`, errMsg);
    }
  }

  // Graceful fallback when ComfyUI is offline or generation failed
  return {
    success: true,
    imageUrl: persona.avatarUrl,
    prompt: finalPrompt,
    negativePrompt: finalNegativePrompt,
    baseName: compiled.baseName,
    aspectRatio: compiled.aspectRatio,
    textPosition: compiled.textPosition,
    predictedCtr: compiled.predictedCtr,
    hook: compiled.hook,
    persona: {
      id: persona.id,
      name: persona.name,
      title: persona.title,
      avatarUrl: persona.avatarUrl,
    },
    seed,
    engine,
    source: "fallback",
    message: "ComfyUI offline — loaded high-res studio reference preview",
  };
}
