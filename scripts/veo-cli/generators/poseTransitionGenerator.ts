/**
 * scripts/veo-cli/generators/poseTransitionGenerator.ts
 *
 * Generates 2-second First-Last Frame (FLF) Kinematic Transitions (P_A -> P_B).
 */

import { ActionPoseState, CompiledVeoPrompt, VeoEngineType, VeoModelType, AspectRatioType, VeoGenerationResult } from "../types";
import { compilePoseTransitionPrompt } from "../promptCompiler";
import { CAMERA_MOTION_PRESETS } from "../cameraMotionPresets";
import { runVeoWithApi } from "../engines/apiRunner";
import { runVeoWithAgy } from "../engines/agyRunner";
import { outputVeoJson } from "../engines/jsonRunner";
import { registerVideoLoopToDatabase } from "../dbRegistrar";
import { PERSONAS, getPersonaById } from "../../../src/lib/tts/personas";
import path from "path";
import fs from "fs";

export interface PoseTransitionOptions {
  fromPose: ActionPoseState;
  toPose: ActionPoseState;
  personaSlug?: string;
  fromImagePath?: string;
  toImagePath?: string;
  engine: VeoEngineType;
  model?: VeoModelType;
  durationSeconds?: 4 | 8 | 2 | 5;
  aspectRatio?: AspectRatioType;
  motionPacing?: "natural_deliberate" | "dynamic_emphasis" | "subtle_recovery";
  saveToDb?: boolean;
  dryRun?: boolean;
}

export async function runPoseTransitionGenerator(opts: PoseTransitionOptions): Promise<VeoGenerationResult> {
  const personaSlug = opts.personaSlug || "ruby";
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const duration = opts.durationSeconds || 4;
  const aspectRatio = opts.aspectRatio || "9:16";

  let fromImagePath = opts.fromImagePath;
  if (!fromImagePath && opts.fromPose.sampleImagePath) {
    fromImagePath = path.resolve(process.cwd(), opts.fromPose.sampleImagePath);
  }

  let toImagePath = opts.toImagePath;
  if (!toImagePath && opts.toPose.sampleImagePath) {
    toImagePath = path.resolve(process.cwd(), opts.toPose.sampleImagePath);
  }

  const prompt = compilePoseTransitionPrompt({
    fromPose: opts.fromPose,
    toPose: opts.toPose,
    personaName: persona.name,
    motionPacing: opts.motionPacing || "natural_deliberate",
    cameraPreset: CAMERA_MOTION_PRESETS.static_broadcast,
    durationSeconds: duration,
    aspectRatio,
  });

  const baseName = `veo_${personaSlug}_trans_${opts.fromPose.poseCode.toLowerCase()}_to_${opts.toPose.poseCode.toLowerCase()}_${duration}s_${Date.now().toString().slice(-4)}`;

  const compiled: CompiledVeoPrompt = {
    prompt,
    imagePath: fromImagePath && fs.existsSync(fromImagePath) ? fromImagePath : undefined,
    endImagePath: toImagePath && fs.existsSync(toImagePath) ? toImagePath : undefined,
    aspectRatio,
    durationSeconds: duration,
    fps: 30,
    resolution: "1080p",
    baseName,
    model: opts.model || "veo-3.1-lite",
  };

  console.log("\n==================================================================");
  console.log(`🎬 GENERATING ${duration}-SECOND POSE TRANSITION (${opts.fromPose.poseCode} ➔ ${opts.toPose.poseCode})`);
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${personaSlug}]`);
  console.log(`From Pose:    ${opts.fromPose.label}`);
  console.log(`To Pose:      ${opts.toPose.label}`);
  console.log(`Pacing:       ${opts.motionPacing || "natural_deliberate"}`);
  console.log(`I2V Source:   ${fromImagePath || "None"}`);
  console.log(`Engine:       ${opts.engine}`);

  if (opts.dryRun) {
    console.log("\n[DRY RUN] Compiled Prompt:\n", prompt);
    return { success: true, baseName, durationSeconds: duration };
  }

  let result: VeoGenerationResult;
  if (opts.engine === "flow_web") {
    const { runVeoWithFlowWeb } = await import("../engines/flowWebRunner");
    result = await runVeoWithFlowWeb(compiled);
  } else if (opts.engine === "gemini_web") {
    const { runVeoWithGeminiWeb } = await import("../engines/geminiWebRunner");
    result = await runVeoWithGeminiWeb(compiled);
  } else if (opts.engine === "web_portal" || opts.engine === "google_vids") {
    const { runVeoWithWebPortal } = await import("../engines/webPortalRunner");
    result = await runVeoWithWebPortal(compiled);
  } else if (opts.engine === "api") {
    result = await runVeoWithApi(compiled);
  } else if (opts.engine === "agy") {
    result = await runVeoWithAgy(compiled);
  } else {
    result = outputVeoJson(compiled);
  }

  if (result.success && result.videoPath && opts.saveToDb) {
    await registerVideoLoopToDatabase({
      persona,
      actionName: `trans_${opts.fromPose.poseCode.toLowerCase()}_to_${opts.toPose.poseCode.toLowerCase()}`,
      actionPrompt: prompt,
      videoFilePath: result.videoPath,
      durationSec: duration,
      fps: 30,
    });
  }

  return result;
}
