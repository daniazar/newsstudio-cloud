/**
 * src/lib/ai/wardrobeImageGenerator.ts
 *
 * NewsStudio Wardrobe 4-Panel Multi-View Image Synthesis Engine
 * Generates custom attire reference plates on pure green chroma wall (#00FF00)
 * using either Google GenAI API (Imagen 3) or Antigravity CLI (agy)
 * dynamically chosen based on environment variables:
 *   - WARDROBE_IMAGE_ENGINE ("api" | "agy" | "auto")
 *   - GEMINI_IMAGE_ENGINE   ("api" | "agy" | "auto")
 *   - GEMINI_API_KEY / GOOGLE_API_KEY
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { findAndSyncArtifact } from "../../../scripts/gemini-cli/artifactManager";
import { decideSamPromptFromImage } from "./wardrobeSamVision";
import { createLogger } from "@/lib/logger";

const log = createLogger("ai:wardrobeImageGenerator");

export type ImageEngineType = "api" | "agy";

export interface CustomAttireInput {
  name: string;
  description: string;
  gender: "female" | "male" | "unisex";
  category: "broadcast" | "gala" | "edgy" | "casual" | "techwear" | "executive";
  samPrompt?: string;
  preferredEngine?: ImageEngineType;
}

export interface WardrobePlateResult {
  success: boolean;
  id: string;
  name: string;
  gender: "female" | "male" | "unisex";
  category: string;
  prompt: string;
  compiledPrompt: string;
  samPrompt: string;
  imageUrl: string;
  localPath: string;
  engineUsed: ImageEngineType;
  error?: string;
}

/**
 * Determine which engine to use based on env variables.
 */
export function resolveImageEngine(override?: ImageEngineType): ImageEngineType {
  if (override) return override;

  const envEngine = (
    process.env.WARDROBE_IMAGE_ENGINE ||
    process.env.GEMINI_IMAGE_ENGINE ||
    "auto"
  ).toLowerCase();

  if (envEngine === "agy") {
    return "agy";
  }

  if (envEngine === "api") {
    return "api";
  }

  // Auto fallback
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (hasApiKey) {
    return "api";
  }

  return "agy";
}

/**
 * Extract clean SAM 3.1 segmentation target keywords from the description
 */
export function extractSamKeywords(description: string, gender: string): string {
  const desc = description.toLowerCase();
  const tokens = new Set<string>(["clothing"]);

  if (desc.includes("dress") || desc.includes("gown") || desc.includes("sheath")) tokens.add("dress");
  if (desc.includes("blazer") || desc.includes("jacket")) tokens.add("blazer");
  if (desc.includes("suit")) tokens.add("suit");
  if (desc.includes("shirt") || desc.includes("blouse") || desc.includes("camisole")) tokens.add("shirt");
  if (desc.includes("trousers") || desc.includes("pants")) tokens.add("trousers");
  if (desc.includes("skirt")) tokens.add("skirt");
  if (desc.includes("vest") || desc.includes("waistcoat")) tokens.add("vest");
  if (desc.includes("tie") || desc.includes("bow tie")) tokens.add("tie");
  if (desc.includes("belt") || desc.includes("buckle")) tokens.add("belt");
  if (desc.includes("coat") || desc.includes("trench")) tokens.add("coat");
  if (desc.includes("sweater") || desc.includes("knit") || desc.includes("cardigan")) tokens.add("sweater");
  if (desc.includes("turtleneck")) tokens.add("turtleneck");
  if (desc.includes("leather") || desc.includes("moto")) tokens.add("leather jacket");
  if (desc.includes("hood") || desc.includes("parka") || desc.includes("anorak")) tokens.add("jacket");

  if (gender === "female" && !tokens.has("dress") && !tokens.has("blazer") && !tokens.has("suit")) {
    tokens.add("dress");
  } else if (gender === "male" && !tokens.has("suit") && !tokens.has("blazer") && !tokens.has("jacket")) {
    tokens.add("suit");
  }

  // Ensure bottom garment tokens are included whenever the outfit is not a one-piece dress/gown
  if (!tokens.has("dress") && !tokens.has("gown") && !tokens.has("skirt") && !tokens.has("trousers") && !tokens.has("pants")) {
    if (desc.includes("skirt")) {
      tokens.add("skirt");
    } else {
      tokens.add("trousers");
      tokens.add("pants");
    }
  }

  return Array.from(tokens).join(", ");
}

/**
 * Build the standardized 4-panel multi-view green chroma wall prompt.
 * Pure ghost-mannequin photography with zero text, zero banners, zero labels.
 * Enforces whole ensembles (both top and bottom garments: jacket/top + matching trousers/pants/skirt).
 */
export function compileWardrobePlatePrompt(input: CustomAttireInput): string {
  const genderDescriptor =
    input.gender === "female"
      ? "a women's complete full outfit (whole ensemble with matching top and bottom garments)"
      : input.gender === "male"
      ? "a men's tailored complete full outfit (whole ensemble with jacket/shirt top and matching tailored trousers)"
      : "a complete full-body designer outfit (whole ensemble with matching top and bottom garments, not just a standalone jacket)";

  return `A professional fashion multi-view technical reference plate showing ${genderDescriptor} displayed on an invisible 3D ghost mannequin (NO human head, NO face, NO plastic mannequin skin, only the tailored floating clothing itself). The outfit must be whole, including both top and bottom parts (e.g. jacket/top with matching tailored trousers/pants/skirt). The image is divided into 4 clean vertical subpanels side-by-side against a seamless solid green chroma wall studio backdrop (#00FF00 green screen):
- Panel 1 (left): Full Front View of the whole complete outfit: ${input.description} (with matching tailored pants/skirt/trousers).
- Panel 2: Left Side Profile View of the whole complete ensemble showing full-length silhouette from shoulders down through trouser/skirt hem.
- Panel 3: Rear Back View of the whole complete ensemble showing back jacket/top construction, waistline, and trouser/skirt rear seams.
- Panel 4 (right): Single seamless vertical macro close-up of the fabric texture, seams, waist hardware, buttons, and matching accessories.
Ultra-photorealistic fabric textures, studio lighting with crisp rim light separating the clothing from the green screen, commercial catalog quality, sharp focus.
IMPORTANT: Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners, clean pure photography only.`;
}

