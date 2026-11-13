/**
 * src/lib/ai/comfy/wardrobeInpaintWorkflow.ts
 *
 * Production MiniMax H3 + SAM 3.1 + MVEx_SubjectCrop/Uncrop Neural Video Inpainting Pipeline.
 * Enables seamless virtual wardrobe replacement on broadcast persona video loops.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  checkComfyUIHealth,
  uploadFileToComfyUI,
  submitPrompt,
  waitForCompletion,
  downloadOutput,
  clearComfyUIVRAM,
} from "./api";
import { comfyGenerationLock } from "./generationLock";
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

export interface WardrobeInpaintInputs {
  /** Video file path or filename in ComfyUI */
  sourceVideoPath: string;
  /** Outfit reference image file path or filename */
  outfitImagePath: string;
  /** Persona identifier / display name (e.g. "Ruby Vance") */
  personaName?: string;
  /** Source garment description (e.g. "burgundy dress") */
  sourceGarment?: string;
  /** Target outfit name (e.g. "Executive Sapphire Blue Blazer Dress") */
  outfitName: string;
  /** Target outfit detailed description */
  outfitDescription: string;
  /** Compound tracking prompt for SAM 3.1 (default: "${sourceGarment || 'dress'}, dress, arms, hands") */
  trackPrompt?: string;
  /** Custom MiniMax H3 structured prompt override */
  customMiniMaxPrompt?: string;
  /** Frame count: 0 for full video, or specific count like 39 for quick preview */
  frameCount?: number;
  /** Random noise seed (default: 20261002) */
  seed?: number;
  /** Output file prefix */
  outputPrefix?: string;

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

export interface WardrobeInpaintProgress {
  phase: "init" | "tracking" | "crop" | "diffusion" | "decode" | "uncrop" | "done";
  message: string;
  percent: number;
}

/**
 * Compiles the strict 6-section MiniMax H3 prompt lint format required for ref2va inpainting.
 * Supports single reference image or full 360-degree multi-view reference plates (front, side, back, detail).
 */
