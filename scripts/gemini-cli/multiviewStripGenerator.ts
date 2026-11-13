/**
 * scripts/gemini-cli/multiviewStripGenerator.ts
 *
 * NewsStudio 4-in-1 Character Multi-View Reference Strip & Grid Generator.
 * Produces multi-angle character reference sheets for LTX Video 2.5, Wan 2.1, and ComfyUI:
 *   - Shot 1 (Panel 1): Frontal 0° Center Waist-Up Neutral Pose
 *   - Shot 2 (Panel 2): 30° Three-Quarter View Turned Left
 *   - Shot 3 (Panel 3): 30° Three-Quarter View Turned Right (with Explanatory Hand Gesture)
 *   - Shot 4 (Panel 4): Tight High-Detail Facial Close-Up
 * 
 * Supports both:
 *   1. Single-Pass 4-Panel Strip synthesis via Gemini/Imagen multi-reference prompting
 *   2. High-Definition 4-Shot Discrete Synthesis + Seamless Sharp Stitching into:
 *      - Horizontal 4-in-1 Strip (*_4in1_multiview_strip.png)
 *      - 2x2 Quadrant Grid (*_4in1_multiview_grid.png)
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Persona } from "../../src/lib/tts/personas";
import { PersonaAttire, CompiledScenePrompt } from "./types";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { detectOptimalChroma } from "./chromaDetector";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { registerImageToDatabase } from "./dbRegistrar";

export interface MultiviewSuiteConfig {
  persona: Persona;
  attire: PersonaAttire;
  hairstyleKey?: string;
  customHairstyle?: string;
  useChroma?: boolean;
  chromaMode?: "auto" | "green" | "blue" | "none";
  engine?: "agy" | "api" | "tool_json";
  saveToDb?: boolean;
  mode?: "single_pass_strip" | "discrete_4shot_stitch";
}

export interface StitchedOutputs {
  stripPath: string;
  gridPath: string;
  panelPaths: string[];
}

/**
 * Stitches 4 input panel images into a horizontal strip and a 2x2 grid using sharp.
 */
export async function stitchMultiviewImages(
  panelPaths: string[],
  outputBaseName: string,
  outputDir: string
): Promise<StitchedOutputs> {
  if (panelPaths.length < 4) {
    throw new Error(`Stitching requires exactly 4 panel images, received ${panelPaths.length}`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stripPath = path.join(outputDir, `${outputBaseName}_4in1_multiview_strip.png`);
  const gridPath = path.join(outputDir, `${outputBaseName}_4in1_multiview_grid.png`);

  const panelBuffers: Buffer[] = [];
  const targetHeight = 1024;
  const targetWidth = 576; // 9:16 normalized width per panel

  for (const p of panelPaths) {
    const buf = await sharp(p)
      .resize(targetWidth, targetHeight, { fit: "cover", position: "center" })
      .toBuffer();
    panelBuffers.push(buf);
  }

  // 1. Build Horizontal 4-in-1 Strip (Width: 576 * 4 = 2304, Height: 1024)
  const stripWidth = targetWidth * 4;
  await sharp({
    create: {
      width: stripWidth,
      height: targetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: panelBuffers[0], left: 0, top: 0 },
      { input: panelBuffers[1], left: targetWidth, top: 0 },
      { input: panelBuffers[2], left: targetWidth * 2, top: 0 },
      { input: panelBuffers[3], left: targetWidth * 3, top: 0 },
    ])
    .png({ quality: 95 })
    .toFile(stripPath);

  // 2. Build 2x2 Quadrant Grid (Width: 1024, Height: 1024)
  const quadW = 512;
  const quadH = 512;
  const quadBuffers: Buffer[] = [];
  for (const p of panelPaths) {
    const qBuf = await sharp(p)
      .resize(quadW, quadH, { fit: "cover", position: "center" })
      .toBuffer();
    quadBuffers.push(qBuf);
  }

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: quadBuffers[0], left: 0, top: 0 },
      { input: quadBuffers[1], left: quadW, top: 0 },
      { input: quadBuffers[2], left: 0, top: quadH },
      { input: quadBuffers[3], left: quadW, top: quadH },
    ])
    .png({ quality: 95 })
    .toFile(gridPath);

  console.log(`\n🎉 Stitched Multiview Assets Generated:`);
  console.log(`  • 4-in-1 Strip: file:///${stripPath.replace(/\\/g, "/")}`);
  console.log(`  • 2x2 Grid:     file:///${gridPath.replace(/\\/g, "/")}\n`);

  return {
    stripPath,
    gridPath,
    panelPaths,
  };
}

