/**
 * scripts/gemini-cli/engines/jsonRunner.ts
 *
 * Formats and prints exact generate_image tool payload for IDE/Chat inspection.
 */

import { CompiledScenePrompt } from "../types";
import { getCompositedScenesDir } from "../artifactManager";
import path from "path";

export function outputToolJson(compiled: CompiledScenePrompt) {
  const payload = {
    ImageName: compiled.baseName,
    AspectRatio: compiled.aspectRatio,
    ImagePaths: compiled.imagePaths,
    Prompt: compiled.prompt,
    toolAction: `Generating multi-reference broadcast scene (${compiled.baseName})`,
    toolSummary: `Compose ${compiled.baseName}`,
  };

  console.log("📋 Exact `generate_image` Tool Call Payload:\n");
  console.log(JSON.stringify(payload, null, 2));

  const expectedPath = path.join(getCompositedScenesDir(), `${compiled.baseName}.jpg`).replace(/\\/g, "/");
  console.log("\n📁 Expected Destination (Alt + Click to Open after generation):");
  console.log(`file:///${expectedPath}\n`);
}
