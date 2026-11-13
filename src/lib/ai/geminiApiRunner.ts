/**
 * src/lib/ai/geminiApiRunner.ts
 *
 * Backend utility for running Gemini / Imagen 3 image generation
 * with fallback asset resolution when offline or API key is absent.
 */

import fs from "fs";
import path from "path";

export interface GenerateImageOptions {
  prompt: string;
  baseName: string;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "32:9";
  imagePaths?: string[];
  fallbackCandidateNames?: string[];
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl: string;
  localPath?: string;
  source: "api" | "fallback" | "simulated";
  error?: string;
}

export async function executeGeminiImageGeneration(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const { prompt, baseName, aspectRatio, fallbackCandidateNames = [] } = options;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // 1. If API key is present, invoke Google GenAI Imagen 3
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      // Supported aspect ratios for Imagen: "1:1", "3:4", "4:3", "9:16", "16:9"
      const apiAspectRatio = (["16:9", "9:16", "1:1", "4:3", "3:4"].includes(aspectRatio)
        ? aspectRatio
        : "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: apiAspectRatio,
          outputMimeType: "image/png",
        },
      });

      const generated = response.generatedImages?.[0];
      if (generated?.image?.imageBytes) {
        const outputDir = path.join(
          process.cwd(),
          "public",
          "studio_environments",
          "composited_scenes"
        );
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outFileName = `${baseName}.png`;
        const outPath = path.join(outputDir, outFileName);
        const buffer = Buffer.from(generated.image.imageBytes, "base64");
        fs.writeFileSync(outPath, buffer);

        return {
          success: true,
          imageUrl: `/studio_environments/composited_scenes/${outFileName}`,
          localPath: outPath,
          source: "api",
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Gemini API Warning] Generation failed:", msg);
      // Fall through to fallback resolution
    }
  }

  // 2. Check for matching pre-composited scenes in public/studio_environments/composited_scenes/
  const compositedDir = path.join(
    process.cwd(),
    "public",
    "studio_environments",
    "composited_scenes"
  );
  if (fs.existsSync(compositedDir)) {
    const files = fs.readdirSync(compositedDir);
    const searchKeys = [baseName, ...fallbackCandidateNames].filter(Boolean);

    for (const key of searchKeys) {
      const lowerKey = key.toLowerCase();
      const match = files.find((f) => {
        const lowerF = f.toLowerCase();
        return lowerF.includes(lowerKey) || lowerKey.includes(lowerF.replace(/\.[^/.]+$/, ""));
      });

      if (match) {
        return {
          success: true,
          imageUrl: `/studio_environments/composited_scenes/${match}`,
          localPath: path.join(compositedDir, match),
          source: "fallback",
        };
      }
    }
  }

  // 3. Fallback: check if there's any file matching persona keywords in public/avatars/
  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  if (fs.existsSync(avatarsDir)) {
    const avatarFiles = fs.readdirSync(avatarsDir);
    for (const key of fallbackCandidateNames) {
      const match = avatarFiles.find((f) => f.toLowerCase().includes(key.toLowerCase()));
      if (match) {
        return {
          success: true,
          imageUrl: `/avatars/${match}`,
          localPath: path.join(avatarsDir, match),
          source: "fallback",
        };
      }
    }
  }

  // Default fallback image
  return {
    success: true,
    imageUrl: "/studio_environments/section_01_anchor_desk_centered_closeup.jpg",
    source: "fallback",
  };
}
