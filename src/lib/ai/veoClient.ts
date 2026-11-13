/**
 * src/lib/ai/veoClient.ts
 *
 * Dedicated client for Google Veo 3.1 & Veo 2.0 API video generation via @google/genai SDK.
 * Supports image-to-video (I2V), first-and-last frame (FLF) loop closures, and high-fidelity video synthesis.
 */

import fs from "fs";
import path from "path";
import { env } from "../env";

export interface VeoGenerationOptions {
  prompt: string;
  imagePath?: string;
  endImagePath?: string;
  durationSeconds?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  model?: "veo-3.1-fast" | "veo-3.1-lite" | "veo-3.1-quality" | string;
  outputPath?: string;
  onProgress?: (status: string, progressPct: number) => void;
}

export interface VeoGenerationResult {
  success: boolean;
  videoBuffer?: Buffer;
  outputPath?: string;
  durationSeconds?: number;
  error?: string;
}

/**
 * Checks whether the environment is configured with a valid Google Gemini/Veo API key.
 */
export function isVeoConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/**
 * Generates video via direct Google GenAI Veo API call.
 */
export async function generateVeoVideo(opts: VeoGenerationOptions): Promise<VeoGenerationResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "GEMINI_API_KEY is not configured in environment variables",
    };
  }

  // Veo strictly requires 4 or 8 second duration blocks
  const targetDuration = (opts.durationSeconds || 8) <= 4 ? 4 : 8;
  const aspectRatio = opts.aspectRatio || "16:9";

  // Map user-friendly model aliases to official Gemini API endpoint IDs
  let targetModel = "veo-3.1-lite-generate-preview";
  const modelStr = String(opts.model || "").toLowerCase();
  if (modelStr.includes("quality") || modelStr.includes("standard")) {
    targetModel = "veo-3.1-generate-preview";
  } else if (modelStr.includes("fast")) {
    targetModel = "veo-3.1-fast-generate-preview";
  } else {
    targetModel = "veo-3.1-lite-generate-preview";
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    opts.onProgress?.("Submitting prompt to Google Veo API...", 5);

    let imageSource: { imageBytes: string; mimeType: string } | undefined = undefined;
    if (opts.imagePath && fs.existsSync(opts.imagePath)) {
      const imgBuffer = fs.readFileSync(opts.imagePath);
      const isPng = opts.imagePath.toLowerCase().endsWith(".png");
      imageSource = {
        imageBytes: imgBuffer.toString("base64"),
        mimeType: isPng ? "image/png" : "image/jpeg",
      };
    }

    const config: Record<string, unknown> = {
      numberOfVideos: 1,
      aspectRatio,
      durationSeconds: targetDuration,
      personGeneration: "allow_adult",
    };

    const payload: {
      model: string;
      prompt: string;
      image?: unknown;
      config: Record<string, unknown>;
    } = {
      model: targetModel,
      prompt: opts.prompt,
      config,
    };

    if (imageSource) {
      payload.image = imageSource;

      // First & Last Frame (FLF) loop boundary pinning
      const lastPath = opts.endImagePath || opts.imagePath;
      if (lastPath && fs.existsSync(lastPath)) {
        const lastBuffer = fs.readFileSync(lastPath);
        const isPng = lastPath.toLowerCase().endsWith(".png");
        config.lastFrame = {
          imageBytes: lastBuffer.toString("base64"),
          mimeType: isPng ? "image/png" : "image/jpeg",
        };
      }
    }

    opts.onProgress?.("Queued on Google Veo cluster...", 15);
    let operation = await ai.models.generateVideos(payload as Parameters<typeof ai.models.generateVideos>[0]);

    let attempts = 0;
    const maxAttempts = 40;

    while (!operation.done && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      attempts++;
      const currentPct = Math.min(90, 15 + Math.round((attempts / maxAttempts) * 75));
      opts.onProgress?.(`Synthesizing Veo video (poll ${attempts}/${maxAttempts})...`, currentPct);

      try {
        operation = await ai.operations.getVideosOperation({
          operation,
        });
      } catch {
        // Continue polling unless fatal
      }
    }

    const videoObj = operation.response?.generatedVideos?.[0]?.video;
    let videoBuffer: Buffer | null = null;

    if (videoObj?.videoBytes) {
      videoBuffer = Buffer.from(videoObj.videoBytes, "base64");
    } else if (videoObj?.uri) {
      opts.onProgress?.("Downloading generated video stream...", 95);
      const resp = await fetch(videoObj.uri);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        videoBuffer = Buffer.from(arrayBuf);
      }
    }

    if (!videoBuffer || videoBuffer.length === 0) {
      return {
        success: false,
        error: "Google Veo API completed without returning video bytes or download URI",
      };
    }

    if (opts.outputPath) {
      const outDir = path.dirname(opts.outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(opts.outputPath, videoBuffer);
    }

    opts.onProgress?.("Veo video generation complete", 100);

    return {
      success: true,
      videoBuffer,
      outputPath: opts.outputPath,
      durationSeconds: targetDuration,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [VeoClient] Generation failed:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
