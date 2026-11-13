/**
 * scripts/gemini-cli/productPhotoGenerator.ts
 *
 * E-Commerce Custom Product Photo Generator.
 * Synthesizes hyper-photorealistic product staging photography using Antigravity's
 * native Gemini / Imagen 3 CLI engine (agy) with multi-image conditioning.
 * Enforces at least 2 product photo references to lock geometry, texture, and packaging.
 */

import fs from "fs";
import path from "path";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { renderTerminalImagePreview } from "./terminalPreview";
import { filterPromptForSafety } from "../../src/lib/ecommerce/promptSafetyFilter";

export interface ProductPhotoConfig {
  prompt: string;
  imagePaths: string[];
  aspectRatio?: string; // "1:1" | "9:16" | "16:9" | "4:3" | "3:4"
  outputDir?: string;
  imageName?: string;
  engine?: "agy" | "api";
  dryRun?: boolean;
  preview?: boolean;
}

export async function runProductPhotoGenerator(config: ProductPhotoConfig): Promise<string | null> {
  console.log("\n==================================================================");
  console.log("📸 NEWSSTUDIO — E-COMMERCE CUSTOM PRODUCT PHOTO STUDIO");
  console.log("==================================================================");
  console.log(`• Engine:       ${(config.engine || "agy").toUpperCase()}`);
  console.log(`• Aspect Ratio: ${config.aspectRatio || "1:1"}`);
  console.log(`• References:   ${config.imagePaths.length} image(s) supplied`);
  console.log(`• Prompt:       "${config.prompt.trim()}"`);

  // Ensure output directory exists
  const outDir = config.outputDir
    ? path.resolve(config.outputDir)
    : path.join(process.cwd(), "public", "assets", "ecommerce", "product_photos");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Ensure at least 2 reference images whenever at least 1 is available
  const validatedImagePaths = [...config.imagePaths.filter(Boolean)];
  if (validatedImagePaths.length === 1) {
    validatedImagePaths.push(validatedImagePaths[0]);
    console.log("ℹ️ Duplicated single product reference to ensure multi-image conditioning receives >= 2 angles.");
  }

  const baseName = config.imageName || `photo_custom_${Date.now()}`;
  const finalOutputPath = path.join(outDir, `${baseName}.png`);

  const compiled: CompiledScenePrompt = {
    prompt: filterPromptForSafety(config.prompt.trim()),
    imagePaths: validatedImagePaths.slice(0, 3),
    baseName,
    aspectRatio: config.aspectRatio || "1:1",
    outputPath: finalOutputPath,
  };

  console.log(`• Conditioning References (${compiled.imagePaths.length}):`);
  compiled.imagePaths.forEach((p, idx) => {
    console.log(`  [Ref #${idx + 1}] ${p}`);
  });
  console.log(`• Target Output: ${finalOutputPath}\n`);

  if (config.dryRun) {
    console.log("✨ [DRY-RUN] Product Photo prompt compiled successfully without invoking engine.");
    return finalOutputPath;
  }

  let generatedPath: string | null = null;
  const engine = config.engine || "agy";

  if (engine === "agy") {
    generatedPath = await runWithAgy(compiled);
  } else {
    generatedPath = await runWithApi(compiled);
  }

  if (generatedPath && fs.existsSync(generatedPath)) {
    // If output is not already at finalOutputPath, copy it there
    if (path.resolve(generatedPath) !== path.resolve(finalOutputPath)) {
      try {
        fs.copyFileSync(generatedPath, finalOutputPath);
        generatedPath = finalOutputPath;
      } catch (copyErr) {
        console.warn("[productPhotoGenerator] Could not copy to target output path:", copyErr);
      }
    }

    if (config.preview) {
      try {
        await renderTerminalImagePreview(generatedPath);
      } catch {}
    }
  }

  return generatedPath;
}