/**
 * Execute generation via Google GenAI API (Imagen 3).
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

    // Also write JPG copy if output was requested as JPG
    if (outputPath.endsWith(".jpg")) {
      fs.writeFileSync(outputPath.replace(/\.jpg$/, ".png"), buffer);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Execute generation via Antigravity CLI (agy).
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

    const tempPromptFile = path.join(geminiDir, `temp_wardrobe_${baseName}.txt`);
    const tempScriptFile = path.join(geminiDir, `run_wardrobe_${baseName}.ps1`);

    fs.writeFileSync(tempPromptFile, agyPrompt, "utf8");

    const psScriptContent = `
$ErrorActionPreference = 'Continue'
Get-Content -Path '${tempPromptFile.replace(/\\/g, "/")}' -Raw -Encoding UTF8 | & agy --dangerously-skip-permissions --print-timeout 10m
`;

    fs.writeFileSync(tempScriptFile, psScriptContent, "utf8");

    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScriptFile],
      {
        stdio: "inherit",
        windowsHide: true,
        timeout: 600000,
      }
    );

    // Clean up temporary files
    try {
      if (fs.existsSync(tempPromptFile)) fs.unlinkSync(tempPromptFile);
      if (fs.existsSync(tempScriptFile)) fs.unlinkSync(tempScriptFile);
    } catch {}

    // Check if image was produced directly at outputPath
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 5000) {
      return { success: true };
    }

    // Discover artifact from Antigravity brain / conversation workspace and copy to outputPath
    const syncedPath = findAndSyncArtifact(baseName, startTimeMs - 5000, outputPath);
    if (syncedPath && fs.existsSync(syncedPath) && fs.statSync(syncedPath).size > 5000) {
      return { success: true };
    }

    return {
      success: false,
      error: `AGY process finished with status ${result.status}, but output artifact was not found.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Main synthesis entrypoint for Custom Attires.
 */
export async function synthesizeWardrobePlate(
  input: CustomAttireInput
): Promise<WardrobePlateResult> {
  const engine = resolveImageEngine(input.preferredEngine);
  const slug = `custom_${input.gender}_${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 32)}_${Date.now()}`;
  const compiledPrompt = compileWardrobePlatePrompt(input);
  const _samPrompt = input.samPrompt || extractSamKeywords(input.description, input.gender);

  const targetDir = path.join(process.cwd(), "public", "assets", "wardrobe", "generic");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outFileName = `${slug}.jpg`;
  const localPath = path.join(targetDir, outFileName);

  log.info(`[Wardrobe Synthesizer] Engine: ${engine.toUpperCase()} | Attire: ${input.name} (${input.gender})`);

  let res: { success: boolean; error?: string };

  if (engine === "api") {
    res = await generateViaApi(compiledPrompt, localPath);
    // If API failed for any reason (missing key, quota 429, model 404), fall back to AGY CLI
    if (!res.success) {
      console.warn(`[Wardrobe Synthesizer] API failed (${res.error}), falling back to AGY CLI...`);
      res = await generateViaAgy(compiledPrompt, slug, localPath);
    }
  } else {
    res = await generateViaAgy(compiledPrompt, slug, localPath);
  }

  let finalSamPrompt = input.samPrompt;

  // Duplicate to public/studio_environments/composited_scenes for compatibility
  if (res.success && fs.existsSync(localPath)) {
    try {
      const compScenesDir = path.join(process.cwd(), "public", "studio_environments", "composited_scenes");
      if (!fs.existsSync(compScenesDir)) {
        fs.mkdirSync(compScenesDir, { recursive: true });
      }
      fs.copyFileSync(localPath, path.join(compScenesDir, outFileName));
    } catch {}

    // If SAM prompt was not explicitly given, use Multimodal LLM Vision to inspect image and decide SAM 3.1 prompt
    if (!finalSamPrompt) {
      try {
        log.info(`[Wardrobe Synthesizer] Inspecting generated image via LLM Vision for SAM 3.1 prompt...`);
        const visionResult = await decideSamPromptFromImage({
          imagePathOrUrl: localPath,
          contextHint: input.description,
          genderHint: input.gender,
        });
        if (visionResult.success && visionResult.samPrompt) {
          finalSamPrompt = visionResult.samPrompt;
          log.info(`[Wardrobe Synthesizer] LLM Vision decided SAM 3.1 prompt: "${finalSamPrompt}"`);
        }
      } catch (visionErr: unknown) {
        const visionMsg = visionErr instanceof Error ? visionErr.message : String(visionErr);
        console.warn(`[Wardrobe Synthesizer] LLM Vision notice:`, visionMsg);
      }
    }
  }

  if (!finalSamPrompt) {
    finalSamPrompt = extractSamKeywords(input.description, input.gender);
  }

  const publicUrl = `/assets/wardrobe/generic/${outFileName}`;

  return {
    success: res.success,
    id: slug,
    name: input.name,
    gender: input.gender,
    category: input.category,
    prompt: input.description,
    compiledPrompt,
    samPrompt: finalSamPrompt,
    imageUrl: publicUrl,
    localPath,
    engineUsed: engine,
    error: res.error,
  };
}
