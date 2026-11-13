/**
 * src/lib/ai/comfy/compoundInpaintWorkflow.ts
 *
 * Compound Metamorphosis — "Complete Anchor Makeover" Pipeline.
 * Orchestrates an automated 2-stage chained execution pipeline:
 *  - Stage 1: Attire inpainting on the source action loop (MiniMax H3 + SAM 3.1)
 *  - Stage 2: Hairstyle inpainting using Stage 1's rendered video as the source (MiniMax H3 + MVEx)
 *
 * Streams live progress (0-50% for Attire, 50-100% for Hairstyle) and persists
 * the final composite output video to public/assets/completed/.
 */

import fs from "fs";
import path from "path";
import { checkComfyUIHealth, clearComfyUIVRAM } from "./api";
import {
  executeWardrobeInpaint,
  WardrobeInpaintInputs,
  generateMiniMaxInpaintPromptText,
} from "./wardrobeInpaintWorkflow";
import {
  executeHairstyleInpaint,
  HairstyleInpaintInputs,
  generateMiniMaxHairstylePromptText,
} from "./hairstyleInpaintWorkflow";
import {
  HAIR_CATALOG,
  getHairstyleById,
  HAIR_COLOR_SWATCHES,
  formatHairstyleWithSwatch,
} from "../../wardrobe/hairCatalog";
import {
  LightingEnvironmentConfig,
  LightingPresetId,
  LightDirection,
  resolveLightingConfig,
  compileLightingFormulaBadge,
} from "../../wardrobe/lightingEngine";
import {
  resolveVolumetricPadding,
  compileVolumetricFormulaBadge,
} from "../../wardrobe/volumetricPaddingEngine";

export interface CompoundInpaintInputs {
  /** Video file path or filename in ComfyUI / public */
  sourceVideoPath: string;
  /** Wardrobe reference plate image path or URL */
  outfitImagePath: string;
  /** Persona identifier / display name (e.g. "Ruby Vance") */
  personaName?: string;
  /** Persona ID (e.g. "ruby") */
  personaId?: string;
  /** Source garment description (e.g. "burgundy dress") */
  sourceGarment?: string;
  /** Target attire name */
  outfitName: string;
  /** Target attire detailed description / prompt */
  outfitDescription: string;
  /** Tracking prompt for SAM (default: "${sourceGarment}, clothing, attire, dress, hair, head") */
  trackPrompt?: string;
  /** Optional custom MiniMax prompt override for Attire */
  customMiniMaxPrompt?: string;
  /** Frame count: 0 for full video, or 39 for slice */
  frameCount?: number;
  /** Diffusion seed (default: 20261002) */
  seed?: number;
  /** Output file prefix */
  outputPrefix?: string;

  // Hairstyle Parameters
  /** Hairstyle catalog ID */
  hairstyleId?: string;
  /** Hairstyle reference image path or URL */
  hairImagePath?: string;
  /** Target hairstyle name */
  targetHairName?: string;
  /** Target hairstyle description */
  targetHairDescription?: string;
  /** Target hairstyle length */
  hairLength?: "short" | "medium" | "long" | "updo";
  /** Optional hair color swatch ID or name (e.g. "warm_honey_blonde") */
  hairColorSwatch?: string;
  /** Source hair description (e.g. "copper-red wavy hair past shoulders") */
  sourceHairDescription?: string;
  /** Optional custom MiniMax prompt override for Hairstyle */
  customHairPrompt?: string;

  // Phase 3: Advanced Salon Color Science Fields
  /** Optional salon technique (e.g. "balayage", "ombre", "highlights", "money_piece", "shadow_root") */
  salonTechnique?: import("../../wardrobe/hairCatalog").HairColorTechnique;
  /** Dimensional contrast level ("subtle" | "medium" | "bold") */
  salonDimension?: import("../../wardrobe/hairCatalog").HairColorDimension;
  /** Root tone specification */
  rootTone?: import("../../wardrobe/hairCatalog").HairToneSpec;
  /** Tip / accent tone specification */
  tipTone?: import("../../wardrobe/hairCatalog").HairToneSpec;
  /** Compiled salon formula text */
  salonFormula?: string;
  /** Salon negative prompt for preventing color banding, demarcation lines, and muddy saturation */
  salonNegativePrompt?: string;

