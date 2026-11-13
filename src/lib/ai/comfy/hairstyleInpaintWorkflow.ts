/**
 * src/lib/ai/comfy/hairstyleInpaintWorkflow.ts
 *
 * Production MiniMax H3 + SAM 3.1 + MVEx Neural Video Hairstyle Metamorphosis Pipeline.
 * Enables changing anchor haircuts, hair color, volume, bangs, and length across broadcast video loops.
 */

import fs from "fs";
import path from "path";
import {
  checkComfyUIHealth,
  submitPrompt,
  waitForCompletion,
  downloadOutput,
  clearComfyUIMemory,
} from "./api";
import { comfyGenerationLock } from "./generationLock";
import {
  ComfyPromptNode,
  detectVideoFrameCount,
  resolveComfyAsset,
  resolveOutfitImageAssets,
} from "./wardrobeInpaintWorkflow";
import {
  HAIR_CATALOG,
  getHairstyleById,
  HairColorTechnique,
  HairColorDimension,
  HairToneSpec,
  compileSalonNegativePrompt,
} from "../../wardrobe/hairCatalog";
import {
  LightingEnvironmentConfig,
  LightingPresetId,
  LightDirection,
  resolveLightingConfig,
  compileLightingPromptClauses,
} from "../../wardrobe/lightingEngine";
import {
  VolumetricPaddingConfig,
  resolveVolumetricPadding,
  compileVolumetricPromptDirectives,
} from "../../wardrobe/volumetricPaddingEngine";

export interface HairstyleInpaintInputs {
  /** Optional catalog hairstyle ID for calibrated token extraction */
  hairstyleId?: string;
  /** Video file path or filename in ComfyUI */
  sourceVideoPath: string;
  /** Hairstyle 4-panel reference plate image file path or filename */
  hairImagePath: string;
  /** Persona identifier / display name (e.g. "Ruby Vance", "Blaze Wilder") */
  personaName?: string;
  /** Source hair description (e.g. "copper-red wavy hair past shoulders", "short platinum pixie crop") */
  sourceHairDescription?: string;
  /** Target hairstyle name (e.g. "Honey Blonde Structured Blunt Lob") */
  targetHairName: string;
  /** Target hairstyle detailed description */
  targetHairDescription: string;
  /** Target length to guide shoulder-mask expansion */
  hairLength?: "short" | "medium" | "long" | "updo";
  /** Compound tracking prompt override for SAM 3.1 */
  trackPrompt?: string;
  /** Custom MiniMax H3 structured prompt override */
  customMiniMaxPrompt?: string;
  /** Frame count: 0 for full video, or specific count like 39 for quick preview */
  frameCount?: number;
  /** Random noise seed (default: 20261010) */
  seed?: number;
  /** Output file prefix */
  outputPrefix?: string;

  // Phase 3: Advanced Salon Color Science Fields
  /** Optional salon technique (e.g. "balayage", "ombre", "highlights", "money_piece", "shadow_root") */
  salonTechnique?: HairColorTechnique;
  /** Dimensional contrast level ("subtle" | "medium" | "bold") */
  salonDimension?: HairColorDimension;
  /** Root tone specification */
  rootTone?: HairToneSpec;
  /** Tip / accent tone specification */
  tipTone?: HairToneSpec;
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
  volumetricPaddingConfig?: VolumetricPaddingConfig;
}

export interface HairstyleInpaintProgress {
  phase: "init" | "tracking" | "crop" | "diffusion" | "decode" | "uncrop" | "done";
  message: string;
  percent: number;
}

/**
 * Builds salon-grade micro-gradation and fiber luster descriptions for MiniMax H3 ref2va prompts.
 */
