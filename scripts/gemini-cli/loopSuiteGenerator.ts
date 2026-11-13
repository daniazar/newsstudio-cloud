/**
 * scripts/gemini-cli/loopSuiteGenerator.ts
 *
 * Automated Looping Video Master Reference Suite Generator.
 * Generates the complete 5-part production package for LTX Video, Wan 2.1 & MuseTalk:
 *   1. base_pose_neutral_idle   — Forward-facing neutral rest baseline for idle loop
 *   2. action_gesture_left      — Left open-palm explanatory gesture for FLF transition
 *   3. action_gesture_right     — Right active presentation gesture for FLF transition
 *   4. closeup_dialogue_lipsync  — High-res tight chest-up headshot for facial lip-sync
 *   5. 4in1_multiview_strip     — Master 4-Panel Character Reference Sheet (0° Front, ±30° Angles, Face Macro)
 * 
 * Leverages Gemini Context Caching to lock persona facial landmarks, wardrobe fabrics, and chroma backdrops.
 */

import fs from "fs";
import path from "path";
import { Persona } from "../../src/lib/tts/personas";
import { PersonaAttire, CompositeSceneConfig } from "./types";
import { compileCompositeScene } from "./promptCompiler";
import { detectOptimalChroma } from "./chromaDetector";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { runMultiviewSuiteGenerator } from "./multiviewStripGenerator";

export interface LoopSuiteOptions {
  persona: Persona;
  attire: PersonaAttire;
  hairstyleKey?: string;
  customHairstyle?: string;
  useChroma?: boolean;
  chromaMode?: "auto" | "green" | "blue";
  aspectRatio?: string;
  engine: "agy" | "api" | "tool_json";
  poseType?: "seated_desk" | "standing_mic";
  saveToDb?: boolean;
}

