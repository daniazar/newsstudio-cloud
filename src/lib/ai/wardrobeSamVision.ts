/**
 * src/lib/ai/wardrobeSamVision.ts
 *
 * Multimodal LLM Vision Engine for SAM 3.1 & GroundingDINO Segmentation Prompts.
 * Reads fashion technical plates and clothing images, visually identifies all garments,
 * layers, trims, hardware, and accessories, and synthesizes optimal SAM 3.1 prompt tokens.
 *
 * Supported Multimodal Engines:
 * 1. Unified AI SDK Multimodal Gateway (Gemini 2.5 Flash Vision / Ollama llava)
 * 2. Rule-Based Heuristic Fallback (Offline safe)
 */

import fs from "fs";
import path from "path";

export interface DetectedGarmentPiece {
  label: string;
  category: "outerwear" | "top" | "bottom" | "one_piece" | "accessory" | "trim";
  samTokens: string[];
  color?: string;
  material?: string;
}

export interface SamVisionResult {
  success: boolean;
  samPrompt: string; // Comma-separated for SAM 3.1 / SAM 2
  groundingDinoPrompt: string; // Period-separated for GroundingDINO
  negativePrompt: string; // Things SAM should NOT segment (e.g. green screen, background)
  detectedGarments: DetectedGarmentPiece[];
  confidence: number;
  reasoning: string;
  providerUsed: "gemini" | "ollama" | "heuristic";
  error?: string;
}

export interface SamVisionOptions {
  imagePathOrUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  contextHint?: string;
  genderHint?: "female" | "male" | "unisex";
  preferredProvider?: "gemini" | "ollama" | "heuristic" | "auto";
}

/**
 * Resolve local or remote image into a base64 buffer with mimeType
 */
