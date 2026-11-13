/**
 * scripts/gemini-cli/turntableGenerator.ts
 *
 * NewsStudio 8-Angle 360° Character Turntable Generator.
 * Produces full 360-degree rotation character model sheets:
 *   1. 0°   — Frontal Neutral
 *   2. 45°  — Front-Right 3/4 View
 *   3. 90°  — Right Hard Profile
 *   4. 135° — Back-Right 3/4 View
 *   5. 180° — Direct Back View
 *   6. 225° — Back-Left 3/4 View
 *   7. 270° — Left Hard Profile
 *   8. 315° — Front-Left 3/4 View
 */

import fs from "fs";
import path from "path";
import { Persona } from "../../src/lib/tts/personas";
import { PersonaAttire, CompiledScenePrompt } from "./types";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { detectOptimalChroma } from "./chromaDetector";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";

export interface TurntableOptions {
  persona: Persona;
  attire: PersonaAttire;
  hairstyleKey?: string;
  useChroma?: boolean;
  chromaMode?: "auto" | "green" | "blue";
  angles?: 4 | 8;
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  preview?: boolean;
}

export function compileTurntableSinglePrompt(
  persona: Persona,
  attire: PersonaAttire,
  chromaColorHex: string,
  chromaName: string,
  angles: 4 | 8 = 4
): CompiledScenePrompt {
  const t = persona.traits;
  const genderTag = persona.gender === "male" ? "male news anchor" : "female news anchor";
  const hairstyle = resolveHairstylePrompt(persona, "signature");
  const avatarPath = resolvePersonaAvatarPath(persona);

  if (angles === 4) {
    const prompt = `A professional 4-view 360-degree character turnaround model sheet and animation production blueprint for ${t.age}-year-old ${genderTag} ${persona.name} on flat shadowless ${chromaName} (${chromaColorHex}):
[CHARACTER CONTINUITY & LIKENESS]:
• Use Reference 1 ONLY to match the facial likeness, ${t.face}, ${t.skinTone || "natural skin tone"}, ${hairstyle}, and authentic identity traits of ${persona.name}.
• WARDROBE: Identical ${attire.description} across all 4 views.

[4-VIEW TURNAROUND MODEL SHEET LAYOUT]:
A single widescreen 16:9 master character reference sheet featuring 4 sequential full-body standing poses rotating 360 degrees, evenly spaced horizontally from left to right:
1. 0° Frontal View: Standing upright facing camera, neutral composed facial expression, arms naturally relaxed at sides, shoes visible.
2. 90° Right Profile: Sharp full-body right side view showcasing side silhouette, posture, hairstyle depth, and garment tailoring.
3. 180° Direct Back View: Direct rear view showcasing jacket back tailoring, waistline, shoulder drape, and hair cascade.
4. 270° Left Profile: Sharp full-body left side view ensuring complete bilateral symmetry and volumetric body continuity.
All figures in uniform scale, head-to-toe full length, on flat shadowless ${chromaName} studio cyclorama floor, 5600K broadcast lighting, 8k raw photo quality, photorealistic 3D character design reference.`;

    return {
      prompt,
      imagePaths: avatarPath ? [avatarPath] : [],
      baseName: `${persona.id}_4view_turntable_${attire.id}`,
      aspectRatio: "16:9",
    };
  }

  const prompt = `A comprehensive 9-panel professional character model sheet and production blueprint for ${t.age}-year-old ${genderTag} ${persona.name} on flat ${chromaName} (${chromaColorHex}):
[CHARACTER CONTINUITY & LIKENESS]:
• Use Reference 1 ONLY to match the facial likeness, ${t.face}, ${t.skinTone || "natural skin tone"}, ${hairstyle}, and authentic identity traits of ${persona.name}.
• WARDROBE: Identical ${attire.description} across all panels.

[9-PANEL MASTER BLUEPRINT LAYOUT]:
A single widescreen 16:9 master character reference sheet divided into two distinct sections:
• SECTION 1 (LEFT 1/3 OF FRAME): Large high-resolution vertical portrait close-up of ${persona.name}'s face from the shoulders up, capturing exquisite facial pores, eye catchlights, subtle smile, and micro skin details.
• SECTION 2 (RIGHT 2/3 OF FRAME): 8 sequential full-body standing poses rotating 360 degrees:
  1. 0° Front | 2. 45° Front-Right | 3. 90° Right Profile | 4. 135° Back-Right | 5. 180° Back | 6. 225° Back-Left | 7. 270° Left Profile | 8. 315° Front-Left.
All figures on flat shadowless ${chromaName} studio cyclorama floor, 5600K broadcast lighting, 8k raw concept art and 3D production model sheet quality.`;

  return {
    prompt,
    imagePaths: avatarPath ? [avatarPath] : [],
    baseName: `${persona.id}_9panel_turntable_${attire.id}`,
    aspectRatio: "16:9",
  };
}


export async function runTurntableMode(options: TurntableOptions): Promise<string | null> {
  const persona = options.persona;
  const attire = options.attire;
  const angles = options.angles || 4;
  const chromaInfo = detectOptimalChroma(attire.description, options.chromaMode || "green");

  console.log("\n==================================================================");
  console.log(`🪞 NEWSSTUDIO — ${angles}-ANGLE 360° CHARACTER TURNTABLE GENERATOR`);
  console.log("==================================================================");
  console.log(`Persona:   ${persona.name} [${persona.id}]`);
  console.log(`Attire:    ${attire.label}`);
  console.log(`Angles:    ${angles}-View Turnaround`);
  console.log(`Backdrop:  ${chromaInfo.label}`);
  console.log(`Engine:    ${options.engine.toUpperCase()}\n`);

  const compiled = compileTurntableSinglePrompt(
    persona,
    attire,
    chromaInfo.hex,
    chromaInfo.colorName || "Chroma Green",
    angles
  );
  console.log(`Image Name: ${compiled.baseName}`);
  console.log(`\nPrompt:\n"${compiled.prompt}"\n`);

  if (options.dryRun) {
    console.log("ℹ️ [DRY-RUN] Turntable prompt compiled successfully without invoking generator.\n");
    return null;
  }

  let generatedPath: string | null = null;
  if (options.engine === "agy") {
    generatedPath = await runWithAgy(compiled);
  } else if (options.engine === "api") {
    generatedPath = await runWithApi(compiled);
  } else {
    outputToolJson(compiled);
  }

  if (generatedPath && options.preview) {
    await renderTerminalImagePreview(generatedPath, 64);
  }

  return generatedPath;
}
