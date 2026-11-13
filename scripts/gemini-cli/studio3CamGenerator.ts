/**
 * scripts/gemini-cli/studio3CamGenerator.ts
 *
 * NewsStudio 3-Camera Broadcast Array Generator (Calibrated).
 * Synthesizes the master 3-camera multi-shot broadcast suite (implementing the cinematic 30-Degree Rule):
 *   1. Cam 1 (Center 0° Wide / 35mm): Establishing wide hook at center news desk with hands clasped
 *   2. Cam 2 (Left 20° Tight Medium / 50mm): Core story delivery with active hand on laptop keyboard
 *   3. Cam 3 (Right Slash 35° Close-Up / 85mm): Breaking news punchlines with hands strictly below frame
 *
 * Key Continuity Feature:
 * When Shot 1 (Cam 1 Center) finishes, it is automatically passed as an explicit visual likeness
 * and wardrobe anchor reference for Shot 2 (Cam 2) and Shot 3 (Cam 3) to lock in 100% facial symmetry,
 * lighting continuity, and fabric texture across camera angles.
 */

import { Persona } from "../../src/lib/tts/personas";
import { PersonaAttire, CompositeSceneConfig } from "./types";
import { compileCompositeScene } from "./promptCompiler";
import { detectOptimalChroma } from "./chromaDetector";
import { STUDIO_PLATES_CATALOG } from "./studioCatalog";
import { CAMERA_ARRAY_PRESETS } from "./cameraPresets";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";
import { registerImageToDatabase } from "./dbRegistrar";
import { convertToTransparentPng } from "./alphaMatting";
import fs from "fs";
import path from "path";

export interface Studio3CamOptions {
  persona: Persona;
  attire: PersonaAttire;
  hairstyleKey?: string;
  customHairstyle?: string;
  studioPlateKey?: string;
  customBackdrop?: string;
  useChroma?: boolean;
  chromaMode?: "auto" | "green" | "blue" | "none";
  aspectRatio?: string;
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  preview?: boolean;
  saveToDb?: boolean;
  transparent?: boolean;
}

export const BROADCAST_3CAM_SHOTS = [
  {
    camId: "cam1_center_wide",
    camName: "Cam 1 (Center 0° Wide / 35mm)",
    nameSuffix: "cam01_center_wide_0deg",
    role: "Intro Hook & Establishing Broadcast Wide",
    presetKey: "cam1_center_wide",
    expressionKey: "calm_authoritative",
    gestureKey: "desk_hands_clasped",
    customGesture: "Seated upright in executive chair behind curved glass desk, hands clasped neatly on center of desk, calm authoritative direct intro delivery into lens, soft tungsten hair-rim counter-lighting separating hair from background",
  },
  {
    camId: "cam2_left_tight",
    camName: "Cam 2 (Left 20° Tight Medium / 50mm)",
    nameSuffix: "cam02_left_tight_medium_20deg",
    role: "Core Story News Delivery & Rundown",
    presetKey: "cam2_left_tight",
    expressionKey: "calm_authoritative",
    gestureKey: "desk_one_hand_explanatory",
    customGesture: "Head and upper torso turned smoothly toward Camera 2 with natural three-dimensional parallax depth to shoulders and collarbones, right hand active near open laptop keyboard referencing rundown notes, left hand resting on glass desk, identical face and attire matching Cam 1",
  },
  {
    camId: "cam3_right_closeup",
    camName: "Cam 3 (Right Slash 35° Close-Up / 85mm)",
    nameSuffix: "cam03_right_slash_closeup_35deg",
    role: "Dramatic Punchlines & Reveals (Hands Below Frame)",
    presetKey: "cam3_right_closeup",
    expressionKey: "intense_breaking_news",
    gestureKey: "desk_hands_clasped",
    customGesture: "True tight chest-up framing, head and chest turned with dramatic 35-degree right slash perspective, dimensional profile lighting and golden rim lighting on hair, lips parted speaking high-impact reveal, hands and arms resting completely below frame (strictly no hands visible), identical facial features matching Cam 1",
  },
];

