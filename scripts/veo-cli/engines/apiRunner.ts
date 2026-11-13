/**
 * scripts/veo-cli/engines/apiRunner.ts
 *
 * Direct execution via Google GenAI SDK (@google/genai) for Google Veo (Veo 3.1 / Veo 2.0).
 */

import { CompiledVeoPrompt, VeoGenerationResult } from "../types";
import { getVeoActionLoopsDir, printClickablePath } from "../artifactManager";
import fs from "fs";
import path from "path";

export async function runVeoWithApi(compiled: CompiledVeoPrompt): Promise<VeoGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("\n❌ Error: GEMINI_API_KEY environment variable is not set in .env!");
    console.error("Please add GEMINI_API_KEY=your_key to .env\n");
    return { success: false, baseName: compiled.baseName, error: "GEMINI_API_KEY not found" };
  }

  const outputDir = getVeoActionLoopsDir();
  const outPath = path.join(outputDir, `${compiled.baseName}.mp4`);

  // Veo strictly requires 4 or 8 second duration blocks
  const apiDuration = compiled.durationSeconds <= 4 ? 4 : 8;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    // Model resolution & credit calculation (exact Gemini API endpoints)
    let targetModel = "veo-3.1-lite-generate-preview";
    let creditEstimate = "5 Flow credits (Veo Lite rate — 2,000 videos/mo)";
    let tierLabel = "🟢 Veo 3.1 Lite (Ultra Economy)";

    const modelStr = String(compiled.model || "");
    if (compiled.model === "veo-3.1-quality" || modelStr === "quality" || compiled.model === "veo-3.1-standard") {
      targetModel = "veo-3.1-generate-preview";
      creditEstimate = "100 Flow credits (Veo Quality rate)";
      tierLabel = "🟣 Veo 3.1 Quality (Master 4K)";
    } else if (compiled.model === "veo-3.1-fast" || modelStr === "fast") {
      targetModel = "veo-3.1-fast-generate-preview";
      creditEstimate = "10 Flow credits (Veo Fast rate)";
      tierLabel = "🟡 Veo 3.1 Fast (Standard)";
    } else {
      targetModel = "veo-3.1-lite-generate-preview";
      creditEstimate = "5 Flow credits (Veo Lite rate — 2,000 videos/mo)";
      tierLabel = "🟢 Veo 3.1 Lite (Ultra Economy)";
    }

    console.log(`\n⚡ Submitting request to Google Veo API...`);
    console.log(`Tier:          ${tierLabel}`);
    console.log(`Credit Cost:   🪙 ${creditEstimate}`);
    console.log(`Model ID:      ${targetModel}`);
    console.log(`Duration:      ${apiDuration}s (Veo native block)`);
    console.log(`Aspect Ratio:  ${compiled.aspectRatio || "16:9"}`);
    console.log(`Prompt:        "${compiled.prompt.substring(0, 100)}..."`);

    let imageSource: any = undefined;
    if (compiled.imagePath && fs.existsSync(compiled.imagePath)) {
      const imgBuffer = fs.readFileSync(compiled.imagePath);
      const mime = compiled.imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
      imageSource = {
        imageBytes: imgBuffer.toString("base64"),
        mimeType: mime,
      };
      console.log(`Reference I2V (First Frame): ${compiled.imagePath}`);
    }

    const payload: any = {
      model: targetModel,
      prompt: compiled.prompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: compiled.aspectRatio || "16:9",
        durationSeconds: apiDuration,
        personGeneration: "allow_adult",
      },
    };

    if (imageSource) {
      payload.image = imageSource;
      
      // Veo 3.1 First & Last Frame (FLF) native boundary pinning
      const lastFramePath = compiled.endImagePath || compiled.imagePath;
      if (lastFramePath && fs.existsSync(lastFramePath)) {
        const lastBuffer = fs.readFileSync(lastFramePath);
        const lastMime = lastFramePath.endsWith(".png") ? "image/png" : "image/jpeg";
        payload.config.lastFrame = {
          imageBytes: lastBuffer.toString("base64"),
          mimeType: lastMime,
        };
        console.log(`Pinned End Frame (FLF Loop Closure): ${lastFramePath}`);
      }
    }

    // Call generateVideos
    let operation = await ai.models.generateVideos(payload);
    console.log("\n⏳ Video generation job queued on Google Veo cluster.");
    console.log("Polling for completion (typically takes 45–90 seconds)...");

    let attempts = 0;
    while (!operation.done && attempts < 40) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      attempts++;
      process.stdout.write(" ⏱️ ");

      try {
        operation = await ai.operations.getVideosOperation({
          operation: (operation as any).name || (operation as any),
        });
      } catch (pollErr: any) {
        // Continue polling
      }
    }
    console.log("\n");

    const videoObj = operation.response?.generatedVideos?.[0]?.video;
    let videoBuffer: Buffer | null = null;

    if (videoObj?.videoBytes) {
      videoBuffer = Buffer.from(videoObj.videoBytes, "base64");
    } else if (videoObj?.uri) {
      console.log(`Downloading generated video stream from Cloud URI...`);
      const resp = await fetch(videoObj.uri);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        videoBuffer = Buffer.from(arrayBuf);
      }
    }

    if (videoBuffer && videoBuffer.length > 0) {
      fs.writeFileSync(outPath, videoBuffer);
      const { validateVideoIntegrity } = await import("../processors/videoIntegrityGuard");
      const integrity = validateVideoIntegrity(outPath);

      if (!integrity.valid) {
        console.error(`❌ Video integrity check failed: ${integrity.error}`);
        return { success: false, baseName: compiled.baseName, error: integrity.error };
      }

      console.log(`\n🎉 Veo Video Generated & Saved to Workspace Successfully! (${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB, SHA: ${integrity.sha256.slice(0, 10)})`);
      printClickablePath(outPath);

      return {
        success: true,
        videoPath: outPath,
        durationSeconds: apiDuration,
        baseName: compiled.baseName,
      };
    } else {
      console.error("❌ No video bytes or URI returned by the Veo operation.");
      return { success: false, baseName: compiled.baseName, error: "Empty video payload" };
    }
  } catch (err: any) {
    console.error("\n❌ Google GenAI Veo Error:", err.message || err);
    return { success: false, baseName: compiled.baseName, error: err.message || String(err) };
  }
}