export function buildSalonColorPromptClauses(inputs: HairstyleInpaintInputs): {
  colorSummaryClause: string;
  retentionColorClause: string;
  detailedColorClause: string;
} {
  const tech = inputs.salonTechnique;
  const rootName = inputs.rootTone?.name || "root tone";
  const tipName = inputs.tipTone?.name || "tip tone";
  const dimension = inputs.salonDimension || "medium";

  const intensityDesc =
    dimension === "subtle"
      ? "soft, whisper-delicate tonal gradation"
      : dimension === "bold"
      ? "vibrant high-contrast editorial drama"
      : "natural salon-balanced multi-dimensional contrast";

  const negativeDirectives =
    inputs.salonNegativePrompt ||
    compileSalonNegativePrompt({
      id: "active_swatch",
      name: inputs.targetHairName,
      family: "brunette",
      hex: inputs.rootTone?.hex || "#241812",
      promptModifier: "",
      description: "",
      technique: tech,
      dimension,
      rootTone: inputs.rootTone,
      tipTone: inputs.tipTone,
      isDualTone: tech !== "solid" && !!tech,
    });

  if (!tech || tech === "solid") {
    const singleTone = inputs.rootTone?.name || inputs.targetHairName;
    return {
      colorSummaryClause: ` The resulting hair color must be dyed in rich uniform ${singleTone} with reflective cuticle luster, overriding any original hair color from the video and any color from the reference pictures.`,
      retentionColorClause: ` The hair color must be dyed to match the exact target color specified in <Subject 1>. Strictly eliminate ${negativeDirectives}.`,
      detailedColorClause: `Her hair displays rich, vibrant color with authentic strand luster and uniform single-process salon shine with zero color banding or demarcation lines.`,
    };
  }

  let techniqueClause = "";
  switch (tech) {
    case "balayage":
      techniqueClause = `hand-painted balayage transitions with seamless root-to-tip micro-gradations, melting naturally from ${rootName} roots into luminous ${tipName} balayage ribbons with ${intensityDesc}`;
      break;
    case "ombre":
      techniqueClause = `seamless horizontal ombré diffusion fading smoothly from ${rootName} roots through mid-lengths into vivid ${tipName} ends with ${intensityDesc}`;
      break;
    case "highlights":
      techniqueClause = `multi-dimensional salon foil-woven highlights with fine ${tipName} ribbons distributed evenly throughout a ${rootName} base, featuring ${intensityDesc} and radiant reflection`;
      break;
    case "money_piece":
      techniqueClause = `luminous ${tipName} face-framing money piece ribbons framing the face, contrasted against a deep ${rootName} foundation base with clean salon foil placement and ${intensityDesc}`;
      break;
    case "shadow_root":
      techniqueClause = `modern salon shadow root with smoky ${rootName} melt fading seamlessly into radiant ${tipName} mid-lengths and ends with ${intensityDesc}`;
      break;
  }

  const formulaBadge = inputs.salonFormula || `${dimension} ${tech} with ${rootName} and ${tipName}`;

  return {
    colorSummaryClause: ` The resulting hair color must match the dyed tone specified in <Subject 1>, utilizing salon-grade ${techniqueClause}, overriding and completely replacing any original hair color from the video and any color from the reference pictures.`,
    retentionColorClause: ` The hair color must be dyed to match the exact target color specified in <Subject 1> (${formulaBadge}). Strictly eliminate ${negativeDirectives}, achieving hand-painted tonal gradations and natural hair fiber luster.`,
    detailedColorClause: `Her hair displays professional salon-formulated ${formulaBadge}, featuring authentic root melts, dimensional luster, and secondary hair physics matching <Picture 1> with zero color banding, harsh demarcation lines, or technique artifacts.`,
  };
}

/**
 * Compiles the strict 6-section MiniMax H3 prompt lint format for hairstyle metamorphosis.
 * Phase 3: Injects precise salon coloring terminology, hand-painted balayage transitions,
 * seamless root melts, hair fiber luster, and anti-banding negative exclusions.
 */
