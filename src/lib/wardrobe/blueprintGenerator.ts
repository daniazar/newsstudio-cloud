/**
 * src/lib/wardrobe/blueprintGenerator.ts
 *
 * AI Text-to-Blueprint Generator for Custom Styles (Hair & Attire).
 * Compiles canonical 4-panel multi-view technical reference plates:
 *   - Panel 1: Direct front view on invisible ghost mannequin (attire) or mannequin head (hair).
 *   - Panel 2: 45° side profile view showing silhouette depth, collar/neckline, and side drape.
 *   - Panel 3: Direct back view showing rear tailoring, seams, and closure.
 *   - Panel 4: Extreme macro close-up of textile weave, lapel stitching, or hair fiber texture.
 *   - Set against pure neutral studio background with high-fashion diffuse studio lighting.
 *
 * Integrates with Google GenAI API (Imagen 3) / Antigravity CLI (agy) / Offline resilient fallbacks,
 * auto-generates SAM 3.1 tracking tokens, and persists assets to disk & database.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { prisma } from "@/lib/prisma";
import { decideSamPromptFromImage } from "@/lib/ai/wardrobeSamVision";
import { findAndSyncArtifact } from "../../../scripts/gemini-cli/artifactManager";

import {
  BlueprintType,
  BlueprintGenerationInput,
  BlueprintItem,
  BlueprintGenerationResult,
  normalizeGender,
  toCatalogGender,
} from "./blueprintTypes";
import { createLogger } from "@/lib/logger";

const log = createLogger("wardrobe:blueprintGenerator");

export * from "./blueprintTypes";

/**
 * Compiles canonical 4-panel broadcast reference plate prompt following exact studio requirements.
 */
export function compileBlueprintPrompt(params: {
  prompt: string;
  type: BlueprintType;
  gender?: string;
  category?: string;
}): string {
  const normGender = normalizeGender(params.gender);
  const cleanPrompt = params.prompt.trim();

  if (params.type === "hair") {
    const genderDescriptor =
      normGender === "women"
        ? "women's high-fashion hairstyle"
        : normGender === "men"
        ? "men's tailored precision hairstyle"
        : "unisex designer broadcast hairstyle";

    return (
      `A professional salon technical 4-panel multi-view hairstyle master reference plate showing a ${genderDescriptor} ` +
      `displayed on an invisible 3D ghost mannequin head (NO human eyes, NO nose, NO lips, NO plastic mannequin skin, only the styled floating hair itself). ` +
      `The style is: ${cleanPrompt}. ` +
      `The master image is divided into 4 clean vertical subpanels side-by-side set against a pure neutral studio background with high-fashion diffuse studio lighting and crisp rim lighting separating the hair silhouette: ` +
      `- Panel 1: Direct front view on invisible mannequin head showing front hairline, parting, bangs, and framing edges. ` +
      `- Panel 2: 45° side profile view showing silhouette depth, collar/neckline, and side drape. ` +
      `- Panel 3: Direct back view showing rear tailoring, seams, and closure. ` +
      `- Panel 4: Extreme macro close-up of hair fiber texture, individual strands, and luster. ` +
      `Ultra-photorealistic hair physics, studio rim lighting, commercial catalog quality, sharp focus, 8k photo. ` +
      `IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.`
    );
  }

  // Type === "attire"
  const genderDescriptor =
    normGender === "women"
      ? "a women's complete tailored outfit (whole ensemble with matching top and bottom garments)"
      : normGender === "men"
      ? "a men's complete tailored outfit (whole ensemble with tailored jacket/top and matching trousers)"
      : "a complete full-body designer outfit (whole ensemble with matching top and bottom garments, not just a standalone piece)";

  return (
    `A professional fashion multi-view technical master reference plate showing ${genderDescriptor} ` +
    `displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). ` +
    `The outfit is: ${cleanPrompt}. The outfit must be whole, including both top and bottom parts. ` +
    `The master image is divided into 4 clean vertical subpanels side-by-side set against a pure neutral studio background with high-fashion diffuse studio lighting and crisp rim light separating the clothing: ` +
    `- Panel 1: Direct front view on invisible ghost mannequin showing front styling and silhouette. ` +
    `- Panel 2: 45° side profile view showing silhouette depth, collar/neckline, and side drape. ` +
    `- Panel 3: Direct back view showing rear tailoring, seams, and closure. ` +
    `- Panel 4: Extreme macro close-up of textile weave, lapel stitching, and fabric texture. ` +
    `Ultra-photorealistic fabric textures, diffuse studio illumination, commercial catalog quality, sharp focus, 8k photo. ` +
    `IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.`
  );
}