/**
 * Compiles prompt for Single-Pass 4-Panel Strip synthesis.
 */
export function compileSinglePassStripPrompt(
  config: MultiviewSuiteConfig
): CompiledScenePrompt {
  const persona = config.persona;
  const t = persona.traits;
  const isMale = persona.gender === "male";
  const genderTag = isMale ? "handsome male news anchor" : "striking female news anchor";

  const hairstyle = resolveHairstylePrompt(persona, config.hairstyleKey, config.customHairstyle);
  const attireDesc = config.attire?.description || t.defaultAttire || "Professional broadcast attire";
  const chroma = detectOptimalChroma(attireDesc, config.chromaMode === "none" ? undefined : config.chromaMode);

  const imagePaths: string[] = [];
  let subjectRefIdx: number | null = null;
  let attireRefIdx: number | null = null;

  const pPath = resolvePersonaAvatarPath(persona);
  if (pPath && fs.existsSync(pPath)) {
    imagePaths.push(pPath);
    subjectRefIdx = imagePaths.length;
  }

  if (config.attire?.relativePath) {
    const aPath = path.resolve(config.attire.relativePath);
    if (fs.existsSync(aPath)) {
      imagePaths.push(aPath);
      attireRefIdx = imagePaths.length;
    }
  }

  const prompt = `A 16:9 ultra-high-resolution photographic 4-panel horizontal character model sheet strip (multi-view reference chart) depicting the exact same ${t.age}-year-old ${genderTag} (${persona.name}) across 4 side-by-side synchronized camera angles against a solid, seamless, evenly-lit ${chroma.colorName} background (${chroma.hex}):

[MULTI-IMAGE REFERENCE BINDING]:
• SUBJECT IDENTITY: Match the exact anchor from Reference ${subjectRefIdx || 1} (${persona.name}) with natural facial anatomy, ${t.face}, ${t.skinTone || "natural skin tone"}, and physical build.
• HAIRSTYLE OVERRIDE: Hair styled identically across all 4 panels as: ${hairstyle} (override any conflicting hair in Reference 1).
• ATTIRE OVERRIDE: Dress the anchor identically across all 4 panels in: ${attireDesc} (do not copy the outfit in Reference 1).

[4-PANEL HORIZONTAL MULTI-VIEW STRIP LAYOUT]:
• PANEL 1 (FAR LEFT 25%): Front-facing 0-degree direct center waist-up view. Neutral upright anchor stance, both hands resting calmly in front at waist level. Direct calm gaze into camera.
• PANEL 2 (CENTER-LEFT 25%): 30-degree three-quarter view turned slightly toward the left. Friendly warm anchor smile, body angled 30 degrees while face looks toward camera, arms resting naturally in front.
• PANEL 3 (CENTER-RIGHT 25%): 30-degree three-quarter view turned slightly toward the right. Active speaking expression, right hand raised in an open explanatory palm delivery gesture, left hand resting at waist.
• PANEL 4 (FAR RIGHT 25%): Tight high-detail close-up portrait of the face, neck, and upper chest. Confident anchor smile, crisp catchlights in eyes, showing sharp micro-detail of hair strands, skin texture, and neckline accessories.

[LIGHTING & CHROMA KEY QUALITY]:
• Studio 3-point broadcast softbox lighting balanced at 5600K daylight.
• Flat, smooth, shadowless, uniform ${chroma.colorName} cyclorama backdrop with zero gradient and zero color spill on subject edges.
• Perfectly consistent identity, identical clothing, identical lighting, 8k raw photographic quality, character reference sheet masterpiece.`;

  const baseName = `${persona.id}_${config.attire.id}_4in1_multiview_strip`;

  return {
    prompt,
    imagePaths,
    baseName,
    aspectRatio: "16:9",
  };
}

/**
 * Compiles prompts for each of the 4 discrete keyframe shots.
 */