  // Phase 4: Dynamic Lighting & Environment Bleed Integration
  lightingPreset?: LightingPresetId;
  keyDirection?: LightDirection;
  rimLightWrap?: number;
  despillEnabled?: boolean;
  ambientBleedTint?: string;
  lightingConfig?: LightingEnvironmentConfig;

  // Phase 6: Volumetric Mask Padding & Studio Set Adaptability
  volumetricPaddingConfig?: import("../../wardrobe/volumetricPaddingEngine").VolumetricPaddingConfig;
}

export interface CompoundInpaintProgress {
  stage: 1 | 2;
  phase: string;
  message: string;
  percent: number;
}

export interface CompoundInpaintResult {
  success: boolean;
  stage1OutputUrl: string;
  stage2OutputUrl: string;
  outputVideoPath: string;
  outputPublicUrl: string;
  outputFilename: string;
  promptId: string;
}

/**
 * Formats a compound tracking prompt binding garments, arms, and hair/head together.
 */
export function generateCompoundTrackPrompt(sourceGarment?: string, outfitSamPrompt?: string): string {
  const garment = (sourceGarment || "burgundy dress").trim();
  const base = `${garment}, clothing, attire, dress, hair, head`;
  if (!outfitSamPrompt) return base;

  const extra = outfitSamPrompt
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => !base.includes(s));

  return extra.length > 0 ? `${base}, ${extra.join(", ")}` : base;
}

/**
 * Compiles a structured dual-stage MiniMax ref2va prompt inspection text for Compound Makeovers.
 */
