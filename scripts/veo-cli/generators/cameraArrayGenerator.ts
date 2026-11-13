/**
 * scripts/veo-cli/generators/cameraArrayGenerator.ts
 *
 * Generates the full 3-Camera Broadcast Array Video Suite (Cam 1, Cam 2, Cam 3) for Veo.
 */

import { ActionPoseState, CompiledVeoPrompt, VeoEngineType, VeoModelType, VeoGenerationResult } from "../types";
import { compileCameraArrayPrompt } from "../promptCompiler";
import { runVeoWithApi } from "../engines/apiRunner";
import { runVeoWithAgy } from "../engines/agyRunner";
import { outputVeoJson } from "../engines/jsonRunner";
import { registerVideoLoopToDatabase } from "../dbRegistrar";
import { PERSONAS, getPersonaById } from "../../../src/lib/tts/personas";
import path from "path";
import fs from "fs";

export interface CameraArrayOptions {
  pose: ActionPoseState;
  personaSlug?: string;
  engine: VeoEngineType;
  model?: VeoModelType;
  durationSeconds?: 4 | 8 | 2 | 5;
  isChroma?: boolean;
  saveToDb?: boolean;
  dryRun?: boolean;
}

export async function runCameraArrayGenerator(opts: CameraArrayOptions): Promise<VeoGenerationResult[]> {
  const personaSlug = opts.personaSlug || "ruby";
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const duration = opts.durationSeconds || 4;
  const results: VeoGenerationResult[] = [];

  const cams: Array<1 | 2 | 3> = [1, 2, 3];

  console.log("\n==================================================================");
  console.log(`🎬 GENERATING 3-CAMERA BROADCAST ARRAY VIDEO SUITE (CAM 1, 2, 3)`);
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${personaSlug}]`);
  console.log(`Base Pose:    ${opts.pose.label}`);
  console.log(`Duration:     ${duration} seconds per camera`);
  console.log(`Engine:       ${opts.engine}`);

  for (const camNum of cams) {
    console.log(`\n▶ Generating Camera ${camNum} Shot...`);
    const prompt = compileCameraArrayPrompt({
      camNumber: camNum,
      pose: opts.pose,
      personaName: persona.name,
      isChroma: opts.isChroma !== false,
    });

    const baseName = `veo_${personaSlug}_cam0${camNum}_${opts.pose.poseCode.toLowerCase()}_${duration}s`;

    const compiled: CompiledVeoPrompt = {
      prompt,
      aspectRatio: "16:9",
      durationSeconds: duration,
      fps: 30,
      resolution: "1080p",
      baseName,
      model: "veo-3.1-standard",
    };

    if (opts.dryRun) {
      console.log(`[DRY RUN Cam ${camNum}] Compiled Prompt:\n`, prompt);
      results.push({ success: true, baseName, durationSeconds: duration });
      continue;
    }

    let res: VeoGenerationResult;
    if (opts.engine === "api") {
      res = await runVeoWithApi(compiled);
    } else if (opts.engine === "agy") {
      res = await runVeoWithAgy(compiled);
    } else {
      res = outputVeoJson(compiled);
    }

    if (res.success && res.videoPath && opts.saveToDb) {
      await registerVideoLoopToDatabase({
        persona,
        actionName: `cam0${camNum}_${opts.pose.poseCode.toLowerCase()}`,
        actionPrompt: prompt,
        videoFilePath: res.videoPath,
        durationSec: duration,
        fps: 30,
      });
    }

    results.push(res);
  }

  return results;
}