export function generateMiniMaxInpaintPromptText(inputs: WardrobeInpaintInputs, refCount = 1): string {
  if (inputs.customMiniMaxPrompt && inputs.customMiniMaxPrompt.trim().length > 0) {
    return inputs.customMiniMaxPrompt.trim();
  }

  const persona = inputs.personaName || "news anchor woman";
  const sourceGarment = (inputs.sourceGarment || "burgundy dress").replace(/_/g, " ");
  const outfitName = inputs.outfitName || "structured blazer dress";
  const outfitDesc = inputs.outfitDescription || outfitName;

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
    outfitName: inputs.outfitName,
    outfitCategory: inputs.outfitDescription,
    sourceLoopUrl: inputs.sourceVideoPath,
  });
  const volumetricDirectives = compileVolumetricPromptDirectives(volumetric);

  if (refCount >= 4) {
    return `subject_definitions:
<Subject 1> is the ${outfitDesc}. <Picture 1> shows the front view, <Picture 2> shows the side profile, <Picture 3> shows the back view, and <Picture 4> shows the fabric texture and tailoring details.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${persona}'s ${sourceGarment} and arms with <Subject 1>. Completely replace the ${persona}'s upper body silhouette and neckline with the authentic tailoring, lapels, collar, and sleeves of <Subject 1>, extending fabric over the shoulders, chest, and arms regardless of original bare skin from <Video 1>. Utilize <Picture 1>, <Picture 2>, <Picture 3>, and <Picture 4> to maintain accurate 360-degree tailoring, silhouette, and fabric texture as the presenter moves. ${lightingClauses.summaryClause} ${volumetricDirectives.positiveClause}. Each replacement is complete when its target first appears.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - follow <Picture 1> (front view), <Picture 2> (side view), and <Picture 3> (back view) corresponding to the presenter's body orientation, with the textile weave and material properties from <Picture 4>. Adopt the complete silhouette, collar structure, lapels, sleeves, and garment geometry of <Subject 1>. The new outfit replaces the original ${sourceGarment} and bare skin, extending fabric cleanly over shoulders, chest, and arms without conforming to the cut of the original garment. ${lightingClauses.rimEdgeWrapClause}
<Video 1>: weak_reference - follow the original standing pose, body movement, speaking cadence, facial expressions, and hand gestures. Preserve the ${persona}'s exact facial identity, hair, green screen studio environment, and proportions.

detailed_description:
Photorealistic professional broadcast green screen studio. [Shot 1] The ${persona} stands in front of the solid green screen background wearing the ${outfitName}. She speaks to the camera while gesturing naturally with her hands, following the movement of <Video 1>. Her facial identity, hair, head movements, and speech are completely preserved from <Video 1>. The ${outfitName} completely replaces the presenter's previous clothing and neckline with crisp tailoring, authentic shoulder structure, lapels, and sleeves matching the front view <Picture 1>, side profile <Picture 2>, back view <Picture 3>, and fabric texture <Picture 4> against the solid green chroma background. The garment drapes naturally over the presenter's upper body with its true silhouette rather than conforming to the source video's garment cut. ${lightingClauses.textileBounceClause} ${lightingClauses.shadowOcclusionClause}

overall_soundscape:
Keep the original source soundtrack synchronized with the action.

non_diegetic_music:
Retain any music already present in the source soundtrack.`;
  }

  if (refCount === 3) {
    return `subject_definitions:
<Subject 1> is the ${outfitDesc}. <Picture 1> shows the front view, <Picture 2> shows the side profile, and <Picture 3> shows the back view.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${persona}'s ${sourceGarment} and arms with <Subject 1>. Completely replace the ${persona}'s upper body silhouette and neckline with the authentic tailoring, lapels, collar, and sleeves of <Subject 1>, extending fabric over the shoulders, chest, and arms regardless of original bare skin from <Video 1>. Utilize <Picture 1>, <Picture 2>, and <Picture 3> to maintain accurate 360-degree tailoring and silhouette as the presenter moves. ${lightingClauses.summaryClause} ${volumetricDirectives.positiveClause}. Each replacement is complete when its target first appears.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - follow <Picture 1> (front view), <Picture 2> (side view), and <Picture 3> (back view) corresponding to the presenter's body orientation. Adopt the complete silhouette, collar structure, lapels, sleeves, and garment geometry of <Subject 1>. The new outfit replaces the original ${sourceGarment} and bare skin, extending fabric cleanly over shoulders, chest, and arms without conforming to the cut of the original garment. ${lightingClauses.rimEdgeWrapClause}
<Video 1>: weak_reference - follow the original standing pose, body movement, speaking cadence, facial expressions, and hand gestures. Preserve the ${persona}'s exact facial identity, hair, green screen studio environment, and proportions.

detailed_description:
Photorealistic professional broadcast green screen studio. [Shot 1] The ${persona} stands in front of the solid green screen background wearing the ${outfitName}. She speaks to the camera while gesturing naturally with her hands, following the movement of <Video 1>. Her facial identity, hair, head movements, and speech are completely preserved from <Video 1>. The ${outfitName} completely replaces the presenter's previous clothing and neckline with crisp tailoring, authentic shoulder structure, lapels, and sleeves matching the front view <Picture 1>, side profile <Picture 2>, and back view <Picture 3> against the solid green chroma background. The garment drapes naturally over the presenter's upper body with its true silhouette rather than conforming to the source video's garment cut. ${lightingClauses.textileBounceClause} ${lightingClauses.shadowOcclusionClause}

overall_soundscape:
Keep the original source soundtrack synchronized with the action.

non_diegetic_music:
Retain any music already present in the source soundtrack.`;
  }

  return `subject_definitions:
<Subject 1> is the ${outfitDesc} from <Picture 1>.
<Video 1> is the source video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Replace the ${persona}'s ${sourceGarment} and arms with <Subject 1>. Completely replace the ${persona}'s upper body silhouette and neckline with the authentic tailoring, lapels, collar, and sleeves of <Subject 1>, extending fabric over the shoulders, chest, and arms regardless of original bare skin from <Video 1>. ${lightingClauses.summaryClause} ${volumetricDirectives.positiveClause}. Each replacement is complete when its target first appears.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - retain the ${outfitDesc}. Adopt the complete silhouette, collar structure, lapels, sleeves, and garment geometry of <Subject 1>. The new outfit replaces the original ${sourceGarment} and bare skin, extending fabric cleanly over shoulders, chest, and arms without conforming to the cut of the original garment. ${lightingClauses.rimEdgeWrapClause}
<Video 1>: weak_reference - follow the original standing pose, body movement, speaking cadence, facial expressions, and hand gestures. Preserve the ${persona}'s exact facial identity, hair, green screen studio environment, and proportions.

detailed_description:
Photorealistic professional broadcast green screen studio. [Shot 1] The ${persona} stands in front of the solid green screen background wearing the ${outfitName}. She speaks to the camera while gesturing naturally with her hands, following the movement of <Video 1>. Her facial identity, hair, head movements, and speech are completely preserved from <Video 1>. The ${outfitName} completely replaces the presenter's previous clothing and neckline with crisp tailoring, authentic shoulder structure, lapels, and sleeves against the solid green chroma background. The garment drapes naturally over the presenter's upper body with its true silhouette rather than conforming to the source video's garment cut. ${lightingClauses.textileBounceClause} ${lightingClauses.shadowOcclusionClause}

overall_soundscape:
Keep the original source soundtrack synchronized with the action.

non_diegetic_music:
Retain any music already present in the source soundtrack.`;
}

