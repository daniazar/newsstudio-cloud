/**
 * scripts/gemini-cli/engines/apiRunner.ts
 *
 * Direct execution via Google GenAI SDK (@google/genai).
 */

import { CompiledScenePrompt } from "../types";
import { getCompositedScenesDir, printClickablePath } from "../artifactManager";
import fs from "fs";
import path from "path";

export async function runWithApi(compiled: CompiledScenePrompt): Promise<string | null> {
  console.log("⚡ Executing via Google GenAI API...\n");
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY environment variable is not set in .env!");
    return null;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    console.log("Submitting multi-reference prompt to Gemini / Imagen model...");
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: compiled.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: compiled.aspectRatio as any,
        outputMimeType: "image/png",
      },
    });

    const generated = response.generatedImages?.[0];
    if (generated?.image?.imageBytes) {
      const outPath = (compiled as any).outputPath || path.join(getCompositedScenesDir(), `${compiled.baseName}.png`);
      const dirName = path.dirname(outPath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }
      const buffer = Buffer.from(generated.image.imageBytes, "base64");
      fs.writeFileSync(outPath, buffer);

      console.log(`\n🎉 Multi-Reference Scene Composited Successfully!`);
      printClickablePath(outPath);
      return outPath;
    } else {
      console.error("❌ No image bytes returned by Google GenAI API.");
      return null;
    }
  } catch (err: any) {
    console.error("❌ Google GenAI API Error:", err.message || err);
    return null;
  }
}
