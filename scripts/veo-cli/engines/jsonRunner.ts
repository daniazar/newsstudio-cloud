/**
 * scripts/veo-cli/engines/jsonRunner.ts
 *
 * Formats and prints exact Google Veo tool payload for IDE/Chat inspection.
 */

import { CompiledVeoPrompt, VeoGenerationResult } from "../types";
import { getVeoActionLoopsDir } from "../artifactManager";
import path from "path";

export function outputVeoJson(compiled: CompiledVeoPrompt): VeoGenerationResult {
  const payload = {
    Model: compiled.model,
    DurationSeconds: compiled.durationSeconds,
    AspectRatio: compiled.aspectRatio,
    BaseName: compiled.baseName,
    ImagePath: compiled.imagePath,
    Prompt: compiled.prompt,
    toolAction: `Generating Veo video clip (${compiled.baseName})`,
    toolSummary: `Generate Veo video ${compiled.baseName}`,
  };

  console.log("📋 Exact Google Veo Generation Payload:\n");
  console.log(JSON.stringify(payload, null, 2));

  const expectedPath = path.join(getVeoActionLoopsDir(), `${compiled.baseName}.mp4`).replace(/\\/g, "/");
  console.log("\n📁 Expected Destination (Alt + Click to Open after generation):");
  console.log(`file:///${expectedPath}\n`);

  return { success: true, videoPath: expectedPath, durationSeconds: compiled.durationSeconds, baseName: compiled.baseName };
}
