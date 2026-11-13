/**
 * scripts/gemini-cli/engines/agyRunner.ts
 *
 * Dispatches image generation prompt to Antigravity CLI (agy) using a dedicated
 * PowerShell runner script to eliminate quote parsing errors and argument truncation.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { CompiledScenePrompt } from "../types";
import { findAndSyncArtifact, printClickablePath, getCompositedScenesDir } from "../artifactManager";

export async function runWithAgy(compiled: CompiledScenePrompt): Promise<string | null> {
  console.log("🚀 Spawning Antigravity CLI (agy) with multi-image conditioning...\n");

  const startTimeMs = Date.now();
  const outputDir = (compiled as any).outputPath ? path.dirname((compiled as any).outputPath) : getCompositedScenesDir();

  // Format valid ImagePaths (Max 3)
  const pathsFormatted = compiled.imagePaths
    .slice(0, 3)
    .map((p) => p.replace(/\\/g, "/"));

  // Sanitize prompt: convert internal quotes to single quotes to prevent argument truncation
  const cleanPrompt = compiled.prompt.replace(/[\r\n]+/g, " ").replace(/"/g, "'").trim();

  const agyPrompt = `DIRECT TOOL INSTRUCTION: Call generate_image immediately with these exact parameters:
AspectRatio: "${compiled.aspectRatio || "16:9"}"
ImageName: "${compiled.baseName}"
ImagePaths: ${JSON.stringify(pathsFormatted)}
Prompt: "${cleanPrompt}"

IMPORTANT: Do not call read_file, view_file, or search tools. Directly call generate_image tool.`;

  const geminiDir = path.join(process.cwd(), ".gemini");
  if (!fs.existsSync(geminiDir)) {
    fs.mkdirSync(geminiDir, { recursive: true });
  }

  const tempPromptFile = path.join(geminiDir, "temp_agy_prompt.txt");
  const tempScriptFile = path.join(geminiDir, "run_agy.ps1");

  fs.writeFileSync(tempPromptFile, agyPrompt, "utf8");

  const psScriptContent = `
$ErrorActionPreference = 'Continue'
Get-Content -Path '${tempPromptFile.replace(/\\/g, "/")}' -Raw -Encoding UTF8 | & agy --dangerously-skip-permissions --print-timeout 15m
`;

  fs.writeFileSync(tempScriptFile, psScriptContent, "utf8");

  try {
    console.log(`Executing agy prompt via PowerShell script runner...`);

    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScriptFile], {
      stdio: "inherit",
      windowsHide: true,
    });

    if (result.error) {
      console.error("❌ AGY Process Error:", result.error.message);
    }

    const syncedPath = findAndSyncArtifact(compiled.baseName, startTimeMs, (compiled as any).outputPath);
    if (syncedPath) {
      console.log(`\n🎉 Scene Generated & Saved to Destination Directory Successfully!`);
      printClickablePath(syncedPath);
      return syncedPath;
    }

    console.log(`\n⚠️ No new image file was detected from this generation run.`);
    console.log(`📁 Target Directory: file:///${outputDir.replace(/\\/g, "/")}\n`);
    return null;
  } catch (err: any) {
    console.error("❌ Failed to execute agy:", err.message || err);
    return null;
  }
}
