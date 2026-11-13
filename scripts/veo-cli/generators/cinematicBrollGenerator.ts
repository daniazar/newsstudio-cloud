/**
 * scripts/veo-cli/generators/cinematicBrollGenerator.ts
 *
 * Generates 1080p Cinematic Broadcast B-Roll footage using Google Veo (Text-to-Video).
 */

import { CameraMotionPreset, CAMERA_MOTION_PRESETS } from "../cameraMotionPresets";
import { CompiledVeoPrompt, VeoEngineType, VeoGenerationResult } from "../types";
import { compileCinematicBrollPrompt } from "../promptCompiler";
import { runVeoWithApi } from "../engines/apiRunner";
import { runVeoWithAgy } from "../engines/agyRunner";
import { outputVeoJson } from "../engines/jsonRunner";
import { getVeoBrollDir } from "../artifactManager";
import { filterPromptForSafety } from "../../../src/lib/ecommerce/promptSafetyFilter";
import path from "path";

export interface CinematicBrollOptions {
  topic?: string;
  prompt?: string;
  cameraPresetKey?: string;
  durationSeconds?: 4 | 5 | 8 | 10;
  aspectRatio?: "16:9" | "9:16";
  engine: VeoEngineType;
  model?: string;
  imagePath?: string;
  referenceImagePaths?: string[];
  personaSlug?: string;
  characterTag?: string;
  attire?: string;
  outputDir?: string;
  baseName?: string;
  dryRun?: boolean;
}

export async function runCinematicBrollGenerator(opts: CinematicBrollOptions): Promise<VeoGenerationResult> {
  const camKey = opts.cameraPresetKey || "drone_flyover";
  const cameraMotion = CAMERA_MOTION_PRESETS[camKey] || CAMERA_MOTION_PRESETS.drone_flyover;
  const duration = opts.durationSeconds || 8;
  const aspectRatio = opts.aspectRatio || "16:9";
  const topic = opts.topic || "cinematic product hero";

  // Use explicit prompt if provided, otherwise compile from topic + camera motion
  const rawPrompt = (opts.prompt && opts.prompt.trim())
    ? opts.prompt.trim()
    : compileCinematicBrollPrompt({
        topic,
        cameraMotion,
      });

  // Filter prompt for safety to avoid prominent-people or sensitive term policy violations
  const prompt = filterPromptForSafety(rawPrompt);

  const slug = (opts.topic || "veo_hero").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 25);
  const baseName = opts.baseName || `veo_broll_${slug}_${duration}s_${Date.now().toString().slice(-4)}`;

  const characterTag = opts.characterTag || (opts.personaSlug ? `@${opts.personaSlug}` : undefined);

  const compiled: CompiledVeoPrompt = {
    prompt,
    imagePath: opts.imagePath,
    referenceImagePaths: opts.referenceImagePaths,
    aspectRatio,
    durationSeconds: duration,
    fps: 30,
    resolution: "1080p",
    baseName,
    model: (opts.model as any) || "veo-3.1-lite",
    outputDirectory: opts.outputDir,
    attire: opts.attire,
    characterTag,
  };

  console.log("\n==================================================================");
  console.log(`🎬 GENERATING CINEMATIC B-ROLL / HERO SCENE (${opts.topic || "Custom Prompt"})`);
  console.log("==================================================================");
  console.log(`Camera Motion: ${cameraMotion.label}`);
  console.log(`Duration:      ${duration} seconds (${aspectRatio})`);
  console.log(`Engine:        ${opts.engine}`);
  if (characterTag) {
    console.log(`Character:     ${characterTag}`);
  }
  if (opts.attire) {
    console.log(`Attire:        ${opts.attire}`);
  }
  if (opts.imagePath) {
    console.log(`Primary Image: ${opts.imagePath}`);
  }
  if (opts.referenceImagePaths && opts.referenceImagePaths.length > 0) {
    console.log(`References:    ${opts.referenceImagePaths.length} photo(s)`);
  }

  if (opts.dryRun) {
    console.log("\n[DRY RUN] Compiled Prompt:\n", prompt);
    return { success: true, baseName, durationSeconds: duration };
  }

  if (opts.engine === "api") {
    return runVeoWithApi(compiled);
  } else if (opts.engine === "agy") {
    return runVeoWithAgy(compiled);
  } else if (opts.engine === "flow_web") {
    const { runVeoWithFlowWeb } = await import("../engines/flowWebRunner");
    return runVeoWithFlowWeb(compiled, {
      flowModel: (opts.model as any) || (compiled.model as any) || "veo-3.1-lite",
    });
  } else {
    return outputVeoJson(compiled);
  }
}