/**
 * Extracts auto-generated SAM 3.1 tracking tokens for segmentation & inpainting.
 * Comprehensively covers standard tailoring, global/multicultural garments, one-piece outfits,
 * and textured hairstyles.
 */
export function extractBlueprintSamTokens(params: {
  prompt: string;
  type: BlueprintType;
  gender?: string;
}): string {
  const normGender = normalizeGender(params.gender);
  const desc = params.prompt.toLowerCase();

  if (params.type === "hair") {
    const tokens = new Set<string>([
      "hair",
      "hairstyle",
      "bangs",
      "strands",
      "locks",
      "scalp",
      "hairline",
      "head",
    ]);

    if (desc.includes("bob")) tokens.add("bob");
    if (desc.includes("lob")) tokens.add("lob");
    if (desc.includes("pixie")) tokens.add("pixie");
    if (desc.includes("fade")) tokens.add("fade");
    if (desc.includes("taper")) tokens.add("taper");
    if (desc.includes("undercut") || desc.includes("sidecut")) tokens.add("undercut");
    if (desc.includes("buzz") || desc.includes("crew")) tokens.add("buzzcut");
    if (desc.includes("curl") || desc.includes("curly") || desc.includes("coils")) {
      tokens.add("curls");
      tokens.add("coils");
    }
    if (desc.includes("afro") || desc.includes("kinky")) tokens.add("afro");
    if (desc.includes("wave") || desc.includes("wavy")) tokens.add("waves");
    if (desc.includes("braid") || desc.includes("braids")) tokens.add("braids");
    if (desc.includes("dreadlocks") || desc.includes("locs") || desc.includes("twists")) {
      tokens.add("locs");
      tokens.add("twists");
    }
    if (desc.includes("shag") || desc.includes("wolf")) tokens.add("shag");
    if (desc.includes("ponytail") || desc.includes("updo") || desc.includes("bun")) {
      tokens.add("updo");
      tokens.add("ponytail");
    }
    if (desc.includes("fringe")) tokens.add("fringe");
    if (desc.includes("pompadour") || desc.includes("quiff") || desc.includes("slick")) {
      tokens.add("pompadour");
      tokens.add("quiff");
    }
    if (desc.includes("roots") || desc.includes("parting")) tokens.add("parting");

    return Array.from(tokens).join(", ");
  }

  // Attire SAM tokens
  const tokens = new Set<string>(["clothing", "attire", "outfit", "shoulders", "torso"]);

  // One-piece or robe flag (prevents invalid bottom trouser token injection)
  const isOnePieceOrRobe =
    desc.includes("dress") ||
    desc.includes("gown") ||
    desc.includes("sheath") ||
    desc.includes("kimono") ||
    desc.includes("yukata") ||
    desc.includes("kilt") ||
    desc.includes("sari") ||
    desc.includes("saree") ||
    desc.includes("abaya") ||
    desc.includes("kaftan") ||
    desc.includes("caftan") ||
    desc.includes("thobe") ||
    desc.includes("hanbok") ||
    desc.includes("jumpsuit") ||
    desc.includes("romper") ||
    desc.includes("cheongsam") ||
    desc.includes("qipao") ||
    desc.includes("dirndl");

  if (desc.includes("dress") || desc.includes("gown") || desc.includes("sheath")) {
    tokens.add("dress");
    tokens.add("neckline");
    tokens.add("hem");
  }
  if (desc.includes("blazer") || desc.includes("jacket") || desc.includes("tuxedo")) {
    tokens.add("blazer");
    tokens.add("jacket");
    tokens.add("lapel");
    tokens.add("collar");
    tokens.add("buttons");
  }
  if (desc.includes("suit")) {
    tokens.add("suit");
    tokens.add("jacket");
    tokens.add("trousers");
  }
  if (desc.includes("shirt") || desc.includes("blouse") || desc.includes("camisole") || desc.includes("top")) {
    tokens.add("shirt");
    tokens.add("collar");
    tokens.add("sleeves");
  }
  if (desc.includes("trousers") || desc.includes("pants") || desc.includes("slacks")) {
    tokens.add("trousers");
    tokens.add("pants");
  }
  if (desc.includes("skirt")) tokens.add("skirt");
  if (desc.includes("vest") || desc.includes("waistcoat")) tokens.add("vest");
  if (desc.includes("tie") || desc.includes("bow tie")) tokens.add("tie");
  if (desc.includes("belt") || desc.includes("buckle")) tokens.add("belt");
  if (desc.includes("velvet")) tokens.add("velvet");
  if (desc.includes("silk")) tokens.add("silk");
  if (desc.includes("satin")) tokens.add("satin");
  if (desc.includes("leather")) tokens.add("leather");

  // Traditional & Multicultural Attire
  if (desc.includes("kimono") || desc.includes("yukata")) {
    tokens.add("kimono");
    tokens.add("robe");
    tokens.add("sash");
    tokens.add("sleeves");
  }
  if (desc.includes("kilt")) {
    tokens.add("kilt");
    tokens.add("pleats");
  }
  if (desc.includes("sari") || desc.includes("saree")) {
    tokens.add("sari");
    tokens.add("drape");
  }
  if (desc.includes("hanbok")) {
    tokens.add("hanbok");
    tokens.add("jeogori");
    tokens.add("chima");
  }
  if (desc.includes("abaya") || desc.includes("kaftan") || desc.includes("caftan") || desc.includes("thobe")) {
    tokens.add("robe");
    tokens.add("tunic");
    tokens.add("sleeves");
  }
  if (desc.includes("jumpsuit") || desc.includes("romper")) {
    tokens.add("jumpsuit");
    tokens.add("bodice");
    tokens.add("legs");
  }
  if (desc.includes("cape") || desc.includes("cloak")) {
    tokens.add("cape");
  }

  // Ensure gender conventions without clobbering one-piece garments
  if (
    normGender === "women" &&
    !isOnePieceOrRobe &&
    !tokens.has("blazer") &&
    !tokens.has("suit") &&
    !tokens.has("shirt")
  ) {
    tokens.add("dress");
  } else if (
    normGender === "men" &&
    !isOnePieceOrRobe &&
    !tokens.has("suit") &&
    !tokens.has("blazer") &&
    !tokens.has("jacket") &&
    !tokens.has("shirt")
  ) {
    tokens.add("suit");
  }

  // Ensure bottom garment tokens only if not a one-piece dress/robe/kilt/sari
  if (
    !isOnePieceOrRobe &&
    !tokens.has("skirt") &&
    !tokens.has("trousers") &&
    !tokens.has("pants")
  ) {
    tokens.add("trousers");
    tokens.add("pants");
  }

  return Array.from(tokens).join(", ");
}