export function generateMiniMaxCompoundPromptText(inputs: CompoundInpaintInputs): string {
  const persona = inputs.personaName || "Ruby Vance";
  const garment = inputs.sourceGarment || "burgundy dress";
  const outfit = inputs.outfitName;

  // Resolve hair details
  const hair = (inputs.hairstyleId ? getHairstyleById(inputs.hairstyleId) : null) || HAIR_CATALOG[0] || null;
  const swatch = inputs.hairColorSwatch
    ? HAIR_COLOR_SWATCHES.find((s) => s.id === inputs.hairColorSwatch || s.name === inputs.hairColorSwatch)
    : null;
  const formattedHair = hair ? formatHairstyleWithSwatch(hair, swatch) : null;

  const hairName = inputs.targetHairName || formattedHair?.displayName || hair?.name || "Target Hairstyle";
  const hairDesc = inputs.targetHairDescription || formattedHair?.displayDescription || hair?.description || hairName;

  const lighting = resolveLightingConfig(
    inputs.lightingConfig || {
      presetId: inputs.lightingPreset,
      keyDirection: inputs.keyDirection,
      rimLightWrap: inputs.rimLightWrap,
      despillEnabled: inputs.despillEnabled,
      ambientTintHex: inputs.ambientBleedTint,
    }
  );
  const lightingBadge = compileLightingFormulaBadge(lighting);

  const volumetric = inputs.volumetricPaddingConfig
    ? resolveVolumetricPadding(inputs.volumetricPaddingConfig, {
        outfitName: inputs.outfitName,
        outfitCategory: inputs.outfitDescription,
        haircutId: inputs.hairstyleId,
        haircutName: hairName,
        hairLength: inputs.hairLength || hair?.hairLength,
        sourceLoopUrl: inputs.sourceVideoPath,
      })
    : undefined;
  const volumetricBadge = volumetric ? compileVolumetricFormulaBadge(volumetric) : "";

  const stage1Prompt = generateMiniMaxInpaintPromptText({
    sourceVideoPath: inputs.sourceVideoPath,
    outfitImagePath: inputs.outfitImagePath,
    personaName: persona,
    sourceGarment: garment,
    outfitName: outfit,
    outfitDescription: inputs.outfitDescription,
    trackPrompt: inputs.trackPrompt,
    customMiniMaxPrompt: inputs.customMiniMaxPrompt,
    frameCount: inputs.frameCount,
    seed: inputs.seed,
    lightingPreset: inputs.lightingPreset,
    keyDirection: inputs.keyDirection,
    rimLightWrap: inputs.rimLightWrap,
    despillEnabled: inputs.despillEnabled,
    ambientBleedTint: inputs.ambientBleedTint,
    lightingConfig: lighting,
    volumetricPaddingConfig: volumetric,
  });

  const salonTechnique = inputs.salonTechnique || swatch?.technique;
  const salonDimension = inputs.salonDimension || swatch?.dimension;
  const rootTone = inputs.rootTone || swatch?.rootTone;
  const tipTone = inputs.tipTone || swatch?.tipTone;
  const salonFormula = inputs.salonFormula || formattedHair?.salonFormula;
  const salonNegativePrompt = inputs.salonNegativePrompt || formattedHair?.negativePrompt;

  const stage2Prompt = generateMiniMaxHairstylePromptText({
    hairstyleId: inputs.hairstyleId,
    sourceVideoPath: "<Stage 1 Rendered Video>",
    hairImagePath: inputs.hairImagePath || hair?.imageUrl || "<Hairstyle Reference Plate>",
    personaName: persona,
    sourceHairDescription: inputs.sourceHairDescription || "original hair",
    targetHairName: hairName,
    targetHairDescription: hairDesc,
    hairLength: inputs.hairLength || hair?.hairLength || "medium",
    customMiniMaxPrompt: inputs.customHairPrompt,
    frameCount: inputs.frameCount,
    seed: inputs.seed ? inputs.seed + 1 : 20261011,
    salonTechnique,
    salonDimension,
    rootTone,
    tipTone,
    salonFormula,
    salonNegativePrompt,
    lightingPreset: inputs.lightingPreset,
    keyDirection: inputs.keyDirection,
    rimLightWrap: inputs.rimLightWrap,
    despillEnabled: inputs.despillEnabled,
    ambientBleedTint: inputs.ambientBleedTint,
    lightingConfig: lighting,
    volumetricPaddingConfig: volumetric,
  });

  return `================================================================================
[COMPOUND METAMORPHOSIS — 2-STAGE CHAINED PIPELINE]
Anchor: ${persona}
Look: ${outfit} + ${hairName}
${lightingBadge}${volumetricBadge ? `\nVolumetric Padding: ${volumetricBadge}` : ""}
Execution: Stage 1 (Attire) -> Intermediate Video Handshake -> Stage 2 (Hairstyle)
================================================================================

--- [STAGE 1/2: ATTIRE INPAINTING] ---
${stage1Prompt}

--------------------------------------------------------------------------------
--- [STAGE 2/2: HAIRSTYLE METAMORPHOSIS (Applied on Stage 1 Output)] ---
${stage2Prompt}`;
}

/**
 * Executes the complete Compound Metamorphosis pipeline end-to-end.
 * Stage 1 transforms the anchor's attire.
 * Stage 2 transforms the anchor's hairstyle using Stage 1's output video as the source.
 */