export function generateMiniMaxHairstylePromptText(inputs: HairstyleInpaintInputs, refCount = 1): string {
  if (inputs.customMiniMaxPrompt && inputs.customMiniMaxPrompt.trim().length > 0) {
    return inputs.customMiniMaxPrompt.trim();
  }

  const persona = inputs.personaName || "news anchor";
  const sourceHair = (inputs.sourceHairDescription || "original hair").replace(/_/g, " ");
  const targetName = inputs.targetHairName || "tailored hairstyle";
  const targetDesc = inputs.targetHairDescription || targetName;
  const { colorSummaryClause, retentionColorClause, detailedColorClause } = buildSalonColorPromptClauses(inputs);

  const lighting = resolveLightingConfig(
    inputs.lightingConfig || {
      presetId: inputs.lightingPreset,
      keyDirection: inputs.keyDirection,
      rimLightWrap: inputs.rimLightWrap,
      despillEnabled: inputs.despillEnabled,
      ambientTintHex: inputs.ambientBleedTint,
    }
  );
  const lightingClauses = compileLightingPromptClauses(lighting);

  const volumetric = resolveVolumetricPadding(inputs.volumetricPaddingConfig, {
    haircutId: inputs.hairstyleId,
    haircutName: inputs.targetHairName,
    hairLength: inputs.hairLength,
    sourceLoopUrl: inputs.sourceVideoPath,
  });
  const volumetricDirectives = compileVolumetricPromptDirectives(volumetric);

  if (refCount >= 4) {
    return `subject_definitions:
<Subject 1> is the target hairstyle: ${targetDesc}. <Picture 1> shows the front view, <Picture 2> shows the side profile, <Picture 3> shows the back view, and <Picture 4> shows the hair strand texture, luster, and color dimension.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${persona}'s ${sourceHair} with <Subject 1>. Completely transform the hair cut, length, and silhouette to match the haircut geometry in <Subject 1>, utilizing <Picture 1>, <Picture 2>, <Picture 3>, and <Picture 4> to maintain accurate 360-degree hair shape, strand flow, and geometry.${colorSummaryClause} Clear any original hair that draped over the shoulders or chest if <Subject 1> is shorter. ${lightingClauses.summaryClause} ${volumetricDirectives.positiveClause}. Each replacement is complete when its target first appears.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - follow <Picture 1> (front view), <Picture 2> (side view), and <Picture 3> (back view) corresponding to head orientation, with the hair cuticles and shine from <Picture 4>. Adopt the complete hairstyle silhouette, hairline, bangs, and hair length of <Subject 1>.${retentionColorClause} Replace the original ${sourceHair} with this hairstyle. ${lightingClauses.rimEdgeWrapClause}
<Video 1>: weak_reference - follow the original standing pose, body movement, speaking cadence, facial expressions, and hand gestures. Preserve the ${persona}'s exact facial identity, eyes, nose, mouth movements, facial expressions, skin tone, green screen studio environment, and wardrobe.

detailed_description:
Photorealistic professional broadcast green screen studio. [Shot 1] The ${persona} stands in front of the solid green screen background with her hair styled in the ${targetName}. She speaks to the camera while gesturing naturally with her hands, following the movement of <Video 1>. Her facial identity, hair root transitions, and speech lip-sync are completely preserved from <Video 1>. ${detailedColorClause} The ${targetName} reacts naturally to head movements with realistic secondary hair physics, matching the front view <Picture 1>, side profile <Picture 2>, back view <Picture 3>, and hair texture <Picture 4> against the solid green chroma background. ${lightingClauses.hairCuticleReflectionClause} ${lightingClauses.shadowOcclusionClause}

overall_soundscape:
Keep the original source soundtrack synchronized with the action.

non_diegetic_music:
Retain any music already present in the source soundtrack.`;
  }

  return `subject_definitions:
<Subject 1> is the target hairstyle: ${targetDesc} from <Picture 1>.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${persona}'s ${sourceHair} with <Subject 1>. Completely transform the hair cut, length, and silhouette to match <Subject 1>, with the hair dyed to match the color specified in <Subject 1>, overriding any reference picture color.${colorSummaryClause} Clear any original hair that draped over the shoulders or chest if <Subject 1> is shorter. ${lightingClauses.summaryClause} ${volumetricDirectives.positiveClause}. Each replacement is complete when its target first appears.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - follow <Picture 1> for hair silhouette and texture, with the hair dyed to match <Subject 1>. Adopt the complete hairstyle geometry of <Subject 1>.${retentionColorClause} Replace the original ${sourceHair} with this hairstyle. ${lightingClauses.rimEdgeWrapClause}
<Video 1>: weak_reference - follow the original standing pose, body movement, speaking cadence, facial expressions, and hand gestures. Preserve the ${persona}'s exact facial identity, eyes, nose, mouth movements, facial expressions, skin tone, green screen studio environment, and wardrobe.

detailed_description:
Photorealistic professional broadcast green screen studio. [Shot 1] The ${persona} stands in front of the solid green screen background with her hair styled in the ${targetName}. She speaks to the camera while gesturing naturally with her hands, following the movement of <Video 1>. Her facial identity, expressions, and speech lip-sync are completely preserved from <Video 1>. ${detailedColorClause} The ${targetName} reacts naturally to head movements with realistic secondary hair physics matching <Picture 1> against the solid green chroma background. ${lightingClauses.hairCuticleReflectionClause} ${lightingClauses.shadowOcclusionClause}

overall_soundscape:
Keep the original source soundtrack synchronized with the action.

non_diegetic_music:
Retain any music already present in the source soundtrack.`;
}


