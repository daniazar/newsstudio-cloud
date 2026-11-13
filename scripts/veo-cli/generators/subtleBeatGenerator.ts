/**
 * scripts/veo-cli/generators/subtleBeatGenerator.ts
 *
 * Generates 2-second Zero-State Subtle Idle Beats (P_A -> P_A) for MuseTalk 40 FPS.
 */

import { ActionPoseState, CompiledVeoPrompt, VeoEngineType, VeoModelType, AspectRatioType, VeoGenerationResult } from "../types";
import { compileSubtleIdlePrompt } from "../promptCompiler";
import { CAMERA_MOTION_PRESETS } from "../cameraMotionPresets";
import { runVeoWithApi } from "../engines/apiRunner";
import { runVeoWithAgy } from "../engines/agyRunner";
import { outputVeoJson } from "../engines/jsonRunner";
import { registerVideoLoopToDatabase } from "../dbRegistrar";
import { PERSONAS, getPersonaById } from "../../../src/lib/tts/personas";
import path from "path";
import fs from "fs";

export interface SubtleBeatOptions {
  pose: ActionPoseState;
  personaSlug?: string;
  imagePath?: string;
  engine: VeoEngineType;
  model?: VeoModelType;
  durationSeconds?: 4 | 8 | 2 | 5 | 10 | 16;
  chromaMode?: "green" | "blue" | "studio";
  aspectRatio?: AspectRatioType;
  reuseConversation?: boolean;
  saveToDb?: boolean;
  dryRun?: boolean;
  attire?: string;
  characterTag?: string;
  emotion?: string;
  motionMode?: any;
  createPalindrome?: boolean;
  variations?: number;
  variationIndex?: number;
  qc?: boolean;
  prevectorize?: boolean;
}