export async function executeCompoundInpaint(
  inputs: CompoundInpaintInputs,
  onProgress?: (progress: CompoundInpaintProgress) => void
): Promise<CompoundInpaintResult> {
  const isHealthy = await checkComfyUIHealth();
  if (!isHealthy) {
    throw new Error(
      "ComfyUI server is currently offline on port 8188. Please ensure ComfyUI is running with MiniMax H3 & SAM 3.1 models loaded."
    );
  }

  const personaId = inputs.personaId || "ruby";
  const personaName = inputs.personaName || "Ruby Vance";
  const outfitSlug = inputs.outfitName.toLowerCase().replace(/[^a-z0-9]/g, "_");

  // ==========================================
  // STAGE 1: Attire Inpainting (0% -> 50%)
  // ==========================================
  onProgress?.({
    stage: 1,
    phase: "init",
    message: `[Stage 1/2 Attire] Initializing wardrobe metamorphosis (${inputs.outfitName})...`,
    percent: 5,
  });

  const attireTrackPrompt = inputs.trackPrompt || generateCompoundTrackPrompt(inputs.sourceGarment);

  const attireInputs: WardrobeInpaintInputs = {
    sourceVideoPath: inputs.sourceVideoPath,
    outfitImagePath: inputs.outfitImagePath,
    personaName,
    sourceGarment: inputs.sourceGarment,
    outfitName: inputs.outfitName,
    outfitDescription: inputs.outfitDescription,
    trackPrompt: attireTrackPrompt,
    customMiniMaxPrompt: inputs.customMiniMaxPrompt,
    frameCount: inputs.frameCount,
    seed: inputs.seed || 20261002,
    outputPrefix: `compound_stage1_${personaId}_${outfitSlug}`,
    lightingPreset: inputs.lightingPreset,
    keyDirection: inputs.keyDirection,
    rimLightWrap: inputs.rimLightWrap,
    despillEnabled: inputs.despillEnabled,
    ambientBleedTint: inputs.ambientBleedTint,
    lightingConfig: inputs.lightingConfig,
    volumetricPaddingConfig: inputs.volumetricPaddingConfig,
  };

  const stage1Result = await executeWardrobeInpaint(attireInputs, (p) => {
    // Map stage 1 progress to 5% - 48%
    const mapped = Math.round(5 + p.percent * 0.43);
    onProgress?.({
      stage: 1,
      phase: p.phase,
      message: `[Stage 1/2 Attire] ${p.message}`,
      percent: Math.min(48, Math.max(5, mapped)),
    });
  });

  onProgress?.({
    stage: 1,
    phase: "stage1_complete",
    message: `[Stage 1/2 Attire] Attire inpaint complete! Performing neural memory cleanup before Stage 2...`,
    percent: 50,
  });

  // Neural Handshake & VRAM Flush
  await clearComfyUIVRAM().catch((err) => {
    console.warn("[CompoundInpaint] VRAM flush between stages warning:", err);
  });

  // Short pause to ensure disk flush & memory stabilization
  await new Promise((r) => setTimeout(r, 1000));

  // ==========================================
  // STAGE 2: Hairstyle Inpainting (50% -> 100%)
  // ==========================================
  const hair = (inputs.hairstyleId ? getHairstyleById(inputs.hairstyleId) : null) || HAIR_CATALOG[0] || null;
  const swatch = inputs.hairColorSwatch
    ? HAIR_COLOR_SWATCHES.find((s) => s.id === inputs.hairColorSwatch || s.name === inputs.hairColorSwatch)
    : null;
  const formattedHair = hair ? formatHairstyleWithSwatch(hair, swatch) : null;

  const targetHairName = inputs.targetHairName || formattedHair?.displayName || hair?.name || "Tailored Hairstyle";
  const targetHairDesc = inputs.targetHairDescription || formattedHair?.displayDescription || hair?.description || targetHairName;
  const hairImagePath = inputs.hairImagePath || hair?.imageUrl || "/assets/hairstyles/generic/fem_hair_01_honey_blonde_lob.jpg";
  const hairLength = inputs.hairLength || hair?.hairLength || "medium";
  const hairSlug = targetHairName.toLowerCase().replace(/[^a-z0-9]/g, "_");

  onProgress?.({
    stage: 2,
    phase: "init",
    message: `[Stage 2/2 Hairstyle] Initializing hairstyle metamorphosis (${targetHairName}) on attire plate...`,
    percent: 52,
  });

  // Pass Stage 1's output video as the source video for Stage 2
  const stage2SourceVideo = stage1Result.outputPath || stage1Result.outputPublicUrl;

  const hairInputs: HairstyleInpaintInputs = {
    hairstyleId: inputs.hairstyleId || hair?.id,
    sourceVideoPath: stage2SourceVideo,
    hairImagePath,
    personaName,
    sourceHairDescription: inputs.sourceHairDescription || "original hair",
    targetHairName,
    targetHairDescription: targetHairDesc,
    hairLength,
    trackPrompt: inputs.trackPrompt,
    customMiniMaxPrompt: inputs.customHairPrompt,
    frameCount: inputs.frameCount,
    seed: inputs.seed ? inputs.seed + 1 : 20261011,
    outputPrefix: `compound_stage2_${personaId}_${hairSlug}`,
    salonTechnique: inputs.salonTechnique || swatch?.technique,
    salonDimension: inputs.salonDimension || swatch?.dimension,
    rootTone: inputs.rootTone || swatch?.rootTone,
    tipTone: inputs.tipTone || swatch?.tipTone,
    salonFormula: inputs.salonFormula || formattedHair?.salonFormula,
    salonNegativePrompt: inputs.salonNegativePrompt || formattedHair?.negativePrompt,
    lightingPreset: inputs.lightingPreset,
    keyDirection: inputs.keyDirection,
    rimLightWrap: inputs.rimLightWrap,
    despillEnabled: inputs.despillEnabled,
    ambientBleedTint: inputs.ambientBleedTint,
    lightingConfig: inputs.lightingConfig,
    volumetricPaddingConfig: inputs.volumetricPaddingConfig,
  };

  const stage2Result = await executeHairstyleInpaint(hairInputs, (p) => {
    // Map stage 2 progress to 52% - 98%
    const mapped = Math.round(52 + p.percent * 0.46);
    onProgress?.({
      stage: 2,
      phase: p.phase,
      message: `[Stage 2/2 Hairstyle] ${p.message}`,
      percent: Math.min(98, Math.max(52, mapped)),
    });
  });

  // Prepare final completed asset
  const completedDir = path.join(process.cwd(), "public", "assets", "completed");
  if (!fs.existsSync(completedDir)) {
    fs.mkdirSync(completedDir, { recursive: true });
  }

  const finalTimestamp = Date.now();
  const finalFilename = `compound_makeover_${finalTimestamp}_${personaId}_${outfitSlug}_${hairSlug}.mp4`;
  const finalDestPath = path.join(completedDir, finalFilename);

  try {
    if (
      stage2Result.outputVideoPath &&
      fs.existsSync(stage2Result.outputVideoPath) &&
      path.resolve(stage2Result.outputVideoPath) !== path.resolve(finalDestPath)
    ) {
      fs.copyFileSync(stage2Result.outputVideoPath, finalDestPath);
    }
  } catch (copyErr) {
    console.warn("[CompoundInpaint] Failed to copy final file to custom compound name:", copyErr);
  }

  const outputVideoPath = fs.existsSync(finalDestPath) ? finalDestPath : stage2Result.outputVideoPath;
  const outputPublicUrl = fs.existsSync(finalDestPath)
    ? `/assets/completed/${finalFilename}`
    : stage2Result.outputPublicUrl;

  onProgress?.({
    stage: 2,
    phase: "done",
    message: `Complete Anchor Makeover completed successfully! (${inputs.outfitName} + ${targetHairName})`,
    percent: 100,
  });

  return {
    success: true,
    stage1OutputUrl: stage1Result.outputPublicUrl,
    stage2OutputUrl: stage2Result.outputPublicUrl,
    outputVideoPath,
    outputPublicUrl,
    outputFilename: path.basename(outputVideoPath),
    promptId: stage2Result.promptId,
  };
}