/**
 * Detects known broadcast action loop native frame counts to prevent headless timeline clipping.
 */
export function detectVideoFrameCount(filename: string, originalPath?: string): number | null {
  const combined = `${filename} ${originalPath || ""}`.toLowerCase();
  if (combined.includes("blaze_silver_blazer_m2")) return 185;
  if (combined.includes("blaze_silver_blazer_m1")) return 185;
  if (combined.includes("ruby_burgundy_m1")) return 169;
  if (combined.includes("ruby_emerald_blazer")) return 72;
  if (combined.includes("ruby_sapphire_blazer")) return 169;
  if (combined.includes("ruby_corset")) return 96;
  if (combined.includes("blaze_chic_leather") || combined.includes("blaze_p02")) return 96;
  if (combined.includes("blaze_studio_loop_v2") || combined.includes("blaze_p03")) return 96;
  if (combined.includes("diego_charcoal_suit")) return 84;
  if (combined.includes("aris_charcoal_suit")) return 84;
  return null;
}

export interface ComfyPromptNode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

/**
 * Loads the validated API prompt template and injects dynamic video, image, prompts, and parameters.
 */
export function buildWardrobeInpaintPrompt(
  inputs: WardrobeInpaintInputs,
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
    throw new Error(`Wardrobe inpaint template not found at ${templatePath}`);
  }

  const prompt: Record<string, ComfyPromptNode> = JSON.parse(fs.readFileSync(templatePath, "utf-8"));

  const imageFiles = Array.isArray(uploadedImageFilename)
    ? uploadedImageFilename
    : [uploadedImageFilename];
  const refCount = Math.min(Math.max(imageFiles.length, 1), 5);

  const editPrompt = generateMiniMaxInpaintPromptText(inputs, refCount);
  const detectedFrames = detectVideoFrameCount(uploadedVideoFilename, inputs.sourceVideoPath);
  const frameCount = inputs.frameCount !== undefined && inputs.frameCount > 0
    ? inputs.frameCount
    : (detectedFrames !== null ? detectedFrames : (inputs.frameCount !== undefined ? inputs.frameCount : 0));
  const seed = inputs.seed ?? 20261002;
  const outputPrefix =
    inputs.outputPrefix ||
    `wardrobe_inpaint_${Date.now()}_${inputs.outfitName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

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

  // 3. SAM 3.1 track prompt: comprehensive upper body + garment canvas segmentation
  const userTrack = inputs.trackPrompt?.trim();
  const sourceGarment = (inputs.sourceGarment?.trim() || "clothing").replace(/_/g, " ");
  const targetKeywords = [inputs.outfitName, inputs.outfitDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .match(/\b(jacket|blazer|kimono|noragi|coat|sweater|cardigan|suit|trousers|pants|skirt|dress|top|shirt|blouse|sleeves|lapels|collar)\b/g) || [];

  const trackParts = [
    userTrack,
    sourceGarment,
    ...targetKeywords,
    "clothing, attire, outfit, dress, top, shirt, jacket, blazer, shoulders, chest, torso, upper body, neckline, collar, arms, sleeves, hands",
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
    prompt["15"].inputs["detection_threshold"] = 0.25;
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

  // 6. Outfit reference images:
  // Node 100: Picture 1 (Front view)
  // Node 102: Picture 2 (Side view)
  // Node 130: Picture 3 (Back view)
  // Node 134: Picture 4 (Detail view)
  // Node 138: Picture 5 (Extra view)
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

  // 6. Random seed
  if (prompt["28"] && prompt["28"].inputs) {
    prompt["28"].inputs["noise_seed"] = seed;
  }

  // 7. Video combine output
  if (prompt["85"] && prompt["85"].inputs) {
    prompt["85"].inputs["filename_prefix"] = outputPrefix;
    prompt["85"].inputs["save_output"] = true;
  }

  // 8. Remove Node 22 (InvertMask) which was destroying the mask
  if (prompt["22"]) {
    delete prompt["22"];
  }

  // Phase 6: Volumetric Mask Padding & Studio Set Adaptability
  const volumetric = resolveVolumetricPadding(inputs.volumetricPaddingConfig, {
    outfitName: inputs.outfitName,
    outfitCategory: inputs.outfitDescription,
    sourceLoopUrl: inputs.sourceVideoPath,
  });
  const volumetricDirectives = compileVolumetricPromptDirectives(volumetric);
  const baseCropScale = 1.5;
  const horizontalTotal = volumetricDirectives.horizontalPaddingTotal;
  const paddingBonus = (horizontalTotal / 100) * 0.4;
  const dynamicCropScale = Number((baseCropScale + paddingBonus).toFixed(2));
  const dynamicExpand = Math.round(horizontalTotal / 4);

  // Connect MVEx_SubjectCrop (Node 19) directly to SAM3_TrackToMask (["16", 0])
  // Re-enable tracked mode with dynamic crop_scale, firm padding, stillness preference, divisible_by: 32
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

  // MVEx_MaskFillHolesAndFeather (Nodes 23 & 24): disable fill_holes, apply dynamic volumetric feather & expansion
  if (prompt["23"] && prompt["23"].inputs) {
    prompt["23"].inputs["close_gaps"] = 0;
    prompt["23"].inputs["expand"] = dynamicExpand;
    prompt["23"].inputs["fill_holes"] = false;
    prompt["23"].inputs["feather"] = volumetric.featherRadiusPixels;
  }

  if (prompt["24"] && prompt["24"].inputs) {
    prompt["24"].class_type = "NKDMaskOps";
    prompt["24"].inputs["close_gaps"] = 0;
    prompt["24"].inputs["expand"] = dynamicExpand;
    prompt["24"].inputs["fill_holes"] = false;
    prompt["24"].inputs["feather"] = volumetric.featherRadiusPixels;
  }

  // 9. Negative Lighting & Volumetric Prompt Injection (anti-cutout, anti-halo, anti-clipping directives)
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
  const combinedNeg = `${lightingClauses.negativeLightingPrompt}, ${volumetricDirectives.negativeClause}`;

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
 * Resolves a local or remote video/image path into a ComfyUI uploaded filename.
 */
export async function resolveComfyAsset(filePathOrUrl: string, defaultName: string): Promise<string> {
  // If it's already just a filename that exists in ComfyUI input folder
  const comfyInputDir = path.resolve(
    process.env.LOCALAPPDATA || "C:/Users/danie/AppData/Local",
    "Comfy-Desktop/ComfyUI-Installs/ComfyUI/ComfyUI/input"
  );

  const directPathInComfy = path.join(comfyInputDir, path.basename(filePathOrUrl));
  if (fs.existsSync(directPathInComfy)) {
    return path.basename(filePathOrUrl);
  }

  // Check if it's a public web asset
  if (filePathOrUrl.startsWith("/")) {
    const publicPath = path.join(process.cwd(), "public", filePathOrUrl.replace(/^\//, ""));
    if (fs.existsSync(publicPath)) {
      return await uploadFileToComfyUI(publicPath, "", path.basename(publicPath));
    }
  }

  // Check local filesystem
  if (fs.existsSync(filePathOrUrl)) {
    return await uploadFileToComfyUI(filePathOrUrl, "", path.basename(filePathOrUrl));
  }

  // Check public/assets/
  const relPublic = path.join(process.cwd(), "public", filePathOrUrl);
  if (fs.existsSync(relPublic)) {
    return await uploadFileToComfyUI(relPublic, "", path.basename(relPublic));
  }

  // If remote URL
  if (filePathOrUrl.startsWith("http://") || filePathOrUrl.startsWith("https://")) {
    const res = await fetch(filePathOrUrl);
    if (!res.ok) throw new Error(`Failed to fetch asset from URL ${filePathOrUrl}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return await uploadFileToComfyUI(buffer, "", `${defaultName}_${Date.now()}${path.extname(filePathOrUrl) || ".png"}`);
  }

  return path.basename(filePathOrUrl);
}