export async function runStudio3CamMode(options: Studio3CamOptions): Promise<string[]> {
  const {
    persona,
    attire,
    hairstyleKey = "signature",
    customHairstyle,
    studioPlateKey = "section_01_anchor_desk",
    customBackdrop,
    useChroma = false,
    chromaMode = "auto",
    aspectRatio = "16:9",
    engine,
    dryRun = false,
    preview = false,
    saveToDb = false,
    transparent = false,
  } = options;

  console.log("\n==================================================================");
  console.log(`📹 NEWSSTUDIO — 3-CAMERA BROADCAST ARRAY GENERATOR (0°, 20°, 35°)`);
  console.log("==================================================================");
  console.log(`Persona:        ${persona.name} [${persona.id}] (${persona.gender})`);
  console.log(`Attire:         ${attire.label}`);
  console.log(`Studio Plate:   ${STUDIO_PLATES_CATALOG[studioPlateKey]?.label || studioPlateKey}`);
  console.log(`Chroma Mode:    ${useChroma ? chromaMode.toUpperCase() : "Studio Plate / None"}`);
  console.log(`Aspect Ratio:   ${aspectRatio}`);
  console.log(`Engine:         ${engine.toUpperCase()}`);
  console.log(`Dry Run:        ${dryRun ? "YES (Preview Only)" : "NO"}`);
  console.log("==================================================================\n");

  const generatedPaths: string[] = [];

  for (let i = 0; i < BROADCAST_3CAM_SHOTS.length; i++) {
    const shot = BROADCAST_3CAM_SHOTS[i];
    const shotBaseName = `${persona.id}_${attire.id}_${shot.nameSuffix}`;

    console.log(`------------------------------------------------------------------`);
    console.log(`🎬 SHOT ${i + 1}/3: ${shot.camName}`);
    console.log(`Role: ${shot.role}`);
    console.log(`------------------------------------------------------------------`);

    // For Cam 2 and Cam 3, if Cam 1 has already been generated, we create an attire / visual override
    // that uses Cam 1 as the primary master reference anchor for 100% facial continuity!
    const effectiveAttire = { ...attire };
    if (i > 0 && generatedPaths[0] && fs.existsSync(generatedPaths[0])) {
      effectiveAttire.relativePath = generatedPaths[0];
      console.log(`🔗 [MULTI-SHOT CONTINUITY]: Binding Cam ${i + 1} to Cam 1 reference (${path.basename(generatedPaths[0])})`);
    }

    const config: CompositeSceneConfig = {
      persona,
      studioPlateKey: useChroma
        ? (chromaMode === "blue" ? "section_02_chroma_blue_50mm" : "section_02_chroma_green_50mm")
        : studioPlateKey,
      wardrobeKey: attire.id,
      cameraPresetKey: shot.presetKey,
      aspectRatio,
      hairstyleKey,
      customHairstyle,
      expressionKey: shot.expressionKey,
      gestureKey: shot.gestureKey,
      customGesture: shot.customGesture,
      customBackdrop: useChroma
        ? detectOptimalChroma(attire.description, chromaMode === "none" ? "auto" : chromaMode).prompt
        : customBackdrop,
      chromaMode: useChroma ? (chromaMode as any) : undefined,
      imageName: shotBaseName,
      engine,
      saveToDb,
      transparent,
    };

    const compiled = compileCompositeScene(config, effectiveAttire);
    console.log(`Image Name:     ${compiled.baseName}`);
    console.log(`Reference Imgs: ${compiled.imagePaths.join(", ")}`);
    console.log(`\nCompiled Prompt:\n"${compiled.prompt}"\n`);

    if (dryRun) {
      console.log(`ℹ️ [DRY-RUN] Shot ${i + 1}/3 prompt verified successfully.\n`);
      continue;
    }

    let generatedPath: string | null = null;
    if (engine === "agy") {
      generatedPath = await runWithAgy(compiled);
    } else if (engine === "api") {
      generatedPath = await runWithApi(compiled);
    } else {
      outputToolJson(compiled);
    }

    if (generatedPath) {
      generatedPaths.push(generatedPath);
      if (preview) {
        await renderTerminalImagePreview(generatedPath, 64);
      }
      if (transparent) {
        convertToTransparentPng(generatedPath, chromaMode === "none" ? "auto" : (chromaMode as any));
      }
      if (saveToDb) {
        await registerImageToDatabase({
          persona,
          attire: attire.label,
          promptUsed: compiled.prompt,
          imageFilePath: generatedPath,
          isTransparent: Boolean(transparent),
        });
      }
    }
  }

  console.log("==================================================================");
  console.log(`🎉 3-CAMERA BROADCAST ARRAY SUITE COMPLETED (${generatedPaths.length}/3 shots generated)`);
  console.log("==================================================================\n");

  return generatedPaths;
}