export async function runSubtleBeatGenerator(opts: SubtleBeatOptions): Promise<VeoGenerationResult> {
  if (opts.variations && opts.variations > 1 && !opts.variationIndex) {
    console.log(`\n==================================================================`);
    console.log(`🔢 GENERATING ${opts.variations} GESTURE VARIATIONS FOR [${opts.personaSlug || "ruby"}]`);
    console.log(`==================================================================`);
    let lastResult: VeoGenerationResult = { success: true };
    for (let v = 1; v <= opts.variations; v++) {
      console.log(`\n🎬 --- VARIATION ${v} OF ${opts.variations} ---`);
      lastResult = await runSubtleBeatGenerator({
        ...opts,
        variations: undefined,
        variationIndex: v,
      });
      if (v < opts.variations && !opts.dryRun) {
        console.log(`⏳ Cooldown pause (5s) before variation ${v + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    return lastResult;
  }

  const personaSlug = opts.personaSlug || "ruby";
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const duration = opts.durationSeconds || (opts.engine === "flow_web" ? 8 : 4);

  // Resolve Flow character details if engine is flow_web or tag is specified
  const { getFlowCharacterConfig } = await import("../flowCharacterRegistry");
  const flowConfig = getFlowCharacterConfig(personaSlug);
  const characterTag = opts.characterTag || (opts.engine === "flow_web" ? flowConfig.tag : undefined);
  const attire = opts.attire || flowConfig.defaultAttire;
  const hairStyle = flowConfig.hairDescription;
  const identityClause = persona.flowConfig?.visualContinuityContract || flowConfig.description;

  // Resolve reference image
  let imagePath = opts.imagePath;
  if (!imagePath && opts.pose.sampleImagePath) {
    imagePath = path.resolve(process.cwd(), opts.pose.sampleImagePath);
  }
  if (!imagePath && flowConfig.chromaMasterPath) {
    imagePath = flowConfig.chromaMasterPath;
  }

  const aspectRatio = opts.aspectRatio || "9:16";
  const {
    detectImageChromaMode,
    compileSubtleIdlePrompt,
    compileActiveDeliveryPrompt,
    compileForwardArticulationPrompt,
    compileEmotionalExpressionPrompt,
  } = await import("../promptCompiler");
  const chromaMode = opts.chromaMode || detectImageChromaMode(imagePath);

  const motionMode = opts.motionMode || "subtle_idle";
  const variationIndex = opts.variationIndex || 1;
  let prompt: string;

  if (motionMode === "active_delivery") {
    prompt = compileActiveDeliveryPrompt({
      pose: opts.pose,
      personaName: persona.name,
      cameraPreset: CAMERA_MOTION_PRESETS.static_broadcast,
      chromaMode,
      durationSeconds: duration,
      aspectRatio,
      characterTag,
      attire,
      hairStyle,
      variationIndex,
      identityClause,
    });
  } else if (motionMode === "forward_articulation") {
    prompt = compileForwardArticulationPrompt({
      pose: opts.pose,
      personaName: persona.name,
      cameraPreset: CAMERA_MOTION_PRESETS.static_broadcast,
      chromaMode,
      durationSeconds: duration,
      aspectRatio,
      characterTag,
      attire,
      hairStyle,
      variationIndex,
      identityClause,
    });
  } else if (motionMode === "emotional_expression") {
    prompt = compileEmotionalExpressionPrompt({
      pose: opts.pose,
      personaName: persona.name,
      cameraPreset: CAMERA_MOTION_PRESETS.static_broadcast,
      chromaMode,
      durationSeconds: duration,
      aspectRatio,
      characterTag,
      attire,
      hairStyle,
      emotion: opts.emotion,
      variationIndex,
    });
  } else {
    prompt = compileSubtleIdlePrompt({
      pose: opts.pose,
      personaName: persona.name,
      cameraPreset: CAMERA_MOTION_PRESETS.static_broadcast,
      chromaMode,
      durationSeconds: duration,
      aspectRatio,
      characterTag,
      attire,
      hairStyle,
      emotion: opts.emotion,
      variationIndex,
      identityClause,
    });
  }

  const modeTag = motionMode !== "subtle_idle" ? `_${motionMode}` : "_idle";
  const vTag = opts.variationIndex ? `_v${opts.variationIndex}` : "";
  const baseName = `veo_${personaSlug}_${opts.pose.poseCode.toLowerCase()}${modeTag}${vTag}_${duration}s_${Date.now().toString().slice(-4)}`;

  const compiled: CompiledVeoPrompt = {
    prompt,
    imagePath: imagePath && fs.existsSync(imagePath) ? imagePath : undefined,
    aspectRatio,
    durationSeconds: duration as any,
    fps: 30,
    resolution: "1080p",
    baseName,
    model: opts.model || "veo-3.1-lite",
    reuseConversation: opts.reuseConversation !== false,
    attire,
    characterTag,
    emotion: opts.emotion,
    motionMode,
  };

  console.log("\n==================================================================");
  console.log(`🎬 GENERATING ${duration}-SECOND ${motionMode.toUpperCase().replace(/_/g, " ")} (${opts.pose.poseCode})${vTag ? ` [${vTag.toUpperCase().slice(1)}]` : ""}`);
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${personaSlug}]`);
  if (characterTag) console.log(`Flow Tag:     ${characterTag}`);
  if (attire) console.log(`Attire:       ${attire}`);
  console.log(`Pose:         ${opts.pose.label}`);
  console.log(`Duration:     ${duration} seconds`);
  console.log(`I2V Source:   ${imagePath || "None (Text-to-Video)"}`);
  console.log(`Engine:       ${opts.engine}`);
  if (opts.qc !== false) console.log(`Forensic QC:  Enabled (Target SSIM >= 0.92 with Auto-Heal)`);
  if (opts.prevectorize) console.log(`Pre-vector:   Enabled (MuseTalk / KeySync Latents & Landmarks)`);

  if (opts.dryRun) {
    console.log("\n[DRY RUN] Compiled Prompt:\n", prompt);
    return { success: true, baseName, durationSeconds: duration };
  }

  let result: VeoGenerationResult;
  if (opts.engine === "flow_web") {
    const { runVeoWithFlowWeb } = await import("../engines/flowWebRunner");
    result = await runVeoWithFlowWeb(compiled, { createPalindrome: opts.createPalindrome });
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

  if (result.success && result.videoPath) {
    // 1. Loop Quality Gate & Forensic Optical Flow Seam Healing
    if (opts.qc !== false && (motionMode === "subtle_idle" || motionMode === "active_delivery" || opts.createPalindrome)) {
      try {
        const { auditAndHealLoopQuality } = await import("../processors/loopQualityGate");
        const qcReport = await auditAndHealLoopQuality(result.videoPath, { targetSsim: 0.92, autoHeal: true });
        console.log(`\n📊 [FORENSIC QC AUDIT]: ${qcReport.report} (SSIM: ${qcReport.finalSsim.toFixed(4)})`);
      } catch (err: any) {
        console.warn("⚠️ Quality Gate check notice:", err.message);
      }
    } else {
      try {
        const { applySeamlessLoopLock, enforceStrictExactBoundaryLock } = await import("../processors/loopHarmonizer");
        await applySeamlessLoopLock(result.videoPath, { blendFrames: 16, useOpticalFlow: true });
        enforceStrictExactBoundaryLock(result.videoPath);

        const { checkLoopQuality } = await import("../../check-loop-quality");
        const quality = checkLoopQuality(result.videoPath, 0.90, 26.0, 6.0);
        console.log(`\n📊 [LOOP QUALITY CHECK]: ${quality.message}`);
      } catch (err: any) {
        console.warn("⚠️ Seamless loop harmonizer notice:", err.message);
      }
    }

    // 2. Pre-vectorization for MuseTalk & KeySync (latents.pt, landmarks.npy, masks.pt, meta.json)
    if (opts.prevectorize) {
      try {
        const { prevectorizeVideoClip } = await import("../processors/latentPrevectorizer");
        const prevecRes = await prevectorizeVideoClip(result.videoPath);
        if (prevecRes.success) {
          console.log(`⚡ Pre-vectorization complete for ${path.basename(result.videoPath)}!`);
        } else {
          console.warn("⚠️ Pre-vectorization warning:", prevecRes.error);
        }
      } catch (err: any) {
        console.warn("⚠️ Pre-vectorization notice:", err.message);
      }
    }

    if (opts.saveToDb) {
      await registerVideoLoopToDatabase({
        persona,
        actionName: `subtle_beat_${opts.pose.poseCode.toLowerCase()}${vTag}`,
        actionPrompt: prompt,
        videoFilePath: result.videoPath,
        durationSec: duration,
        fps: 30,
      });
    }
  }

  return result;
}
