/**
 * scripts/veo-cli/generators/livingStudioGenerator.ts
 *
 * Generates ambient living studio room motion loops from static studio plates (I2V).
 */

import { CameraMotionPreset, CAMERA_MOTION_PRESETS } from "../cameraMotionPresets";
import { CompiledVeoPrompt, VeoEngineType, VeoGenerationResult } from "../types";
import { runVeoWithApi } from "../engines/apiRunner";
import { runVeoWithAgy } from "../engines/agyRunner";
import { outputVeoJson } from "../engines/jsonRunner";
import { getVeoStudioLoopsDir } from "../artifactManager";
import path from "path";
import fs from "fs";

export interface LivingStudioOptions {
  studioPlatePath?: string;
  studioName?: string;
  cameraPresetKey?: string;
  durationSeconds?: 4 | 5 | 8;
  engine: VeoEngineType;
  dryRun?: boolean;
}

export async function runLivingStudioGenerator(opts: LivingStudioOptions): Promise<VeoGenerationResult> {
  const camKey = opts.cameraPresetKey || "ambient_orbit_3d";
  const cameraMotion = CAMERA_MOTION_PRESETS[camKey] || CAMERA_MOTION_PRESETS.ambient_orbit_3d;
  const duration = opts.durationSeconds || 5;
  const studioName = opts.studioName || "modern_broadcast_studio";

  const prompt = [
    `Hyper-photorealistic 1080p ambient broadcast television newsroom environment.`,
    `Motion & Atmosphere: Ambient reflections softly shifting on the polished curved glass news desk and reflective floor. In the background through the panoramic floor-to-ceiling glass wall, the twilight city skyline has soft sparkling skyscraper office lights and gentle dusk atmosphere.`,
    `Camera Movement: ${cameraMotion.promptPhrase}`,
    `Stability: Clean, empty anchor chair, crisp studio architecture, zero artifacts, seamless continuous 30fps video loop.`,
  ].join(" ");

  const baseName = `veo_studio_${studioName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${duration}s_${Date.now().toString().slice(-4)}`;

  const compiled: CompiledVeoPrompt = {
    prompt,
    imagePath: opts.studioPlatePath && fs.existsSync(opts.studioPlatePath) ? opts.studioPlatePath : undefined,
    aspectRatio: "16:9",
    durationSeconds: duration,
    fps: 30,
    resolution: "1080p",
    baseName,
    model: "veo-3.1-standard",
  };

  console.log("\n==================================================================");
  console.log(`🎬 GENERATING LIVING STUDIO PLATE (${studioName})`);
  console.log("==================================================================");
  console.log(`Camera Motion: ${cameraMotion.label}`);
  console.log(`Duration:      ${duration} seconds`);
  console.log(`I2V Source:    ${opts.studioPlatePath || "None (Text-to-Video)"}`);
  console.log(`Engine:        ${opts.engine}`);

  if (opts.dryRun) {
    console.log("\n[DRY RUN] Compiled Prompt:\n", prompt);
    return { success: true, baseName, durationSeconds: duration };
  }

  if (opts.engine === "api") {
    return runVeoWithApi(compiled);
  } else if (opts.engine === "agy") {
    return runVeoWithAgy(compiled);
  } else {
    return outputVeoJson(compiled);
  }
}