export async function generateLoopMasterSuite(options: LoopSuiteOptions): Promise<void> {
  const { persona, attire, hairstyleKey, customHairstyle, useChroma = true, chromaMode = "auto", aspectRatio = "9:16", engine, poseType = "seated_desk", saveToDb = false } = options;

  console.log("\n==================================================================");
  console.log(`🔁 LAUNCHING COMPLETE LOOPING VIDEO MASTER REFERENCE SUITE FOR: ${persona.name.toUpperCase()}`);
  console.log("==================================================================");
  console.log(`Persona:        ${persona.name} [${persona.id}]`);
  console.log(`Attire:         ${attire.label}`);
  console.log(`Hairstyle:      ${hairstyleKey || "Signature"}`);
  console.log(`Pose Style:     ${poseType === "seated_desk" ? "Seated Behind News Desk" : "Standing Presenter Stance"}`);
  console.log(`Aspect Ratio:   ${aspectRatio}`);
  console.log(`Engine:         ${engine.toUpperCase()}`);

  let chromaInfo: any = null;
  if (useChroma) {
    chromaInfo = detectOptimalChroma(attire.description, chromaMode);
    console.log(`Chroma Backdrop: ${chromaInfo.label}`);
    console.log(`Chroma Reason:   ${chromaInfo.reason}`);
  }
  console.log("==================================================================\n");

  const shots = [
    {
      id: "base_pose_neutral_idle",
      nameSuffix: "01_base_pose_neutral_idle",
      label: "Shot 1/5: Idle Neutral Baseline (Resting Forward Pose)",
      cameraPresetKey: poseType === "seated_desk" ? "cam1_center_wide" : "standup_videowall",
      expressionKey: "neutral_professional",
      gestureKey: poseType === "seated_desk" ? "desk_hands_clasped" : "standing_presentation_palm",
      customGesture: poseType === "seated_desk"
        ? "Both hands resting neatly and neutrally on desk surface, mouth closed in calm neutral expression, direct eye contact with camera lens"
        : "Standing upright facing front, hands resting calmly in lower rest zone, neutral calm expression, direct eye contact",
    },
    {
      id: "action_gesture_left",
      nameSuffix: "02_action_gesture_left",
      label: "Shot 2/5: Left Hand Explanatory Gesture (FLF Loop Transition)",
      cameraPresetKey: "cam2_left_tight",
      expressionKey: "calm_authoritative",
      gestureKey: poseType === "seated_desk" ? "desk_one_hand_explanatory" : "standing_presentation_palm",
      customGesture: "Left hand raised gracefully in an open-palm explanatory gesture toward the viewer delivering key facts, right hand steady",
    },
    {
      id: "action_gesture_right",
      nameSuffix: "03_action_gesture_right",
      label: "Shot 3/5: Right Hand Presentation Gesture (FLF Loop Transition)",
      cameraPresetKey: "cam2_left_tight",
      expressionKey: "energetic_enthusiastic",
      gestureKey: poseType === "seated_desk" ? "desk_one_hand_explanatory" : "standing_presentation_palm",
      customGesture: "Right hand extended in an active presentation gesture toward camera, body angled slightly, engaging dynamic delivery",
    },
    {
      id: "closeup_dialogue_lipsync",
      nameSuffix: "04_closeup_dialogue_lipsync",
      label: "Shot 4/5: Tight Close-Up Dialogue (High-Res MuseTalk Lip-Sync)",
      cameraPresetKey: "cam3_right_closeup",
      expressionKey: "intense_breaking_news",
      gestureKey: "desk_hands_clasped",
      customGesture: "Tight chest-up framing, hands resting below frame, lips slightly parted speaking, crystal sharp eye catchlights",
    },
  ];

  // 1. Generate the 4 Core Looping Keyframes
  const generatedKeyframes: string[] = [];
  let baselineShot1Path: string | null = null;

  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const shotBaseName = `${persona.id}_loop_suite_${attire.id}_${s.nameSuffix}`;

    console.log(`\n------------------------------------------------------------------`);
    console.log(`🎬 GENERATING ${s.label}`);
    console.log(`------------------------------------------------------------------`);

    const config: CompositeSceneConfig = {
      persona,
      studioPlateKey: useChroma
        ? (chromaInfo.color === "blue" ? "section_02_chroma_blue_50mm" : "section_02_chroma_green_50mm")
        : (poseType === "seated_desk" ? "section_01_anchor_desk" : "section_02_videowall_flat"),
      wardrobeKey: attire.id,
      cameraPresetKey: s.cameraPresetKey,
      aspectRatio,
      hairstyleKey,
      customHairstyle,
      expressionKey: s.expressionKey,
      gestureKey: s.gestureKey,
      customGesture: s.customGesture,
      customBackdrop: useChroma ? chromaInfo.prompt : undefined,
      imageName: shotBaseName,
      engine,
      saveToDb,
    };

    const compiled = compileCompositeScene(config, attire);
    console.log(`Image Name:     ${compiled.baseName}`);
    console.log(`Reference Imgs: ${compiled.imagePaths.join(", ")}`);
    console.log(`\nPrompt:\n${compiled.prompt}\n`);

    let generatedPath: string | null = null;
    if (engine === "agy") {
      generatedPath = await runWithAgy(compiled);
    } else if (engine === "api") {
      generatedPath = await runWithApi(compiled);
    } else {
      outputToolJson(compiled);
    }

    if (generatedPath && fs.existsSync(generatedPath)) {
      generatedKeyframes.push(generatedPath);
      if (i === 0) {
        baselineShot1Path = generatedPath;
        console.log(`🔑 [BASELINE KEYFRAME REGISTERED]: ${path.basename(generatedPath)} will anchor remaining shots.`);
      }
    }
  }

  // Run Automated Set Consistency Audit & Self-Healing Loop across the 4 keyframes
  if (engine !== "tool_json" && generatedKeyframes.length > 0) {
    const suiteDir = path.dirname(generatedKeyframes[0]);
    console.log(`\n🛡️ AUDITING LOOP SUITE CONSISTENCY IN: ${suiteDir}...`);
    const { runConsistencyVerificationLoop } = await import("../veo-cli/generators/consistencyVerificationLoop");
    await runConsistencyVerificationLoop({
      dirPath: suiteDir,
      persona: persona.id,
      baselinePath: baselineShot1Path || generatedKeyframes[0],
      engine: engine === "agy" ? "agy" : "api",
      autoHeal: true,
    });
  }

  // 2. Automatically Generate the Master 4-in-1 Multi-View Strip & Grid (Shot 5/5)
  console.log(`\n------------------------------------------------------------------`);
  console.log(`🎞️ GENERATING Shot 5/5: Master 4-in-1 Character Reference Strip & Grid`);
  console.log(`------------------------------------------------------------------`);
  await runMultiviewSuiteGenerator({
    persona,
    attire,
    hairstyleKey,
    customHairstyle,
    useChroma,
    chromaMode,
    engine,
    saveToDb,
    mode: "single_pass_strip",
  });

  console.log("\n==================================================================");
  console.log("🎉 COMPLETE LOOPING VIDEO MASTER REFERENCE SUITE GENERATION COMPLETE!");
  console.log("Output Package: 4 Looping Keyframes + 4-in-1 Multi-View Character Strip & Grid");
  console.log("Ready for LTX Video, Wan 2.1 & MuseTalk lip-sync pipelines.");
  console.log("==================================================================\n");
}