export async function resolveImageBase64(
  options: SamVisionOptions
): Promise<{ base64: string; mimeType: string } | null> {
  // 1. Direct base64 string provided
  if (options.imageBase64) {
    let clean = options.imageBase64.trim();
    let mime = options.mimeType || "image/jpeg";
    if (clean.startsWith("data:")) {
      const match = clean.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mime = match[1];
        clean = match[2];
      }
    }
    return { base64: clean, mimeType: mime };
  }

  // 2. Image path or URL provided
  if (options.imagePathOrUrl) {
    const rawPath = options.imagePathOrUrl.trim();

    // Remote HTTP/HTTPS URL
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      try {
        const res = await fetch(rawPath);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const mime = res.headers.get("content-type") || "image/jpeg";
        return { base64: buffer.toString("base64"), mimeType: mime };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[SamVision] Failed to fetch remote image ${rawPath}:`, msg);
        return null;
      }
    }

    // Local file path
    let localFile = rawPath;

    // Relative web paths like /assets/wardrobe/... or /studio_environments/...
    if (rawPath.startsWith("/")) {
      localFile = path.join(process.cwd(), "public", rawPath.replace(/^\//, ""));
    } else if (!path.isAbsolute(localFile)) {
      // Relative to workspace
      const testPublic = path.join(process.cwd(), "public", localFile);
      if (fs.existsSync(testPublic)) {
        localFile = testPublic;
      } else {
        localFile = path.join(process.cwd(), localFile);
      }
    }

    if (fs.existsSync(localFile)) {
      const buffer = fs.readFileSync(localFile);
      const ext = path.extname(localFile).toLowerCase();
      let mime = "image/jpeg";
      if (ext === ".png") mime = "image/png";
      else if (ext === ".webp") mime = "image/webp";
      return { base64: buffer.toString("base64"), mimeType: mime };
    } else {
      console.warn(`[SamVision] Local file not found at: ${localFile}`);
    }
  }

  return null;
}

/**
 * Heuristic fallback when LLMs are offline or API keys are absent.
 */
export function buildHeuristicSamPrompt(
  hint?: string,
  _gender?: string
): SamVisionResult {
  const desc = (hint || "").toLowerCase();
  const tokens = new Set<string>(["clothing"]);
  const detected: DetectedGarmentPiece[] = [];

  if (desc.includes("dress") || desc.includes("gown") || desc.includes("sheath")) {
    tokens.add("dress");
    tokens.add("neckline");
    tokens.add("hem");
    detected.push({
      label: "dress",
      category: "one_piece",
      samTokens: ["dress", "neckline", "hem"],
    });
  }

  if (desc.includes("blazer") || desc.includes("jacket") || desc.includes("suit")) {
    tokens.add("blazer");
    tokens.add("jacket");
    tokens.add("lapels");
    tokens.add("collar");
    tokens.add("buttons");
    detected.push({
      label: "suit jacket / blazer",
      category: "outerwear",
      samTokens: ["blazer", "jacket", "lapels", "collar", "buttons"],
    });
  }

  if (desc.includes("shirt") || desc.includes("blouse") || desc.includes("camisole") || desc.includes("top")) {
    tokens.add("shirt");
    tokens.add("collar");
    tokens.add("cuffs");
    tokens.add("sleeves");
    detected.push({
      label: "shirt / top",
      category: "top",
      samTokens: ["shirt", "collar", "cuffs", "sleeves"],
    });
  }

  if (desc.includes("trousers") || desc.includes("pants") || desc.includes("jeans") || desc.includes("cargo") || desc.includes("jogger")) {
    tokens.add("trousers");
    tokens.add("pants");
    tokens.add("waistband");
    tokens.add("crease");
    detected.push({
      label: "trousers / pants",
      category: "bottom",
      samTokens: ["trousers", "pants", "waistband", "crease"],
    });
  } else if (desc.includes("skirt")) {
    tokens.add("skirt");
    tokens.add("hem");
    detected.push({
      label: "skirt",
      category: "bottom",
      samTokens: ["skirt", "hem"],
    });
  } else if (!desc.includes("dress") && !desc.includes("gown") && !desc.includes("jumpsuit")) {
    tokens.add("trousers");
    tokens.add("pants");
  }

  if (desc.includes("tie") || desc.includes("bow tie")) {
    tokens.add("necktie");
    tokens.add("bow tie");
    detected.push({
      label: "tie",
      category: "accessory",
      samTokens: ["necktie", "bow tie"],
    });
  }

  if (desc.includes("belt") || desc.includes("buckle")) {
    tokens.add("belt");
    tokens.add("buckle");
    detected.push({
      label: "belt",
      category: "accessory",
      samTokens: ["belt", "buckle"],
    });
  }

  if (desc.includes("sweater") || desc.includes("cardigan") || desc.includes("knit") || desc.includes("turtleneck")) {
    tokens.add("sweater");
    tokens.add("knitwear");
    tokens.add("ribbing");
    detected.push({
      label: "sweater / knitwear",
      category: "top",
      samTokens: ["sweater", "knitwear", "ribbing"],
    });
  }

  const tokenArray = Array.from(tokens);
  return {
    success: true,
    samPrompt: tokenArray.join(", "),
    groundingDinoPrompt: tokenArray.join(" . "),
    negativePrompt: "green screen, green chroma wall, background, studio floor, mannequin skin, mannequin head",
    detectedGarments: detected,
    confidence: 0.75,
    reasoning: "Heuristic token extraction based on garment description context.",
    providerUsed: "heuristic",
  };
}

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import type { LLMProvider } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("ai:wardrobeSamVision");

export const DetectedGarmentPieceSchema = z.object({
  label: z.string().default("Garment"),
  category: z.enum(["outerwear", "top", "bottom", "one_piece", "accessory", "trim"]).catch("top"),
  samTokens: z.array(z.string()).default([]),
  color: z.string().optional(),
  material: z.string().optional(),
});

export const SamVisionOutputSchema = z.object({
  samPrompt: z.string(),
  groundingDinoPrompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  detectedGarments: z.array(DetectedGarmentPieceSchema).default([]),
  reasoning: z.string().optional(),
  confidence: z.number().default(0.95),
});

/**
 * Main Entrypoint: Reads image via multimodal LLM vision to decide SAM 3.1 prompt.
 * Consolidates Gemini + Ollama vision calls through unified aiSdkGateway.
 */
export async function decideSamPromptFromImage(
  options: SamVisionOptions
): Promise<SamVisionResult> {
  const provider = options.preferredProvider || "auto";

  if (provider === "heuristic") {
    return buildHeuristicSamPrompt(options.contextHint, options.genderHint);
  }

  // 1. Resolve image to Base64
  const resolved = await resolveImageBase64(options);

  if (!resolved) {
    console.warn("[SamVision] No image could be resolved, falling back to heuristic extraction.");
    return buildHeuristicSamPrompt(options.contextHint, options.genderHint);
  }

  try {
    const contextPart = options.contextHint
      ? `The garment context is described as: "${options.contextHint}". Gender suitability: ${options.genderHint || "unisex"}.`
      : `Gender hint: ${options.genderHint || "unisex"}.`;

    const systemPrompt = `You are a high-precision computer vision AI specializing in fashion segmentation for Segment Anything Model (SAM 3.1) and GroundingDINO in ComfyUI.
You are inspecting a fashion technical multi-view reference plate (front, side, rear, macro views) displayed on an invisible 3D ghost mannequin against a pure solid green chroma wall.

${contextPart}

TASK:
1. Examine the image carefully. Identify all visible garments, layers, outerwear, innerwear, trousers/skirts/dresses, lapels, collars, closures, buttons, zippers, belts, ties, and accessories.
2. Formulate the optimal SAM 3.1 detection prompt as a comma-separated list of lowercase concrete visual object nouns (e.g. "blazer, lapel, collar, dress shirt, silk tie, suit trousers, waistband, belt, buttons, clothing").
3. Formulate the GroundingDINO prompt as period-separated items (e.g. "blazer . lapel . collar . dress shirt . silk tie . suit trousers . waistband . belt . buttons . clothing").
4. Specify negative exclusion targets that SAM must NOT segment (e.g. "green screen, green chroma wall, background, mannequin neck opening, floor").`;

    const contentParts: Array<
      | { type: "text"; text: string }
      | { type: "file"; data: Buffer; mediaType: string }
    > = [
      { type: "text", text: systemPrompt },
      {
        type: "file",
        data: Buffer.from(resolved.base64, "base64"),
        mediaType: resolved.mimeType || "image/jpeg",
      },
    ];

    const visionModel = process.env.OLLAMA_VISION_MODEL || "llava";
    const explicitProvider: LLMProvider | undefined =
      provider === "gemini" ? "gemini" : provider === "ollama" ? "ollama" : undefined;

    const result = await generateLlmObject({
      schema: SamVisionOutputSchema,
      schemaName: "SamVisionOutput",
      messages: [{ role: "user", content: contentParts }],
      provider: explicitProvider,
      tier: "vision",
      model: explicitProvider === "ollama" ? visionModel : undefined,
      fallbackModel: explicitProvider === "gemini" || explicitProvider === undefined ? visionModel : undefined,
      allowFallback: provider === "auto",
    });

    const parsed = result.object;

    if (parsed && typeof parsed.samPrompt === "string" && parsed.samPrompt.length > 2) {
      return {
        success: true,
        samPrompt: parsed.samPrompt.trim(),
        groundingDinoPrompt:
          parsed.groundingDinoPrompt?.trim() ||
          parsed.samPrompt.split(",").map((s: string) => s.trim()).join(" . "),
        negativePrompt:
          parsed.negativePrompt?.trim() ||
          "green screen, green chroma wall, background, studio floor, mannequin skin, mannequin head",
        detectedGarments: parsed.detectedGarments || [],
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.95,
        reasoning: parsed.reasoning || `Multimodal vision analysis completed via ${result.providerUsed}.`,
        providerUsed: result.providerUsed === "ollama" ? "ollama" : "gemini",
      };
    }
    throw new Error("Invalid output format from vision model");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[SamVision] Multimodal vision analysis error, falling back to heuristic:", msg);
    log.info("[SamVision] Multimodal engines unavailable, falling back to heuristic parser.");
    return buildHeuristicSamPrompt(options.contextHint, options.genderHint);
  }
}
