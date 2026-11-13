/**
 * scripts/veo-cli/generators/characterTurnaroundGenerator.ts
 *
 * Generates 4-in-1 multi-angle character turnaround sheets
 * (Front, 45° Left, 45° Right, Profile) on pure chroma green for Google Flow / Veo 3.1.
 */

import { CompiledVeoPrompt, VeoEngineType, VeoGenerationResult } from "../types";
import { compileTurnaroundSheetPrompt } from "../promptCompiler";
import { getFlowCharacterConfig } from "../flowCharacterRegistry";
import { outputVeoJson } from "../engines/jsonRunner";
import { printClickablePath } from "../artifactManager";
import path from "path";
import fs from "fs";

export interface TurnaroundOptions {
  personaSlug?: string;
  attire?: string;
  engine?: VeoEngineType;
  durationSeconds?: 4 | 8;
  aspectRatio?: "16:9" | "9:16";
  slice?: boolean;
  dryRun?: boolean;
}

export async function runCharacterTurnaroundGenerator(opts: TurnaroundOptions): Promise<VeoGenerationResult> {
  const personaSlug = opts.personaSlug || "ruby";
  const flowConfig = getFlowCharacterConfig(personaSlug);
  const engine = opts.engine || "flow_web";
  const attire = opts.attire || flowConfig.defaultAttire;
  const ratio = opts.aspectRatio || "16:9";
  const duration = opts.durationSeconds || 8;

  const prompt = compileTurnaroundSheetPrompt({
    personaName: flowConfig.characterName,
    characterTag: flowConfig.tag,
    attire,
    hairStyle: flowConfig.hairDescription,
    aspectRatio: ratio,
    chromaMode: "green",
  });

  const baseName = `flow_${personaSlug}_turnaround_sheet_${Date.now().toString().slice(-4)}`;

  const compiled: CompiledVeoPrompt = {
    prompt,
    imagePath: flowConfig.headshotPath,
    aspectRatio: ratio,
    durationSeconds: duration as any,
    fps: 30,
    resolution: "1080p",
    baseName,
    model: "veo-3.1-quality",
    attire,
    characterTag: flowConfig.tag,
    motionMode: "character_turnaround",
  };

  console.log("\n==================================================================");
  console.log(`👤 GENERATING CHARACTER TURNAROUND SHEET: [${flowConfig.characterName}]`);
  console.log("==================================================================");
  console.log(`Persona:      ${flowConfig.characterName} (${flowConfig.tag})`);
  console.log(`Attire:       ${attire}`);
  console.log(`Aspect Ratio: ${ratio} (4-in-1 Panoramic Strip)`);
  console.log(`Engine:       ${engine}`);

  if (opts.dryRun) {
    console.log("\n[DRY RUN] Compiled Turnaround Prompt:\n", prompt);
    return { success: true, baseName, durationSeconds: duration };
  }

  let result: VeoGenerationResult;
  if (engine === "flow_web") {
    const { runVeoWithFlowWeb } = await import("../engines/flowWebRunner");
    result = await runVeoWithFlowWeb(compiled);
  } else if (engine === "agy") {
    const { runVeoWithAgy } = await import("../engines/agyRunner");
    result = await runVeoWithAgy(compiled);
  } else if (engine === "api") {
    const { runVeoWithApi } = await import("../engines/apiRunner");
    result = await runVeoWithApi(compiled);
  } else {
    result = outputVeoJson(compiled);
  }

  if (result.success && result.videoPath) {
    console.log(`\n🎉 Character Turnaround Video Complete:`);
    printClickablePath(result.videoPath);

    if (opts.slice !== false) {
      try {
        const { sliceTurnaroundSheet } = await import("../processors/turnaroundSlicer");
        await sliceTurnaroundSheet(result.videoPath, personaSlug);
      } catch (err: any) {
        console.warn("⚠️ Turnaround sheet slicer notice:", err.message);
      }
    }
  }

  return result;
}
