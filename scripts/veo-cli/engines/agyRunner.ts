/**
 * scripts/veo-cli/engines/agyRunner.ts
 *
 * Orchestrates autonomous video generation using Antigravity CLI (agy)
 * with Google Flow MCP (flow.google.com), flowWebRunner, and graceful fallback.
 *
 * Always enforces Veo 3.1 Lite rate (5 credits) and 8s duration per user specification.
 */

import { CompiledVeoPrompt, VeoGenerationResult } from "../types";
import { runVeoWithFlowWeb } from "./flowWebRunner";
import { runVeoWithApi } from "./apiRunner";
import { findAndSyncVideoArtifact, getVeoActionLoopsDir, printClickablePath } from "../artifactManager";
import { ensureChromeDebugRunning } from "./chromeBootstrapper";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

export async function runVeoWithAgy(compiled: CompiledVeoPrompt): Promise<VeoGenerationResult> {
  console.log("\n==================================================================");
  console.log("🚀 DISPATCHING VEO GENERATION VIA ANTIGRAVITY CLI (AGY)");
  console.log("==================================================================");

  // Ensure Chrome remote debugging is active on port 9222
  try {
    await ensureChromeDebugRunning();
  } catch {}

  // Force Veo 3.1 Lite and 8s duration per specification
  const effectiveDuration = 8;
  const effectiveModel = "veo-3.1-lite";
  const aspectRatio = compiled.aspectRatio || "9:16";

  const startTimeMs = Date.now();
  const outputDir = compiled.outputDirectory
    ? path.resolve(process.cwd(), compiled.outputDirectory)
    : getVeoActionLoopsDir();

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const targetOutFile = path.join(outputDir, `${compiled.baseName}.mp4`);

  // Collect reference images
  const refImages: string[] = [];
  if (compiled.imagePath && fs.existsSync(compiled.imagePath)) {
    refImages.push(path.resolve(compiled.imagePath));
  }
  if (compiled.referenceImagePaths && compiled.referenceImagePaths.length > 0) {
    for (const r of compiled.referenceImagePaths) {
      if (fs.existsSync(r) && !refImages.includes(path.resolve(r))) {
        refImages.push(path.resolve(r));
      }
    }
  }

  console.log(`Model:         ${effectiveModel} (Veo 3.1 Lite rate)`);
  console.log(`Duration:      ${effectiveDuration}s`);
  console.log(`Aspect Ratio:  ${aspectRatio}`);
  console.log(`Output File:   ${targetOutFile}`);
  console.log(`Reference Img: ${refImages.length} photo(s) attached`);

  // -------------------------------------------------------------
  // STRATEGY A (PRIMARY): Direct Flow Web Runner (Puppeteer Chrome CDP)
  // Connects directly to Chrome CDP on port 9222, attaches ingredients,
  // clicks generate, and downloads via signed RPC within 60-90s.
  // -------------------------------------------------------------
  try {
    console.log("🚀 Executing Autonomous Web Runner for Google Flow (flow.google.com)...");
    const flowResult = await runVeoWithFlowWeb({
      ...compiled,
      referenceImagePaths: refImages,
      imagePath: refImages[0] || compiled.imagePath,
      durationSeconds: effectiveDuration,
      model: effectiveModel,
      aspectRatio,
      outputDirectory: outputDir,
    });

    if (flowResult && flowResult.success && flowResult.videoPath && fs.existsSync(flowResult.videoPath)) {
      return flowResult;
    }
    console.warn("⚠️ Flow Web Runner did not produce final file, trying secondary AGY subshell fallback...");
  } catch (flowErr: any) {
    console.warn("⚠️ Flow Web Runner error:", flowErr?.message || flowErr);
  }

  // -------------------------------------------------------------
  // STRATEGY B: Antigravity CLI Execution (agy) Fallback
  // -------------------------------------------------------------
  try {
    const cleanPrompt = compiled.prompt.replace(/[\r\n]+/g, " ").replace(/"/g, "'").trim();
    const formattedRefs = refImages.map((p) => p.replace(/\\/g, "/"));

    const agyPromptLines = [
      "DIRECT TOOL INSTRUCTION: Generate an 8-second Google Veo video using google-flow-mcp:",
      `1. Call tool flow_settings with: action="set", model="Veo 3.1 Lite", duration_seconds=8, aspect_ratio="${aspectRatio}".`,
    ];

    if (formattedRefs.length > 0) {
      agyPromptLines.push(`2. Upload the following product photo reference(s) using tool flow_upload_media:`);
      formattedRefs.forEach((refPath, idx) => {
        agyPromptLines.push(`   - Photo ${idx + 1}: "${refPath}"`);
      });
      agyPromptLines.push(
        `3. Call tool flow_generate_video with:`,
        `   - prompt: "${cleanPrompt}"`,
        `   - expected_max_cost: 10`,
        `   - out_file: "${targetOutFile.replace(/\\/g, "/")}"`,
        `   - timeout_seconds: 480`
      );
    } else {
      agyPromptLines.push(
        `2. Call tool flow_generate_video with:`,
        `   - prompt: "${cleanPrompt}"`,
        `   - expected_max_cost: 10`,
        `   - out_file: "${targetOutFile.replace(/\\/g, "/")}"`,
        `   - timeout_seconds: 480`
      );
    }

    agyPromptLines.push(
      `4. Verify that the video is saved to "${targetOutFile.replace(/\\/g, "/")}".`,
      `IMPORTANT: Do not call search or file editing tools. Execute the Flow MCP generation directly.`
    );

    const fullAgyPrompt = agyPromptLines.join("\n");

    const geminiDir = path.join(process.cwd(), ".gemini");
    if (!fs.existsSync(geminiDir)) {
      fs.mkdirSync(geminiDir, { recursive: true });
    }

    const tempPromptFile = path.join(geminiDir, "temp_veo_agy_prompt.txt");
    const tempScriptFile = path.join(geminiDir, "run_veo_agy.ps1");

    fs.writeFileSync(tempPromptFile, fullAgyPrompt, "utf8");

    const psScriptContent = `
$ErrorActionPreference = 'Continue'
Get-Content -Path '${tempPromptFile.replace(/\\/g, "/")}' -Raw -Encoding UTF8 | & agy --dangerously-skip-permissions --print-timeout 5m
`;
    fs.writeFileSync(tempScriptFile, psScriptContent, "utf8");

    console.log("⚡ Executing AGY prompt via PowerShell runner...");
    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScriptFile], {
      stdio: "inherit",
      windowsHide: true,
      timeout: 300000,
    });

    if (result.error) {
      console.warn("⚠️ AGY process notice:", result.error.message);
    }

    const syncedPath = findAndSyncVideoArtifact(compiled.baseName, startTimeMs, targetOutFile);
    if (syncedPath && fs.existsSync(syncedPath)) {
      console.log(`\n🎉 Veo Scene Generated Successfully via AGY!`);
      printClickablePath(syncedPath);
      return {
        success: true,
        videoPath: syncedPath,
        durationSeconds: effectiveDuration,
        baseName: compiled.baseName,
      };
    }
  } catch (agyErr: any) {
    console.warn("⚠️ AGY runner error:", agyErr?.message || agyErr);
  }

  // Check if target file was generated and saved
  if (fs.existsSync(targetOutFile) && fs.statSync(targetOutFile).size > 100000) {
    console.log(`\n🎉 Verified generated video artifact on disk: ${targetOutFile}`);
    printClickablePath(targetOutFile);
    return {
      success: true,
      videoPath: targetOutFile,
      durationSeconds: effectiveDuration,
      baseName: compiled.baseName,
    };
  }

  // Check action loops directory fallback
  const actionLoopsFallback = path.join(getVeoActionLoopsDir(), `${compiled.baseName}.mp4`);
  if (fs.existsSync(actionLoopsFallback) && fs.statSync(actionLoopsFallback).size > 100000) {
    try {
      fs.copyFileSync(actionLoopsFallback, targetOutFile);
    } catch {}
    console.log(`\n🎉 Synced generated video from action_loops: ${targetOutFile}`);
    printClickablePath(targetOutFile);
    return {
      success: true,
      videoPath: targetOutFile,
      durationSeconds: effectiveDuration,
      baseName: compiled.baseName,
    };
  }

  // -------------------------------------------------------------
  // STRATEGY C: Direct Google GenAI API Fallback (Only if API backend is explicitly configured)
  // -------------------------------------------------------------
  const configuredBackend = (process.env.VEO_VIDEO_BACKEND || "cli").toLowerCase();
  if (configuredBackend === "api") {
    console.warn("⚠️ Flow runner fallback to Google GenAI API...");
    return await runVeoWithApi({
      ...compiled,
      durationSeconds: effectiveDuration,
      model: effectiveModel,
      aspectRatio,
    });
  }

  throw new Error("Veo generation could not complete via Antigravity CLI or Google Flow. Please check that Chrome is running with remote debugging on port 9222.");
}