export function compileDiscrete4ShotPrompts(config: MultiviewSuiteConfig): {
  panelConfigs: { name: string; label: string; prompt: CompiledScenePrompt }[];
} {
  const persona = config.persona;
  const t = persona.traits;
  const isMale = persona.gender === "male";
  const genderTag = isMale ? "handsome male news anchor" : "striking female news anchor";
  const pronoun = isMale ? "he" : "she";
  const possessive = isMale ? "his" : "her";

  const hairstyle = resolveHairstylePrompt(persona, config.hairstyleKey, config.customHairstyle);
  const attireDesc = config.attire?.description || t.defaultAttire || "Professional broadcast attire";
  const chroma = detectOptimalChroma(attireDesc, config.chromaMode === "none" ? undefined : config.chromaMode);

  const imagePaths: string[] = [];
  let subjectRefIdx: number | null = null;
  let attireRefIdx: number | null = null;

  const pPath = resolvePersonaAvatarPath(persona);
  if (pPath && fs.existsSync(pPath)) {
    imagePaths.push(pPath);
    subjectRefIdx = imagePaths.length;
  }

  if (config.attire?.relativePath) {
    const aPath = path.resolve(config.attire.relativePath);
    if (fs.existsSync(aPath)) {
      imagePaths.push(aPath);
      attireRefIdx = imagePaths.length;
    }
  }

  const baseHeader = `A photorealistic vertical 9:16 (1080x1920) broadcast scene of ${persona.name} against a seamless ${chroma.colorName} (${chroma.hex}) cyclorama:
[MULTI-IMAGE REFERENCE BINDING]:
• SUBJECT IDENTITY: Match the exact ${t.age}-year-old ${genderTag} from Reference ${subjectRefIdx || 1} (${persona.name}) with natural facial anatomy, ${t.face}, ${t.skinTone || "natural skin tone"}, and physical build.
• HAIRSTYLE OVERRIDE: Hair styled as: ${hairstyle}.
• ATTIRE OVERRIDE: Dress the anchor in: ${attireDesc}.
• BACKGROUND: Solid, flat, seamless, evenly-illuminated ${chroma.colorName} (${chroma.hex}) studio cyclorama backdrop with zero shadows and zero color spill.
• LIGHTING: Professional 5600K broadcast 3-point lighting, clean catchlights, 8k raw photo quality.`;

  const panels = [
    {
      name: "01_center_neutral",
      label: "Panel 1: Frontal 0° Center Neutral",
      prompt: {
        prompt: `${baseHeader}
[FRAMING & POSE]:
• Camera: 0-degree dead-center front-facing waist-up framing (occupying 80% vertical height).
• Pose: Neutral upright posture, both hands resting calmly in front at waist level. Direct calm authoritative gaze into camera lens.`,
        imagePaths,
        baseName: `${persona.id}_${config.attire.id}_01_center_neutral`,
        aspectRatio: "9:16" as const,
      },
    },
    {
      name: "02_angle_left_30deg",
      label: "Panel 2: 30° Three-Quarter Turned Left",
      prompt: {
        prompt: `${baseHeader}
[FRAMING & POSE]:
• Camera: Shot at a 30-degree angle from the left, waist-up framing (occupying 80% vertical height).
• Pose: Body turned 30 degrees to the left while head and gaze turn smoothly toward camera. Warm engaging smile, arms relaxed in front.`,
        imagePaths,
        baseName: `${persona.id}_${config.attire.id}_02_angle_left_30deg`,
        aspectRatio: "9:16" as const,
      },
    },
    {
      name: "03_angle_right_gesture_30deg",
      label: "Panel 3: 30° Three-Quarter Turned Right with Hand Gesture",
      prompt: {
        prompt: `${baseHeader}
[FRAMING & POSE]:
• Camera: Shot at a 30-degree angle from the right, waist-up framing (occupying 80% vertical height).
• Pose: Body turned 30 degrees to the right while face engages camera with active dialogue delivery expression. Right hand raised in open explanatory palm gesture, left hand at waist.`,
        imagePaths,
        baseName: `${persona.id}_${config.attire.id}_03_angle_right_gesture_30deg`,
        aspectRatio: "9:16" as const,
      },
    },
    {
      name: "04_face_closeup",
      label: "Panel 4: High-Detail Facial Close-Up",
      prompt: {
        prompt: `${baseHeader}
[FRAMING & POSE]:
• Camera: Tight high-resolution close-up portrait of the head, face, neck, and upper collarbone.
• Pose: Confident broadcast smile, sharp iris reflections and eye catchlights, showing ultra-fine skin pores, hair texture, and necklace accessories.`,
        imagePaths,
        baseName: `${persona.id}_${config.attire.id}_04_face_closeup`,
        aspectRatio: "9:16" as const,
      },
    },
  ];

  return { panelConfigs: panels };
}