export interface OutfitPanel {
  buffer: Buffer;
  filename: string;
  role: "front" | "side" | "back" | "detail" | "single";
  index: number;
  width: number;
  height: number;
}

export interface OutfitPreprocessResult {
  panels: OutfitPanel[];
  wasMultiView: boolean;
  wasCropped: boolean;
  panelCount: number;
  width?: number;
  height?: number;
  originalWidth?: number;
  originalHeight?: number;
  buffer: Buffer;
  filename: string;
}

/**
 * Pre-processes an outfit reference image using sharp.
 * If the input image is a 4-panel composite plate (aspect ratio >= 1.5 or from /assets/wardrobe/),
 * extracts all individual panels (front view, side view, back view, and fabric texture close-up)
 * so MiniMax H3 ref2va receives multi-angle reference conditioning for 360-degree presenter motion.
 */
export async function preprocessOutfitImage(
  fileOrPathOrBuffer: string | Buffer,
  defaultName = "outfit_ref"
): Promise<OutfitPreprocessResult> {
  let buffer: Buffer;
  let ext = ".jpg";
  let baseName = defaultName;
  let sourceIdentifier = "";

  if (Buffer.isBuffer(fileOrPathOrBuffer)) {
    buffer = fileOrPathOrBuffer;
  } else {
    sourceIdentifier = fileOrPathOrBuffer.trim();
    if (sourceIdentifier.startsWith("@")) {
      sourceIdentifier = sourceIdentifier.substring(1).trim();
    }
    if (sourceIdentifier.startsWith("/localhost:") || sourceIdentifier.startsWith("/127.0.0.1:")) {
      sourceIdentifier = "http:/" + sourceIdentifier;
    } else if (sourceIdentifier.startsWith("localhost:") || sourceIdentifier.startsWith("127.0.0.1:")) {
      sourceIdentifier = "http://" + sourceIdentifier;
    }

    ext = path.extname(sourceIdentifier) || ".jpg";
    baseName = path.basename(sourceIdentifier, ext);

    // Check localhost URLs first to avoid network round-trip
    if (sourceIdentifier.startsWith("http://localhost:") || sourceIdentifier.startsWith("http://127.0.0.1:")) {
      try {
        const urlObj = new URL(sourceIdentifier);
        const localRel = path.join(process.cwd(), "public", urlObj.pathname.replace(/^\//, ""));
        if (fs.existsSync(localRel)) {
          sourceIdentifier = localRel;
        }
      } catch {}
    }

    if (sourceIdentifier.startsWith("http://") || sourceIdentifier.startsWith("https://")) {
      const res = await fetch(sourceIdentifier);
      if (!res.ok) throw new Error(`Failed to fetch outfit image from URL: ${sourceIdentifier}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      const comfyInputDir = path.resolve(
        process.env.LOCALAPPDATA || "C:/Users/danie/AppData/Local",
        "Comfy-Desktop/ComfyUI-Installs/ComfyUI/ComfyUI/input"
      );

      const cleanPath = sourceIdentifier.startsWith("/")
        ? path.join(process.cwd(), "public", sourceIdentifier.replace(/^\//, ""))
        : sourceIdentifier;

      const candidates = [
        cleanPath,
        path.join(process.cwd(), "public", sourceIdentifier),
        path.join(process.cwd(), "public", "assets", "wardrobe", "generic", path.basename(sourceIdentifier)),
        path.join(comfyInputDir, path.basename(sourceIdentifier)),
      ].filter(Boolean);

      let foundPath: string | null = null;
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          foundPath = cand;
          break;
        }
      }

      if (foundPath) {
        buffer = fs.readFileSync(foundPath);
        sourceIdentifier = foundPath;
      } else {
        const fallbackPanel: OutfitPanel = {
          buffer: Buffer.alloc(0),
          filename: path.basename(sourceIdentifier),
          role: "single",
          index: 1,
          width: 0,
          height: 0,
        };
        return {
          panels: [fallbackPanel],
          wasMultiView: false,
          wasCropped: false,
          panelCount: 1,
          buffer: Buffer.alloc(0),
          filename: path.basename(sourceIdentifier),
        };
      }
    }
  }

  try {
    const meta = await sharp(buffer).metadata();
    const origWidth = meta.width || 0;
    const origHeight = meta.height || 0;
    const aspectRatio = origHeight > 0 ? origWidth / origHeight : 1;

    const isAlreadyExtracted =
      sourceIdentifier.includes("view1_front") ||
      sourceIdentifier.includes("panel1_front") ||
      sourceIdentifier.includes("view2_side") ||
      sourceIdentifier.includes("view3_back") ||
      sourceIdentifier.includes("view4_detail");
    const isWide = origHeight > 0 && origWidth / origHeight > 1.35;

    const isWardrobeCatalog =
      sourceIdentifier.includes("/assets/wardrobe/") ||
      sourceIdentifier.includes("\\assets\\wardrobe\\") ||
      sourceIdentifier.includes("wardrobe_") ||
      sourceIdentifier.includes("fem_") ||
      sourceIdentifier.includes("male_") ||
      sourceIdentifier.includes("uni_");

    const is4PanelCollage = !isAlreadyExtracted && isWide && (isWardrobeCatalog || aspectRatio >= 1.5);
    const is3PanelCollage = !isAlreadyExtracted && !is4PanelCollage && isWide && aspectRatio >= 1.25;

    if (is4PanelCollage && origWidth > 0 && origHeight > 0) {
      const pw = Math.round(origWidth / 4);
      const timestamp = Date.now();

      // Panel 1: Front view (leftmost 25%)
      const p1Buffer = await sharp(buffer)
        .extract({ left: 0, top: 0, width: pw, height: origHeight })
        .toBuffer();
      const p1Meta = await sharp(p1Buffer).metadata();
      const p1Filename = `${baseName}_view1_front_${timestamp}${ext || ".jpg"}`;

      // Panel 2: Side / 3/4 profile view (25% to 50%)
      const p2Buffer = await sharp(buffer)
        .extract({ left: pw, top: 0, width: pw, height: origHeight })
        .toBuffer();
      const p2Meta = await sharp(p2Buffer).metadata();
      const p2Filename = `${baseName}_view2_side_${timestamp}${ext || ".jpg"}`;

      // Panel 3: Back view (50% to 75%)
      const p3Buffer = await sharp(buffer)
        .extract({ left: pw * 2, top: 0, width: pw, height: origHeight })
        .toBuffer();
      const p3Meta = await sharp(p3Buffer).metadata();
      const p3Filename = `${baseName}_view3_back_${timestamp}${ext || ".jpg"}`;

      // Panel 4: Detail / Fabric texture (75% to 100%)
      const p4Width = origWidth - pw * 3;
      const p4Buffer = await sharp(buffer)
        .extract({ left: pw * 3, top: 0, width: p4Width, height: origHeight })
        .toBuffer();
      const p4Meta = await sharp(p4Buffer).metadata();
      const p4Filename = `${baseName}_view4_detail_${timestamp}${ext || ".jpg"}`;

      const panels: OutfitPanel[] = [
        { buffer: p1Buffer, filename: p1Filename, role: "front", index: 1, width: p1Meta.width || pw, height: p1Meta.height || origHeight },
        { buffer: p2Buffer, filename: p2Filename, role: "side", index: 2, width: p2Meta.width || pw, height: p2Meta.height || origHeight },
        { buffer: p3Buffer, filename: p3Filename, role: "back", index: 3, width: p3Meta.width || pw, height: p3Meta.height || origHeight },
        { buffer: p4Buffer, filename: p4Filename, role: "detail", index: 4, width: p4Meta.width || p4Width, height: p4Meta.height || origHeight },
      ];

      return {
        panels,
        wasMultiView: true,
        wasCropped: true,
        panelCount: 4,
        width: p1Meta.width || pw,
        height: p1Meta.height || origHeight,
        originalWidth: origWidth,
        originalHeight: origHeight,
        buffer: p1Buffer,
        filename: p1Filename,
      };
    }

    if (is3PanelCollage && origWidth > 0 && origHeight > 0) {
      const pw = Math.round(origWidth / 3);
      const timestamp = Date.now();

      const p1Buffer = await sharp(buffer)
        .extract({ left: 0, top: 0, width: pw, height: origHeight })
        .toBuffer();
      const p1Meta = await sharp(p1Buffer).metadata();
      const p1Filename = `${baseName}_view1_front_${timestamp}${ext || ".jpg"}`;

      const p2Buffer = await sharp(buffer)
        .extract({ left: pw, top: 0, width: pw, height: origHeight })
        .toBuffer();
      const p2Meta = await sharp(p2Buffer).metadata();
      const p2Filename = `${baseName}_view2_side_${timestamp}${ext || ".jpg"}`;

      const p3Width = origWidth - pw * 2;
      const p3Buffer = await sharp(buffer)
        .extract({ left: pw * 2, top: 0, width: p3Width, height: origHeight })
        .toBuffer();
      const p3Meta = await sharp(p3Buffer).metadata();
      const p3Filename = `${baseName}_view3_back_${timestamp}${ext || ".jpg"}`;

      const panels: OutfitPanel[] = [
        { buffer: p1Buffer, filename: p1Filename, role: "front", index: 1, width: p1Meta.width || pw, height: p1Meta.height || origHeight },
        { buffer: p2Buffer, filename: p2Filename, role: "side", index: 2, width: p2Meta.width || pw, height: p2Meta.height || origHeight },
        { buffer: p3Buffer, filename: p3Filename, role: "back", index: 3, width: p3Meta.width || p3Width, height: p3Meta.height || origHeight },
      ];

      return {
        panels,
        wasMultiView: true,
        wasCropped: true,
        panelCount: 3,
        width: p1Meta.width || pw,
        height: p1Meta.height || origHeight,
        originalWidth: origWidth,
        originalHeight: origHeight,
        buffer: p1Buffer,
        filename: p1Filename,
      };
    }

    const singlePanel: OutfitPanel = {
      buffer,
      filename: `${baseName}_${Date.now()}${ext || ".png"}`,
      role: "single",
      index: 1,
      width: origWidth,
      height: origHeight,
    };

    return {
      panels: [singlePanel],
      wasMultiView: false,
      wasCropped: false,
      panelCount: 1,
      width: origWidth,
      height: origHeight,
      originalWidth: origWidth,
      originalHeight: origHeight,
      buffer,
      filename: singlePanel.filename,
    };
  } catch (err) {
    console.warn(`[WardrobeInpaint] Sharp metadata extraction failed:`, err);
    const fallbackPanel: OutfitPanel = {
      buffer,
      filename: `${baseName}_${Date.now()}${ext || ".png"}`,
      role: "single",
      index: 1,
      width: 0,
      height: 0,
    };
    return {
      panels: [fallbackPanel],
      wasMultiView: false,
      wasCropped: false,
      panelCount: 1,
      buffer,
      filename: fallbackPanel.filename,
    };
  }
}

/**
 * Resolves outfit reference images with automatic multi-view panel extraction
 * (front view, side profile, back view, detail texture) and uploads all views to ComfyUI.
 */
export async function resolveOutfitImageAssets(
  filePathOrUrl: string,
  defaultName = "outfit_ref"
): Promise<string[]> {
  const processed = await preprocessOutfitImage(filePathOrUrl, defaultName);
  const uploadedFilenames: string[] = [];

  if (processed.panels && processed.panels.length > 0) {
    for (const panel of processed.panels) {
      if (panel.buffer && panel.buffer.length > 0) {
        const uploaded = await uploadFileToComfyUI(panel.buffer, "", panel.filename);
        uploadedFilenames.push(uploaded);
      }
    }
  }

  if (uploadedFilenames.length > 0) {
    return uploadedFilenames;
  }

  const single = await resolveComfyAsset(filePathOrUrl, defaultName);
  return [single];
}

/**
 * Backward-compatible single asset resolver.
 */
export async function resolveOutfitImageAsset(
  filePathOrUrl: string,
  defaultName = "outfit_ref"
): Promise<string> {
  const assets = await resolveOutfitImageAssets(filePathOrUrl, defaultName);
  return assets[0] || "";
}

/**
 * Executes the complete wardrobe video inpainting pipeline end-to-end.
 */
export async function executeWardrobeInpaint(
  inputs: WardrobeInpaintInputs,
  onProgress?: (progress: WardrobeInpaintProgress) => void
): Promise<{
  outputFilename: string;
  outputPublicUrl: string;
  outputPath: string;
  buffer: Buffer;
}> {
  const isHealthy = await checkComfyUIHealth();
  if (!isHealthy) {
    throw new Error(
      "ComfyUI server is currently offline on port 8188. Please ensure ComfyUI is running with MiniMax H3 & SAM 3.1 models loaded."
    );
  }

  const lockId = `wardrobe-inpaint-${Date.now()}`;
  return comfyGenerationLock.withLock(lockId, async () => {
    try {
      onProgress?.({
        phase: "init",
        message: "Resolving source video and 360-degree multi-view outfit references...",
        percent: 5,
      });

      const uploadedVideo = await resolveComfyAsset(
        inputs.sourceVideoPath,
        "source_video"
      );
      const uploadedImages = await resolveOutfitImageAssets(
        inputs.outfitImagePath,
        "outfit_ref"
      );

      onProgress?.({
        phase: "init",
        message: `Configured ${uploadedImages.length}-view reference plate (${uploadedImages.length > 1 ? "front, side, back, detail" : "single view"}) with boundary-locked SubjectCrop...`,
        percent: 10,
      });

      const prompt = buildWardrobeInpaintPrompt(inputs, uploadedVideo, uploadedImages);
      const clientId = `newsstudio-wardrobe-${Date.now()}`;

      onProgress?.({
        phase: "tracking",
        message: "Submitting workflow to ComfyUI neural engine...",
        percent: 15,
      });

      const promptId = await submitPrompt(prompt, clientId);

      const progressTracker = (pct: number) => {
        let phase: WardrobeInpaintProgress["phase"] = "tracking";
        let message = "SAM 3.1 tracking garment, arms, and hand gestures...";
        const mappedPct = Math.round(15 + pct * 0.8);

        if (pct > 25 && pct <= 40) {
          phase = "crop";
          message = "MVEx_SubjectCrop isolating subject & generating alpha mask...";
        } else if (pct > 40 && pct <= 85) {
          phase = "diffusion";
          message = "MiniMax H3 TaoMate 3-Step Latent Diffusion inpainting new wardrobe...";
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
        prompt
      );

      onProgress?.({
        phase: "uncrop",
        message: "Downloading generated inpaint video...",
        percent: 98,
      });

      let buffer = await downloadOutput(outputFilename);
      if (buffer.length <= 1024) {
        // Wait 2 seconds and retry in case ComfyUI was finalizing the disk write
        await new Promise((r) => setTimeout(r, 2000));
        buffer = await downloadOutput(outputFilename);
      }

      // Save to public completed folder for instant playback
      const completedDir = path.join(process.cwd(), "public", "assets", "completed");
      if (!fs.existsSync(completedDir)) {
        fs.mkdirSync(completedDir, { recursive: true });
      }
      const safeOutputName = `wardrobe_inpainted_${Date.now()}_${path.basename(outputFilename)}`;
      const localDest = path.join(completedDir, safeOutputName);
      fs.writeFileSync(localDest, buffer);

      const outputPublicUrl = `/assets/completed/${safeOutputName}`;

      onProgress?.({
        phase: "done",
        message: "Neural wardrobe replacement completed successfully!",
        percent: 100,
      });

      return {
        outputFilename,
        outputPublicUrl,
        outputPath: localDest,
        buffer,
      };
    } finally {
      await clearComfyUIVRAM().catch((err) => {
        console.warn("[WardrobeInpaint] Failed to clear ComfyUI VRAM in finally block:", err);
      });
    }
  });
}