/**
 * Synthesizes an image via Google GenAI API (Imagen 3).
 */
async function generateViaApi(
  prompt: string,
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GEMINI_API_KEY environment variable is not configured." };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "16:9",
        outputMimeType: "image/png",
      },
    });

    const generated = response.generatedImages?.[0];
    if (!generated?.image?.imageBytes) {
      return { success: false, error: "No image bytes returned by Imagen API." };
    }

    const buffer = Buffer.from(generated.image.imageBytes, "base64");
    fs.writeFileSync(outputPath, buffer);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Synthesizes an image via Antigravity CLI (agy).
 */
async function generateViaAgy(
  prompt: string,
  baseName: string,
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  const startTimeMs = Date.now();
  try {
    const cleanPrompt = prompt.replace(/[\r\n]+/g, " ").replace(/"/g, "'").trim();
    const agyPrompt = `DIRECT TOOL INSTRUCTION: Call generate_image immediately with these exact parameters:
AspectRatio: "16:9"
ImageName: "${baseName}"
Prompt: "${cleanPrompt}"

IMPORTANT: Do not call read_file, view_file, or search tools. Directly call generate_image tool.`;

    const geminiDir = path.join(process.cwd(), ".gemini");
    if (!fs.existsSync(geminiDir)) {
      fs.mkdirSync(geminiDir, { recursive: true });
    }

    const tempPromptFile = path.join(geminiDir, `temp_blueprint_${baseName}.txt`);
    const tempScriptFile = path.join(geminiDir, `run_blueprint_${baseName}.ps1`);

    fs.writeFileSync(tempPromptFile, agyPrompt, "utf8");

    const psScriptContent = `
$ErrorActionPreference = 'Continue'
Get-Content -Path '${tempPromptFile.replace(/\\/g, "/")}' -Raw -Encoding UTF8 | & agy --dangerously-skip-permissions --print-timeout 1m
`;

    fs.writeFileSync(tempScriptFile, psScriptContent, "utf8");

    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScriptFile], {
      stdio: "ignore",
      windowsHide: true,
    });

    const exitPromise = new Promise<{ code: number | null }>((resolve) => {
      child.on("close", (code) => resolve({ code }));
      child.on("error", () => resolve({ code: -1 }));
    });

    const timeoutPromise = new Promise<{ code: number | null }>((resolve) => {
      setTimeout(() => {
        try {
          child.kill();
        } catch {}
        resolve({ code: -2 });
      }, 30000);
    });

    const result = await Promise.race([exitPromise, timeoutPromise]);

    // Clean up temporary files
    try {
      if (fs.existsSync(tempPromptFile)) fs.unlinkSync(tempPromptFile);
      if (fs.existsSync(tempScriptFile)) fs.unlinkSync(tempScriptFile);
    } catch {}

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 5000) {
      return { success: true };
    }

    const syncedPath = findAndSyncArtifact(baseName, startTimeMs - 5000, outputPath);
    if (syncedPath && fs.existsSync(syncedPath) && fs.statSync(syncedPath).size > 5000) {
      return { success: true };
    }

    return {
      success: false,
      error: `AGY process exited with code ${result.code}, but output artifact was not located.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Synthesizes an image via ComfyUI if running locally.
 */
async function generateViaComfy(
  prompt: string,
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const healthRes = await fetch("http://127.0.0.1:8188/system_stats", {
      signal: AbortSignal.timeout(1500),
    }).catch(() => null);

    if (!healthRes || !healthRes.ok) {
      return { success: false, error: "ComfyUI server is offline on port 8188." };
    }

    const { generatePresenterImage } = await import("@/lib/ai/comfy/imageGen");
    const imageBuffer = await generatePresenterImage(
      prompt,
      undefined,
      undefined,
      undefined,
      1344,
      768,
      1.0,
      undefined,
      Math.floor(Math.random() * 1000000),
      "ugly, deformed, disfigured, text, watermark, bad anatomy",
      true,
      "blueprint_master"
    );

    if (imageBuffer && imageBuffer.length > 5000) {
      fs.writeFileSync(outputPath, imageBuffer);
      return { success: true };
    }

    return { success: false, error: "Empty buffer returned by ComfyUI" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Fallback image resolution for offline or headless environments.
 * Copies a matching reference plate from generic library, or writes a valid 16:9 test image.
 */
function applyOfflineFallbackImage(type: BlueprintType, targetPath: string): boolean {
  try {
    const genericDir =
      type === "hair"
        ? path.join(process.cwd(), "public", "assets", "hairstyles", "generic")
        : path.join(process.cwd(), "public", "assets", "wardrobe", "generic");

    if (fs.existsSync(genericDir)) {
      const candidates = fs.readdirSync(genericDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".png"));
      if (candidates.length > 0) {
        const sourcePath = path.join(genericDir, candidates[0]);
        fs.copyFileSync(sourcePath, targetPath);
        return true;
      }
    }

    // Secondary fallback: check wardrobe_demo
    const demoDir = path.join(process.cwd(), "public", "assets", "wardrobe_demo");
    if (fs.existsSync(demoDir)) {
      const demoFiles = fs.readdirSync(demoDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".png"));
      if (demoFiles.length > 0) {
        fs.copyFileSync(path.join(demoDir, demoFiles[0]), targetPath);
        return true;
      }
    }

    // Tertiary fallback: Write a minimal valid 16:9 PNG buffer (1x1 PNG or small placeholder)
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    fs.writeFileSync(targetPath, minimalPng);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates an automated title from a natural language prompt.
 */
export function deriveItemName(prompt: string, type: BlueprintType): string {
  const cleaned = prompt
    .replace(/[^\w\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");

  if (!cleaned) {
    return type === "hair" ? "Custom Studio Hairstyle" : "Custom Studio Attire";
  }

  // Capitalize words
  return cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Main engine entrypoint: Generates a 4-panel AI master blueprint, persists it to disk & DB,
 * and returns canonical asset metadata with SAM 3.1 tracking tokens.
 */
export async function generateMasterBlueprint(
  input: BlueprintGenerationInput
): Promise<BlueprintGenerationResult> {
  const normGender = normalizeGender(input.gender);
  const catGender = toCatalogGender(normGender);
  const itemName = input.name?.trim() || deriveItemName(input.prompt, input.type);
  const category = input.category || (input.type === "hair" ? "broadcast_anchor" : "broadcast");
  const compiledPrompt = compileBlueprintPrompt({
    prompt: input.prompt,
    type: input.type,
    gender: normGender,
    category,
  });

  const slug = `custom_${input.type}_${normGender}_${itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 32)}_${Date.now()}`;

  // Establish persistent directory structure
  // Attire -> public/assets/wardrobe/custom/
  // Hair -> public/assets/hair/custom/
  const targetDir =
    input.type === "hair"
      ? path.join(process.cwd(), "public", "assets", "hair", "custom")
      : path.join(process.cwd(), "public", "assets", "wardrobe", "custom");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outFileName = `${slug}.png`;
  const localPath = path.join(targetDir, outFileName);
  const isTestMode = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
  const forceFallback =
    input.preferredEngine === "offline-fallback" ||
    (isTestMode && !input.preferredEngine && !process.env.FORCE_REAL_AI);

  let engineUsed: string = "offline-fallback";
  let generationSuccess = false;

  if (forceFallback) {
    const fallbackOk = applyOfflineFallbackImage(input.type, localPath);
    if (fallbackOk) {
      generationSuccess = true;
      engineUsed = "offline-fallback";
    }
  } else {
    // 1. Check ComfyUI explicit preference
    if (input.preferredEngine === "comfy") {
      const comfyRes = await generateViaComfy(compiledPrompt, localPath);
      if (comfyRes.success && fs.existsSync(localPath)) {
        generationSuccess = true;
        engineUsed = "comfy";
      } else {
        console.warn(`[Blueprint Generator] ComfyUI synthesis failed: ${comfyRes.error}. Falling back...`);
      }
    }

    if (!generationSuccess) {
      // 2. Check Gemini/Google API if key is configured or explicitly requested
      const hasApiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
      if (input.preferredEngine === "api" || (hasApiKey && !input.preferredEngine)) {
        log.info(
          `[Blueprint Generator] Attempting ${input.type.toUpperCase()} Master Blueprint via Gemini/Imagen API...`
        );
        const apiRes = await generateViaApi(compiledPrompt, localPath);
        if (apiRes.success && fs.existsSync(localPath)) {
          generationSuccess = true;
          engineUsed = "api";
        } else {
          console.warn(`[Blueprint Generator] API generation failed: ${apiRes.error}. Falling back...`);
        }
      }

      // 3. Check local ComfyUI (running on port 8188) if preferred != "agy"
      if (!generationSuccess && input.preferredEngine !== "agy") {
        log.info(
          `[Blueprint Generator] Attempting ${input.type.toUpperCase()} Master Blueprint via local ComfyUI...`
        );
        const comfyRes = await generateViaComfy(compiledPrompt, localPath);
        if (comfyRes.success && fs.existsSync(localPath)) {
          generationSuccess = true;
          engineUsed = "comfy";
        } else {
          console.warn(`[Blueprint Generator] ComfyUI generation failed: ${comfyRes.error}. Falling back...`);
        }
      }

      // 4. Attempt AGY CLI if preferred or if other backends were unavailable
      if (!generationSuccess && input.preferredEngine !== "offline-fallback") {
        log.info(
          `[Blueprint Generator] Attempting ${input.type.toUpperCase()} Master Blueprint via AGY CLI...`
        );
        const agyRes = await generateViaAgy(compiledPrompt, slug, localPath);
        if (agyRes.success && fs.existsSync(localPath)) {
          generationSuccess = true;
          engineUsed = "agy";
        }
      }
    }
  }

  // 2. Offline fallback resilience
  if (!generationSuccess || !fs.existsSync(localPath)) {
    console.warn(`[Blueprint Generator] Generative backends offline. Engaging resilient local blueprint fallback.`);
    const fallbackOk = applyOfflineFallbackImage(input.type, localPath);
    if (fallbackOk) {
      generationSuccess = true;
      engineUsed = "offline-fallback";
    }
  }

  if (!generationSuccess || !fs.existsSync(localPath)) {
    return {
      success: false,
      error: "Failed to generate or persist master blueprint image.",
    };
  }

  // 3. Extract SAM 3.1 tracking tokens
  let samPrompt = extractBlueprintSamTokens({
    prompt: input.prompt,
    type: input.type,
    gender: normGender,
  });

  // Attempt Multimodal Vision extraction if online
  if (engineUsed === "api") {
    try {
      const visionResult = await decideSamPromptFromImage({
        imagePathOrUrl: localPath,
        contextHint: input.prompt,
        genderHint: catGender,
      });
      if (visionResult?.success && visionResult.samPrompt) {
        samPrompt = visionResult.samPrompt;
      }
    } catch {
      // Graceful fallback to rule-based tokens
    }
  }

  const publicUrl =
    input.type === "hair"
      ? `/assets/hair/custom/${outFileName}`
      : `/assets/wardrobe/custom/${outFileName}`;

  // 4. Persist to database (VisualPreset)
  let dbId = slug;
  try {
    const dbPreset = await prisma.visualPreset.create({
      data: {
        name: itemName,
        desc: input.prompt,
        imageDesc: compiledPrompt,
        category: input.type === "hair" ? "hair" : "attire",
        subCategory: catGender,
        subSubCategory: category,
        categoryPath: `/wardrobe/${input.type}/${normGender}/${category}`,
        tags: JSON.stringify([
          "custom",
          "blueprint",
          input.type,
          normGender,
          category,
          `sam:${samPrompt}`,
          `engine:${engineUsed}`,
        ]),
        previewPath: publicUrl,
        isCustom: true,
        isStudioApproved: true,
        isFullAttire: input.type === "attire",
      },
    });
    dbId = dbPreset.id;
  } catch (dbErr: unknown) {
    console.warn(
      "[Blueprint Generator] DB persistence warning (proceeding with filesystem asset):",
      dbErr instanceof Error ? dbErr.message : String(dbErr)
    );
  }

  const panels: [string, string, string, string] = [
    `Panel 1 (Left): Direct front view on invisible ghost mannequin${input.type === "hair" ? " head" : ""}`,
    "Panel 2: 45° side profile view showing silhouette depth, collar/neckline, and side drape",
    "Panel 3: Direct back view showing rear tailoring, seams, and closure",
    `Panel 4 (Right): Extreme macro close-up of ${
      input.type === "hair" ? "hair fiber texture, individual strands, and luster" : "textile weave, lapel stitching, and fabric texture"
    }`,
  ];

  const blueprint: BlueprintItem = {
    id: dbId,
    name: itemName,
    type: input.type,
    gender: normGender,
    category,
    prompt: input.prompt,
    compiledPrompt,
    samPrompt,
    imageUrl: publicUrl,
    localPath,
    panels,
    engineUsed,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    blueprint,
  };
}