/**
 * Main orchestrator for generating the 4-in-1 multi-view reference suite.
 */
export async function runMultiviewSuiteGenerator(
  config: MultiviewSuiteConfig
): Promise<string | null> {
  console.log("\n==================================================================");
  console.log("🎬 NEWSSTUDIO — 4-IN-1 MULTI-VIEW CHARACTER REFERENCE STRIP SUITE");
  console.log("==================================================================");
  console.log(`Persona:        ${config.persona.name} [${config.persona.id}] (${config.persona.gender})`);
  console.log(`Attire:         ${config.attire.label}`);
  console.log(`Hairstyle:      ${config.hairstyleKey || "Signature"}`);
  console.log(`Chroma Mode:    ${config.chromaMode || "auto"}`);
  console.log(`Generation Mode:${config.mode === "discrete_4shot_stitch" ? "4-Shot Discrete Stitching" : "Single-Pass 4-Panel Strip"}`);
  console.log(`Engine:         ${(config.engine || "agy").toUpperCase()}\n`);

  const archiveDir = path.join(
    process.cwd(),
    "public",
    "avatars",
    `master_${config.persona.id}_archive`,
    "chroma_master_poses"
  );
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // Option 1: Single Pass 4-Panel Strip
  if (config.mode !== "discrete_4shot_stitch") {
    const compiled = compileSinglePassStripPrompt(config);

    console.log("------------------------------------------------------------------");
    console.log("Single-Pass 4-in-1 Strip Prompt:");
    console.log(`"${compiled.prompt}"`);
    console.log("------------------------------------------------------------------\n");

    let generatedPath: string | null = null;
    if (config.engine === "api") {
      generatedPath = await runWithApi(compiled);
    } else if (config.engine === "tool_json") {
      outputToolJson(compiled);
      return null;
    } else {
      generatedPath = await runWithAgy(compiled);
    }

    if (generatedPath && fs.existsSync(generatedPath)) {
      const targetStrip = path.join(archiveDir, `${config.persona.id}_${config.attire.id}_4in1_multiview_strip.png`);
      try {
        fs.copyFileSync(generatedPath, targetStrip);
        console.log(`💾 Saved archive master strip: file:///${targetStrip.replace(/\\/g, "/")}`);
      } catch (e) {}

      if (config.saveToDb) {
        await registerImageToDatabase({
          persona: config.persona,
          attire: config.attire.label,
          promptUsed: compiled.prompt,
          imageFilePath: targetStrip,
          isTransparent: false,
        });
      }
      return targetStrip;
    }
    return generatedPath;
  }

  // Option 2: 4-Shot Discrete Synthesis & Stitching
  const { panelConfigs } = compileDiscrete4ShotPrompts(config);
  const panelFiles: string[] = [];

  for (let i = 0; i < panelConfigs.length; i++) {
    const panel = panelConfigs[i];
    console.log(`\n------------------------------------------------------------------`);
    console.log(`[${i + 1}/4] ${panel.label}`);
    console.log(`Prompt: "${panel.prompt.prompt}"`);
    console.log(`------------------------------------------------------------------`);

    let pPath: string | null = null;
    if (config.engine === "api") {
      pPath = await runWithApi(panel.prompt);
    } else if (config.engine === "tool_json") {
      outputToolJson(panel.prompt);
    } else {
      pPath = await runWithAgy(panel.prompt);
    }

    if (pPath && fs.existsSync(pPath)) {
      panelFiles.push(pPath);
    }
  }

  if (panelFiles.length === 4) {
    const baseName = `${config.persona.id}_${config.attire.id}`;
    const stitched = await stitchMultiviewImages(panelFiles, baseName, archiveDir);

    if (config.saveToDb) {
      await registerImageToDatabase({
        persona: config.persona,
        attire: config.attire.label,
        promptUsed: "4-in-1 Stitched Multi-View Strip",
        imageFilePath: stitched.stripPath,
        isTransparent: false,
      });
    }

    return stitched.stripPath;
  }

  return null;
}