/**
 * Loads the validated API prompt template and injects dynamic video, hairstyle multi-view plates, and tracking prompts.
 */
export function buildHairstyleInpaintPrompt(
  inputs: HairstyleInpaintInputs,
  uploadedVideoFilename: string,
  uploadedImageFilename: string | string[]
): Record<string, ComfyPromptNode> {
  const templatePath = path.join(
    process.cwd(),
    "comfy_workflows",
    "video",
    "minimax_h3_wardrobe_inpaint_api.json"
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Inpaint template not found at ${templatePath}`);
  }

  const prompt: Record<string, ComfyPromptNode> = JSON.parse(fs.readFileSync(templatePath, "utf-8"));

  const imageFiles = Array.isArray(uploadedImageFilename)
    ? uploadedImageFilename
    : [uploadedImageFilename];
  const refCount = Math.min(Math.max(imageFiles.length, 1), 5);

  const editPrompt = generateMiniMaxHairstylePromptText(inputs, refCount);
  const detectedFrames = detectVideoFrameCount(uploadedVideoFilename, inputs.sourceVideoPath);
  const frameCount = inputs.frameCount !== undefined && inputs.frameCount > 0
    ? inputs.frameCount
    : (detectedFrames !== null ? detectedFrames : 169);
  const seed = inputs.seed ?? 20261010;
  const outputPrefix =
    inputs.outputPrefix ||
    `hair_${(inputs.personaName || "anchor").toLowerCase().replace(/[^a-z0-9]/g, "_")}_${inputs.targetHairName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  // 1. Video loader
  if (prompt["11"] && prompt["11"].inputs) {
    prompt["11"].inputs["file"] = uploadedVideoFilename;
  }

  // 2. Timeline config
  if (prompt["12"] && prompt["12"].inputs) {
    prompt["12"].inputs["frame_count"] = frameCount;
    prompt["12"].inputs["aspect_ratio"] = "As Source";
    prompt["12"].inputs["fit"] = "contain";
    prompt["12"].inputs["size_multiple"] = 32;

    const effectiveClipLength = frameCount > 0 ? frameCount : (detectedFrames || 169);
    const updateTimelineJson = (raw: unknown): string => {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
        if (parsed && Array.isArray(parsed.clips) && parsed.clips.length > 0) {
          parsed.clips[0].length = effectiveClipLength;
        }
        return JSON.stringify(parsed);
      } catch {
        return typeof raw === "string" ? raw : JSON.stringify(raw);
      }
    };

    if (prompt["12"].inputs["timeline"]) {
      prompt["12"].inputs["timeline"] = updateTimelineJson(prompt["12"].inputs["timeline"]);
    }
    if (prompt["12"].inputs["nkd_timeline"]) {
      prompt["12"].inputs["nkd_timeline"] = updateTimelineJson(prompt["12"].inputs["nkd_timeline"]);
    }
  }

  // 3. SAM 3.1 Hairstyle Track Prompt
  // When converting long hair to short/updo/medium, or changing hair silhouette:
  // Must track hair, hairstyle, strands, locks, scalp, hairline, bangs, and surrounding shoulder canvas
  const userTrack = inputs.trackPrompt?.trim();
  const catalogItem = inputs.hairstyleId
    ? getHairstyleById(inputs.hairstyleId)
    : HAIR_CATALOG.find(
        (h) =>
          h.id === inputs.targetHairName ||
          h.name.toLowerCase() === inputs.targetHairName?.toLowerCase()
      );

  const hairStyleKeywords = [
    inputs.targetHairName,
    inputs.targetHairDescription,
    catalogItem?.samPrompt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .match(/\b(lob|bob|pixie|ponytail|bangs|fringe|updo|curls|waves|afro|fade|quiff|shag|braids|undercut)\b/g) || [];

  const isShorterCut =
    inputs.hairLength === "short" ||
    inputs.hairLength === "medium" ||
    inputs.hairLength === "updo" ||
    inputs.sourceHairDescription?.toLowerCase().includes("long") ||
    inputs.sourceHairDescription?.toLowerCase().includes("shoulder");

  const sourceHairTokens = inputs.sourceHairDescription
    ? inputs.sourceHairDescription.replace(/[^a-zA-Z0-9 ]/g, " ")
    : "";

  const trackParts = [
    userTrack,
    catalogItem?.samPrompt,
    ...hairStyleKeywords,
    sourceHairTokens,
    "hair, hairstyle, bangs, strands, locks, scalp, hairline, hair flyaways, outer hair strands, hair perimeter",
    isShorterCut ? "shoulders, upper chest, neck, collarbone, trapezius, shoulder slope" : "",
  ]
    .filter(Boolean)
    .join(", ");

  const trackTokens = trackParts
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const trackPrompt = Array.from(new Set(trackTokens)).join(", ");

  if (prompt["14"] && prompt["14"].inputs) {
    prompt["14"].inputs["text"] = trackPrompt;
  }
  if (prompt["15"] && prompt["15"].inputs) {
    // Lower threshold from 0.25 to 0.20 to capture fine wisps, perimeter flyaways, and edges of old hair
    prompt["15"].inputs["detection_threshold"] = 0.20;
  }

  // Remove InvertMask (Node 22) if present
  if (prompt["22"]) {
    delete prompt["22"];
  }

  // Connect MVEx_SubjectCrop (Node 19) directly to SAM3_TrackToMask
  // Phase 6: Volumetric Mask Padding & Studio Set Adaptability
  const volumetric = resolveVolumetricPadding(inputs.volumetricPaddingConfig, {
    haircutId: inputs.hairstyleId,
    haircutName: inputs.targetHairName,
    hairLength: inputs.hairLength,
    sourceLoopUrl: inputs.sourceVideoPath,
  });
  const volumetricDirectives = compileVolumetricPromptDirectives(volumetric);
  const baseCropScale = 1.5;
  const horizontalTotal = volumetricDirectives.horizontalPaddingTotal;
  const paddingBonus = (horizontalTotal / 100) * 0.45;
  const dynamicCropScale = Number((baseCropScale + paddingBonus).toFixed(2));
  const dynamicExpand = Math.max(20, Math.round(horizontalTotal / 2));

  if (prompt["19"] && prompt["19"].inputs) {
    prompt["19"].inputs["masks"] = ["16", 0];
    prompt["19"].inputs["mode"] = "tracked";
    prompt["19"].inputs["crop_scale"] = dynamicCropScale;
    prompt["19"].inputs["mode.crop_scale"] = dynamicCropScale;
    prompt["19"].inputs["padding"] = "firm";
    prompt["19"].inputs["mode.padding"] = "firm";
    prompt["19"].inputs["prefer"] = "stillness";
    prompt["19"].inputs["mode.prefer"] = "stillness";
    prompt["19"].inputs["divisible_by"] = 32;
  }

  // Node 23: Latent generation mask - bridge neck/shoulder notches with close_gaps: 48, fill_holes: true, dynamic expand & feather
  if (prompt["23"] && prompt["23"].inputs) {
    prompt["23"].inputs["close_gaps"] = 48;
    prompt["23"].inputs["expand"] = dynamicExpand;
    prompt["23"].inputs["fill_holes"] = true;
    prompt["23"].inputs["feather"] = volumetric.featherRadiusPixels;
  }

  // Node 24: Subject Blend Mask for uncrop - bridge neck/shoulder inlets with close_gaps 48px and dynamic expand & feather
  if (prompt["24"] && prompt["24"].inputs) {
    prompt["24"].class_type = "NKDMaskOps";
    prompt["24"].inputs["close_gaps"] = 48;
    prompt["24"].inputs["expand"] = dynamicExpand;
    prompt["24"].inputs["fill_holes"] = true;
    prompt["24"].inputs["feather"] = volumetric.featherRadiusPixels;
  }

  // Node 35: MVEx_SubjectUncrop - apply dynamic border feather
  if (prompt["35"] && prompt["35"].inputs) {
    prompt["35"].inputs["feather"] = volumetric.featherRadiusPixels;
  }

  // 4. MiniMax H3 Prompt Lint (Node 89)
  if (prompt["89"] && prompt["89"].inputs) {
    prompt["89"].inputs["prompt"] = editPrompt;
    prompt["89"].inputs["ref_images"] = refCount;
    prompt["89"].inputs["ref_videos"] = 1;
    prompt["89"].inputs["ref_audios"] = 0;
  }

  // 5. Reference Count gate (Node 108: ImpactInt)
  if (prompt["108"] && prompt["108"].inputs) {
    prompt["108"].inputs["value"] = refCount;
  }

  // 6. Outfit/Hair reference images:
  if (prompt["100"] && prompt["100"].inputs) {
    prompt["100"].inputs["image"] = imageFiles[0];
  }
  if (prompt["102"] && prompt["102"].inputs) {
    prompt["102"].inputs["image"] = imageFiles[1] || imageFiles[0];
  }
  if (prompt["130"] && prompt["130"].inputs) {
    prompt["130"].inputs["image"] = imageFiles[2] || imageFiles[0];
  }
  if (prompt["134"] && prompt["134"].inputs) {
    prompt["134"].inputs["image"] = imageFiles[3] || imageFiles[0];
  }
  if (prompt["138"] && prompt["138"].inputs) {
    prompt["138"].inputs["image"] = imageFiles[4] || imageFiles[0];
  }

  // 7. Random seed
  if (prompt["28"] && prompt["28"].inputs) {
    prompt["28"].inputs["noise_seed"] = seed;
  }

  // 8. Output filename prefix
  if (prompt["85"] && prompt["85"].inputs) {
    prompt["85"].inputs["filename_prefix"] = outputPrefix;
    prompt["85"].inputs["save_output"] = true;
  }

  // 9. Negative Prompt Injection (Salon color anti-banding + lighting anti-cutout/anti-halo directives)
  const salonNeg =
    inputs.salonNegativePrompt ||
    compileSalonNegativePrompt({
      id: "active",
      name: inputs.targetHairName,
      family: "brunette",
      hex: inputs.rootTone?.hex || "#241812",
      promptModifier: "",
      description: "",
      technique: inputs.salonTechnique,
      dimension: inputs.salonDimension,
      rootTone: inputs.rootTone,
      tipTone: inputs.tipTone,
      isDualTone: inputs.salonTechnique !== "solid" && !!inputs.salonTechnique,
    });

  const lighting = resolveLightingConfig(
    inputs.lightingConfig || {
      presetId: inputs.lightingPreset,
      keyDirection: inputs.keyDirection,
      rimLightWrap: inputs.rimLightWrap,
      despillEnabled: inputs.despillEnabled,
      ambientTintHex: inputs.ambientBleedTint,
    }
  );
  const lightingClauses = compileLightingPromptClauses(lighting);
  const combinedNeg = [salonNeg, lightingClauses.negativeLightingPrompt, volumetricDirectives.negativeClause].filter(Boolean).join(", ");

  for (const [nodeId, node] of Object.entries(prompt)) {
    if (node?.inputs) {
      if ("negative_prompt" in node.inputs) {
        node.inputs["negative_prompt"] = `${node.inputs["negative_prompt"] || ""}, ${combinedNeg}`.replace(/^,\s*/, "");
      } else {
        const nodeTitle = typeof (node as { _meta?: { title?: unknown } })._meta?.title === "string"
          ? ((node as { _meta?: { title?: string } })._meta!.title || "").toLowerCase()
          : "";
        if (
          node.class_type === "CLIPTextEncode" &&
          (nodeId === "5" || nodeTitle.includes("negative"))
        ) {
          node.inputs["text"] = `${node.inputs["text"] || ""}, ${combinedNeg}`.replace(/^,\s*/, "");
        }
      }
    }
  }

  return prompt;
}

/**
 * Executes the complete Hairstyle Inpainting pipeline end-to-end on ComfyUI.
 */
export async function executeHairstyleInpaint(
  inputs: HairstyleInpaintInputs,
  onProgress?: (progress: HairstyleInpaintProgress) => void
): Promise<{
  success: boolean;
  outputVideoPath: string;
  outputPublicUrl: string;
  promptId: string;
}> {
  const isHealthy = await checkComfyUIHealth();
  if (!isHealthy) {
    throw new Error("ComfyUI server is offline or unreachable on port 8188.");
  }

  const lockId = `hair-inpaint-${Date.now()}`;
  return comfyGenerationLock.withLock(lockId, async () => {
    try {
      onProgress?.({
        phase: "init",
        message: "Resolving source video and hairstyle reference plates...",
        percent: 5,
      });

      // 1. Resolve source video
      const uploadedVideo = await resolveComfyAsset(
        inputs.sourceVideoPath,
        "source_video"
      );

      // 2. Preprocess & resolve hairstyle multi-view plates
      const uploadedImages = await resolveOutfitImageAssets(
        inputs.hairImagePath,
        "hair_ref"
      );

      onProgress?.({
        phase: "init",
        message: `Configured ${uploadedImages.length}-view hairstyle reference plate (${uploadedImages.length > 1 ? "front, profile, rear, macro" : "single view"})...`,
        percent: 15,
      });

      // 3. Build prompt graph
      onProgress?.({
        phase: "tracking",
        message: "Configuring SAM 3.1 hair tracking and MiniMax H3 latent graphs...",
        percent: 25,
      });

      const promptGraph = buildHairstyleInpaintPrompt(
        inputs,
        uploadedVideo,
        uploadedImages
      );

      // 4. Submit prompt
      const clientId = `newsstudio-hair-${Date.now()}`;
      const promptId = await submitPrompt(promptGraph, clientId);

      // 5. Monitor generation progress
      const progressTracker = (pct: number) => {
        let phase: HairstyleInpaintProgress["phase"] = "tracking";
        let message = "SAM 3.1 tracking hair, hairline, and shoulder boundary...";
        const mappedPct = Math.round(25 + pct * 0.7);

        if (pct > 25 && pct <= 40) {
          phase = "crop";
          message = "MVEx_SubjectCrop isolating head/hair region & generating alpha mask...";
        } else if (pct > 40 && pct <= 85) {
          phase = "diffusion";
          message = "MiniMax H3 TaoMate 3-Step Latent Diffusion inpainting new hairstyle...";
        } else if (pct > 85 && pct <= 95) {
          phase = "decode";
          message = "VAEDecode rendering high-fidelity video latents...";
        } else if (pct > 95) {
          phase = "uncrop";
          message = "MVEx_SubjectUncrop compositing & blending with green screen background...";
        }

        onProgress?.({
          phase,
          message,
          percent: Math.min(99, mappedPct),
        });
      };

      const outputFilename = await waitForCompletion(
        promptId,
        clientId,
        7_200_000,
        progressTracker,
        promptGraph
      );

      // 6. Download rendered video
      onProgress?.({
        phase: "uncrop",
        message: "Downloading generated hairstyle video...",
        percent: 98,
      });

      let buffer = await downloadOutput(outputFilename);
      if (buffer.length <= 1024) {
        await new Promise((r) => setTimeout(r, 2000));
        buffer = await downloadOutput(outputFilename);
      }

      const completedDir = path.join(process.cwd(), "public", "assets", "completed");
      if (!fs.existsSync(completedDir)) {
        fs.mkdirSync(completedDir, { recursive: true });
      }

      const localOutName = `hair_metamorphosis_${Date.now()}_${path.basename(outputFilename)}`;
      const localOutPath = path.join(completedDir, localOutName);
      fs.writeFileSync(localOutPath, buffer);

      onProgress?.({
        phase: "done",
        message: "Hairstyle transformation complete!",
        percent: 100,
      });

      return {
        success: true,
        outputVideoPath: localOutPath,
        outputPublicUrl: `/assets/completed/${localOutName}`,
        promptId,
      };
    } finally {
      await clearComfyUIMemory().catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[HairstyleInpaint] Could not auto-clear VRAM:`, msg);
      });
    }
  });
}
