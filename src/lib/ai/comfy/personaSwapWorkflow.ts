/**
 * src/lib/ai/comfy/personaSwapWorkflow.ts
 *
 * Production MiniMax H3 + SAM 3.1 Neural Persona Transference Pipeline
 * ("Swap Persona, Keep Outfit & Movement").
 *
 * Preserves 100% of the body, attire, lapels, sleeves, hands, desk, and kinematic
 * movement pixel-locked, while inpainting and swapping the head, face, eyes, jawline,
 * skin tone, and hair to a selected Target Persona.
 */

import fs from "fs";
import path from "path";
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
  ComfyPromptNode,
  detectVideoFrameCount,
  resolveComfyAsset,
} from "./wardrobeInpaintWorkflow";
import {
  PERSONAS,
  Persona,
  getPersonaById,
  getPersonaPhysicalBase,
  getPersonaNeutralHeadshotPrompt,
  formatConcatenatedName,
} from "../../tts/personas";
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

export interface PersonaSwapInputs {
  /** Source video loop path or ComfyUI filename */
  sourceVideoPath: string;
  /** Target persona ID to transfer onto the anchor (e.g. "blaze", "aris", "maya", "diego") */
  targetPersonaId: string;
  /** Optional target persona display name override */
  targetPersonaName?: string;
  /** Optional source persona ID (e.g. "ruby") */
  sourcePersonaId?: string;
  /** Optional source persona display name */
  sourcePersonaName?: string;
  /** Source garment description (e.g. "burgundy tailored blazer dress") */
  sourceGarment?: string;
  /** Optional outfit name identifier for vault persistence */
  outfitName?: string;
  /**
   * If true: Retains the source video's hair silhouette and volume, inpainting only face/skin.
   * If false (default): Adopts the target persona's signature hairstyle along with facial identity.
   */
  keepOriginalHair?: boolean;
  /** Optional custom reference portrait image path or URL */
  referenceImagePath?: string;
  /** Inverted tracking prompt override for SAM 3.1 */
  trackPrompt?: string;
  /** Custom MiniMax H3 prompt override */
  customMiniMaxPrompt?: string;
  /** Frame count: 0 for full video or specific count (e.g. 39 for slice) */
  frameCount?: number;
  /** Random noise seed */
  seed?: number;
  /** Output file prefix */
  outputPrefix?: string;
  /** Whether to allow fallback simulation in test/mock environments when ComfyUI is offline */
  allowSimulation?: boolean;
  /**
   * Morphology policy for body and attire adaptation:
   * - "strict_garment" (default): 100% locks clothing, corset boning, and bust contours from source video.
   * - "adapt_persona_attire": Adapts both physical build and clothing to match target persona's traits, gender, and signature wardrobe.
   * - "biometric_adaptation": Adapts bust volume, cleavage, and decolletage to match target persona's traits while keeping outfit structure.
   */
  morphologyPolicy?: "strict_garment" | "adapt_persona_attire" | "biometric_adaptation";
  /**
   * Alias / ergonomic toggle for body adaptation:
   * - "strict_outfit" (default): Keep original clothing.
   * - "adapt_to_persona": Adapt physique, chest, and attire to target persona.
   */
  bodyAdaptation?: "strict_outfit" | "adapt_to_persona";
  /**
   * Sleeve style policy when adapting body and attire:
   * - "auto" (default): Automatically detects if target attire requires long sleeves (suits, blazers, jackets, tuxedos, coats, shirts -> full_sleeves).
   * - "full_sleeves": Explicitly tracks arms and generates full tailored sleeves down to wrists with shirt cuffs, keeping hands pixel-locked.
   * - "sleeveless": Retains bare arms / sleeveless silhouette from source video.
   * - "match_source": Explicitly matches source video arm coverage.
   */
  sleeveStyle?: "full_sleeves" | "sleeveless" | "match_source" | "auto";

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

export interface PersonaSwapProgress {
  phase: "init" | "tracking" | "crop" | "diffusion" | "decode" | "uncrop" | "done";
  message: string;
  percent: number;
}

/**
 * Resolves whether full long sleeves should be synthesized based on sleeve policy,
 * target attire keywords, and anchor gender.
 */
export function resolveShouldUseFullSleeves(
  sleeveStyle: "full_sleeves" | "sleeveless" | "match_source" | "auto" = "auto",
  targetAttireText: string = "",
  gender: string = "female"
): boolean {
  if (sleeveStyle === "full_sleeves") return true;
  if (sleeveStyle === "sleeveless" || sleeveStyle === "match_source") return false;

  // "auto": detect if attire or gender calls for long sleeves (suits, blazers, jackets, coats, shirts, male business formal)
  const lower = (targetAttireText || "").toLowerCase();
  const hasLongSleeveIndicator =
    /\b(suit|blazer|jacket|tuxedo|coat|trench|sweater|cardigan|shirt|long sleeve|executive|formal business)\b/.test(
      lower
    );

  if (hasLongSleeveIndicator) return true;
  if (gender === "male") return true;

  return false;
}

/**
 * Calibrates inverted tracking prompt targeting head, face, skin, and optionally hair
 * while preserving body, attire, lapels, sleeves, hands, desk, and kinematics.
 * Aggressively tracks cascading shoulder hair to eliminate ghost hair remnants,
 * optionally tracks decolletage/bust/clothing for full body and attire adaptation,
 * and tracks arms for full tailored suit sleeves when appropriate.
 */
export function generatePersonaSwapTrackPrompt(
  keepOriginalHair: boolean = false,
  morphologyPolicy: "strict_garment" | "adapt_persona_attire" | "biometric_adaptation" = "strict_garment",
  bodyAdaptation?: "strict_outfit" | "adapt_to_persona",
  sleeveStyle: "full_sleeves" | "sleeveless" | "match_source" | "auto" = "auto",
  targetAttireText?: string,
  gender?: string
): string {
  const isAttireAdapted =
    morphologyPolicy === "adapt_persona_attire" ||
    bodyAdaptation === "adapt_to_persona";

  const baseHair = keepOriginalHair
    ? "face, skin, neck, eyes, eyebrows, nose, mouth, lips, chin, jawline, ears"
    : "head, face, hair, curls, long hair, cascading hair, stray hair";

  if (isAttireAdapted) {
    const isFullSleeves = resolveShouldUseFullSleeves(sleeveStyle, targetAttireText, gender);
    const armTokens = isFullSleeves
      ? ", arms, bare arms, forearms, biceps, upper arms"
      : "";
    // Note: hands, palms, fingers, wrists, and desk are intentionally excluded
    // to keep hand gestures, wrist orientation, and desk contact 100% pixel-locked.
    return `${baseHair}, clothing, dress, top, bodice, straps, neckline, corset, collar, chest, decolletage, shoulders${armTokens}`;
  }

  if (morphologyPolicy === "biometric_adaptation") {
    return `${baseHair}, neckline, chest`;
  }

  return baseHair;
}

/**
 * Negative tokens strictly preserving attire, body, hands, lapels, collar, and desk.
 */
export const PERSONA_SWAP_NEGATIVE_TOKENS =
  "clothing, suit, blazer, dress, collar, lapel, tie, arms, hands, desk, background alteration, distorted proportions, blurry facial features, artifacting, pink blotches, areola, nipple, breast exposure, distorted neckline, strap tearing, dress tearing, residual long hair, ghost hair on shoulders, shoulder hair strands, old hair remnants, hair over dress strap, hair on arm, hair on bicep, green screen hair";

/**
 * Negative tokens when adapting body and attire (clothing/suit/blazer are allowed and generated).
 */
export const PERSONA_SWAP_ATTIRE_ADAPTED_NEGATIVE_TOKENS =
  "hands alteration, desk alteration, table alteration, microphone alteration, background alteration, green screen spill, distorted proportions, blurry facial features, artifacting, pink blotches, areola, nipple, breast exposure, residual long hair, ghost hair on shoulders, shoulder hair strands, old hair remnants, hair on arm, hair on bicep, green screen hair";

/**
 * Resolves target persona metadata, physical traits, and signature attire from PERSONAS vault.
 */
export function resolveTargetPersonaData(personaId: string): {
  persona: Persona | null;
  name: string;
  physicalBase: string;
  headshotPrompt: string;
  hairDescription: string;
  faceDescription: string;
  gender: string;
  build: string;
  defaultAttire: string;
} {
  const persona =
    getPersonaById(personaId) ||
    PERSONAS.find(
      (p) =>
        p.id.toLowerCase() === personaId.toLowerCase() ||
        p.name.toLowerCase().includes(personaId.toLowerCase())
    ) ||
    null;

  if (persona) {
    return {
      persona,
      name: persona.name,
      physicalBase: getPersonaPhysicalBase(persona),
      headshotPrompt: getPersonaNeutralHeadshotPrompt(persona),
      hairDescription: persona.traits?.hair || "styled broadcast hair",
      faceDescription: persona.traits?.face || "expressive photorealistic facial features",
      gender: persona.gender || "female",
      build: persona.traits?.build || "Athletic broadcast build",
      defaultAttire: persona.traits?.defaultAttire || "Tailored broadcast suit blazer",
    };
  }

  // Fallback for unmapped or dynamic personas
  const formatted =
    formatConcatenatedName(personaId.replace(/[_-]+/g, " ")) || "Target Anchor";
  return {
    persona: null,
    name: formatted,
    physicalBase: `Professional broadcast news anchor named ${formatted}`,
    headshotPrompt: `Hyper-photorealistic broadcast news anchor portrait of ${formatted}`,
    hairDescription: "immaculately styled professional broadcast hair",
    faceDescription: "clear facial features, articulate mouth movements, photorealistic skin texture",
    gender: "female",
    build: "Athletic broadcast build",
    defaultAttire: "Tailored broadcast suit blazer",
  };
}

/**
 * Compiles the strict 6-section MiniMax H3 ref2va prompt format for Neural Persona Transference.
 * Inverts the reference hierarchy:
 * - <Subject 1>: Fully preserved for head, face, facial geometry, eyes, mouth, expressions, and hair.
 * - <Video 1>: Strong reference for 100% of body silhouette, clothing, attire, sleeves, hands, desk, kinematics.
 */
export function generateMiniMaxPersonaSwapPromptText(
  inputs: PersonaSwapInputs,
  refCount = 1
): string {
  if (inputs.customMiniMaxPrompt && inputs.customMiniMaxPrompt.trim().length > 0) {
    return inputs.customMiniMaxPrompt.trim();
  }

  const target = resolveTargetPersonaData(inputs.targetPersonaId);
  const targetName = inputs.targetPersonaName || target.name;
  const sourceName = inputs.sourcePersonaName || "the source news anchor";
  const sourceGarment = (inputs.sourceGarment || "tailored broadcast suit").replace(/_/g, " ");
  const keepHair = Boolean(inputs.keepOriginalHair);

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
    haircutName: target.hairDescription,
    sourceLoopUrl: inputs.sourceVideoPath,
  });
  const volumetricDirectives = compileVolumetricPromptDirectives(volumetric);

  const hairDirective = keepHair
    ? `Retain the original hairstyle silhouette, haircut, and hair volume of <Video 1>, while inpainting only the facial features, eyes, nose, mouth, expressions, jawline, and skin tone to perfectly match ${targetName} (<Subject 1>).`
    : `Completely replace the head and hair with ${targetName}'s signature hairstyle (${target.hairDescription}) and facial identity from <Subject 1>.`;

  const hairRetention = keepHair
    ? `Retain source video hairstyle silhouette and volume while transferring facial features, skin tone, eye shape, and jawline from <Picture 1>.`
    : `Adopt complete facial features, facial structure, skin tone, eye color, and signature hairstyle (${target.hairDescription}) from <Picture 1>.`;

  const antiGhostHairDirective = !keepHair
    ? `Anti-Ghost-Hair Removal: Completely remove, erase, and paint over any long hair strands, curls, or hair draping over the shoulders, chest, and arms from <Video 1>. Replace any area where previous long hair draped over the shoulders or arms with solid, clean, smooth chroma green studio background (#00FF00) and bare, clean, smooth shoulder and arm skin. No residual hair strands on shoulders, no hair on arms, no hair on biceps, no ghost hair, no hair remnants.`
    : `Retain the exact source hair strands and shoulder silhouette without modification.`;

  const isAttireAdapted =
    inputs.morphologyPolicy === "adapt_persona_attire" ||
    inputs.bodyAdaptation === "adapt_to_persona";

  const targetAttire = (target.defaultAttire || "tailored broadcast suit blazer").replace(/_/g, " ");
  const targetBuild = target.build || "professional broadcast physique";
  const isMale = target.gender === "male";
  const isFullSleeves =
    isAttireAdapted &&
    resolveShouldUseFullSleeves(
      inputs.sleeveStyle,
      target.defaultAttire,
      target.gender
    );

  const sleeveDirective = isFullSleeves
    ? `Full Tailored Long Sleeves Requirement: The ${targetAttire} MUST feature tailored full-length long sleeves covering both arms completely from the shoulders down to the wrists, with crisp dress shirt cuffs neatly visible at the wrists. The bare arms from <Video 1> are completely covered by tailored fabric suit sleeves. Preserve 100% of the natural hands, fingers, and gesturing palm movements pixel-locked. Zero bare arms, zero sleeveless suit, zero exposed biceps, zero sleeveless vest.`
    : `Sleeve Retention: Retain the sleeve silhouette from <Video 1>.`;

  const genderClause = isMale
    ? `Masculine Wardrobe & Physique Transformation: Replace the low-cut female dress, corset, cleavage, bare arms, and exposed decolletage of <Video 1> with a structured masculine chest, flat pectoral contours, and ${targetName}'s signature ${targetAttire}. The suit jacket features sharp structured masculine shoulders, tailored long sleeves extending down both arms to the wrists with crisp shirt cuffs slightly showing, buttoned front, collared dress shirt, and silk tie. Zero exposed female cleavage, zero dress boning, zero spaghetti straps, zero feminine decolletage, zero bare arms, zero sleeveless suit, zero sleeveless vest.`
    : `Signature Wardrobe Metamorphosis: Transform the source ${sourceGarment} into ${targetName}'s signature ${targetAttire}, tailored to her ${targetBuild}. The new garment drapes naturally over the shoulders and chest with authentic fabric texture, sharp lapels, tailored sleeves, and professional broadcast elegance. Zero strap tearing, zero fabric distortion.`;

  const morphologySummary = isAttireAdapted
    ? `Full Persona Metamorphosis (Body & Signature Attire): Completely transform the anchor's body physique, chest contour, and attire to match ${targetName}'s signature ${targetAttire} and ${targetBuild}. Replace the source garment (${sourceGarment}), straps, low neckline cut, and bare arms with ${targetAttire}. ${genderClause} ${sleeveDirective} Preserve 100% of the hands, desk, standing posture, speaking cadence, audio track, and solid chroma green backdrop (#00FF00) from <Video 1> pixel-locked.`
    : `Strict Garment Lock: Preserve 100% of the body, attire (${sourceGarment}), neckline cut, straps, corset boning, lapels, collar, sleeves, hands, desk, kinematic gestures, posture, and green screen backdrop from <Video 1> pixel-locked without alteration. Zero modification to dress boning, zero modification to neckline cut.`;

  const morphologyRetention = isAttireAdapted
    ? `follow 100% of the standing pose, body movement, speaking cadence, torso orientation, hand gestures, desk, audio track, and green screen studio backdrop. 100% pixel-lock the hands, desk, and chroma green background. Adopt ${targetName}'s signature ${targetAttire} and ${targetBuild} from <Picture 2>, replacing the source ${sourceGarment}.`
    : `follow 100% of the body, standing pose, body movement, speaking cadence, torso, arms, sleeves, hand gestures, desk, audio track, and green screen studio backdrop. 100% pixel-lock the attire (${sourceGarment}), straps, neckline, and corset boning from <Video 1>.`;

  const morphologyDetail = isAttireAdapted
    ? `The new ${targetAttire} completely replaces the previous ${sourceGarment}, fitting ${targetName}'s ${targetBuild} with crisp tailoring, authentic fabric texture, clean shoulder lines, and tailored sleeves extending down to the wrists. Any bare skin or cleavage from <Video 1> is cleanly replaced by the new ${targetAttire}. ${genderClause} ${sleeveDirective} Hands, desk, and solid chroma backdrop are completely preserved.`
    : `Meanwhile, 100% of the attire (${sourceGarment}), fabric texture, collar structure, neckline cut, straps, corset boning, sleeves, hands, desk, and body gestures are preserved pixel-for-pixel from <Video 1> without alteration.`;

  const pictureDescription = isAttireAdapted
    ? (refCount > 1
        ? `<Picture 1> shows the canonical front portrait headshot reference of ${targetName}, while <Picture 2> demonstrates the authentic broadcast wardrobe tailoring and physical silhouette.`
        : `<Picture 1> shows the canonical portrait reference of ${targetName}.`)
    : (refCount > 1
        ? `<Picture 1> shows the canonical front portrait headshot reference of ${targetName}, with additional pictures providing multi-angle identity verification.`
        : `<Picture 1> shows the canonical front portrait headshot reference of ${targetName}.`);

  return `subject_definitions:
<Subject 1> is the target broadcast persona ${targetName} (${target.physicalBase}). Reference portrait profile: ${target.headshotPrompt}. ${pictureDescription}
<Video 1> is the source broadcast action loop video being edited.

summary: [video editing + audio reuse]
The target video is an edited version of <Video 1>. Perform neural persona identity transference: replace ${sourceName}'s head, face, eyes, facial structure, jawline, skin tone, and ${keepHair ? "facial features" : "hair"} with <Subject 1> (${targetName}). ${morphologySummary} ${hairDirective} ${antiGhostHairDirective} Seamlessly blend the neck into the collar and neckline of ${isAttireAdapted ? targetAttire : sourceGarment}. ${lightingClauses.summaryClause} ${volumetricDirectives.positiveClause}. Each replacement is complete when its target first appears.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - follow <Picture 1> for facial geometry, eye shape, nose, mouth articulation, skin tone, and ${hairRetention}. Match the facial bone structure, neutral broadcast lighting, and expressions of ${targetName} (${target.faceDescription}). ${lightingClauses.rimEdgeWrapClause}
<Video 1>: strong_reference - ${morphologyRetention} Weak reference only for the head, facial identity, and replaced hair.

detailed_description:
Photorealistic professional broadcast green screen studio. [Shot 1] ${targetName} is seamlessly composited onto the body and movement of <Video 1>. ${targetName}'s face, facial geometry, eyes, mouth, expressions, skin tone, and ${keepHair ? "facial features with source hair retained" : "signature hairstyle (" + target.hairDescription + ")"} perfectly match <Subject 1> (<Picture 1>). Target physical baseline: ${target.physicalBase}. ${morphologyDetail} ${antiGhostHairDirective} The neck blends naturally into the collar of the ${isAttireAdapted ? targetAttire : sourceGarment} with clean lighting integration and no neckline boundary seams. ${lightingClauses.textileBounceClause} ${lightingClauses.shadowOcclusionClause}

overall_soundscape:
Keep the original source soundtrack synchronized with the action.

non_diegetic_music:
Retain any music already present in the source soundtrack.`;
}

/**
 * Builds the ComfyUI API prompt for Persona Transference by loading the inpaint template
 * and configuring the inverted head-focused tracking mask and target persona reference.
 */
export function buildPersonaSwapPrompt(
  inputs: PersonaSwapInputs,
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

  const prompt: Record<string, ComfyPromptNode> = JSON.parse(
    fs.readFileSync(templatePath, "utf-8")
  );

  const imageFiles = Array.isArray(uploadedImageFilename)
    ? uploadedImageFilename
    : [uploadedImageFilename];
  const refCount = Math.min(Math.max(imageFiles.length, 1), 5);

  const editPrompt = generateMiniMaxPersonaSwapPromptText(inputs, refCount);
  const detectedFrames = detectVideoFrameCount(
    uploadedVideoFilename,
    inputs.sourceVideoPath
  );
  const frameCount =
    inputs.frameCount !== undefined && inputs.frameCount > 0
      ? inputs.frameCount
      : detectedFrames !== null
      ? detectedFrames
      : inputs.frameCount !== undefined
      ? inputs.frameCount
      : 0;
  const seed = inputs.seed ?? 20261014;
  const targetSlug = inputs.targetPersonaId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const outputPrefix =
    inputs.outputPrefix ||
    `persona_swap_${Date.now()}_to_${targetSlug}`;

  // 1. Video loader (Node 11)
  if (prompt["11"] && prompt["11"].inputs) {
    prompt["11"].inputs["file"] = uploadedVideoFilename;
  }

  // 2. Timeline config (Node 12)
  if (prompt["12"] && prompt["12"].inputs) {
    prompt["12"].inputs["frame_count"] = frameCount;
    prompt["12"].inputs["aspect_ratio"] = "As Source";
    prompt["12"].inputs["fit"] = "contain";
    prompt["12"].inputs["size_multiple"] = 32;

    const effectiveClipLength = frameCount > 0 ? frameCount : (detectedFrames || 169);
    const updateTimelineJson = (raw: unknown): string => {
      try {
        const parsed =
          typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
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

  // 3. Inverted Head/Body SAM 3.1 Track Prompt (Node 14)
  const target = resolveTargetPersonaData(inputs.targetPersonaId);
  const trackPrompt =
    inputs.trackPrompt?.trim() ||
    generatePersonaSwapTrackPrompt(
      inputs.keepOriginalHair,
      inputs.morphologyPolicy,
      inputs.bodyAdaptation,
      inputs.sleeveStyle,
      target.defaultAttire,
      target.gender
    );

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

  // 6. Target persona reference image(s) (Node 100, 102, 130, 134, 138)
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

  // 7. Random seed (Node 28)
  if (prompt["28"] && prompt["28"].inputs) {
    prompt["28"].inputs["noise_seed"] = seed;
  }

  // 8. Video combine output (Node 85)
  if (prompt["85"] && prompt["85"].inputs) {
    prompt["85"].inputs["filename_prefix"] = outputPrefix;
    prompt["85"].inputs["save_output"] = true;
  }

  // 9. Remove Node 22 (InvertMask)
  if (prompt["22"]) {
    delete prompt["22"];
  }

  // 10. MVEx_SubjectCrop (Node 19) calibrated for Head & Upper Torso with dynamic headroom
  const volumetric = resolveVolumetricPadding(inputs.volumetricPaddingConfig, {
    haircutName: target.hairDescription,
    sourceLoopUrl: inputs.sourceVideoPath,
  });
  const volumetricDirectives = compileVolumetricPromptDirectives(volumetric);
  const dynamicHeadroom = (volumetric.paddingTopPercent || 10) / 100;
  const isBiometric = inputs.morphologyPolicy === "biometric_adaptation";
  const isAttireAdapted =
    inputs.morphologyPolicy === "adapt_persona_attire" ||
    inputs.bodyAdaptation === "adapt_to_persona";
  const isFullSleeves =
    isAttireAdapted &&
    resolveShouldUseFullSleeves(
      inputs.sleeveStyle,
      target.defaultAttire,
      target.gender
    );
  const baseCrop = isAttireAdapted ? (isFullSleeves ? 1.25 : 1.35) : isBiometric ? 1.35 : 1.25;
  const headCropScale = Number((baseCrop + dynamicHeadroom).toFixed(2));
  const dynamicExpand = isAttireAdapted ? 16 : 28;

  if (prompt["19"] && prompt["19"].inputs) {
    prompt["19"].inputs["masks"] = ["16", 0];
    prompt["19"].inputs["mode"] = "tracked";
    prompt["19"].inputs["crop_scale"] = headCropScale;
    prompt["19"].inputs["mode.crop_scale"] = headCropScale;
    prompt["19"].inputs["padding"] = "firm";
    prompt["19"].inputs["mode.padding"] = "firm";
    prompt["19"].inputs["prefer"] = "stillness";
    prompt["19"].inputs["mode.prefer"] = "stillness";
    prompt["19"].inputs["divisible_by"] = 32;
  }

  if (prompt["23"] && prompt["23"].inputs) {
    prompt["23"].inputs["close_gaps"] = 0;
    prompt["23"].inputs["expand"] = dynamicExpand;
    prompt["23"].inputs["fill_holes"] = false;
    prompt["23"].inputs["feather"] = volumetric.featherRadiusPixels || 10;
  }

  if (prompt["24"] && prompt["24"].inputs) {
    prompt["24"].class_type = "NKDMaskOps";
    prompt["24"].inputs["close_gaps"] = 0;
    prompt["24"].inputs["expand"] = dynamicExpand;
    prompt["24"].inputs["fill_holes"] = false;
    prompt["24"].inputs["feather"] = volumetric.featherRadiusPixels || 10;
  }

  // 11. Negative Prompt Injection: Anti-clothing modification (or masculine tailoring if adapted)
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
  const antiGhostHairNeg = !inputs.keepOriginalHair
    ? "residual long hair, ghost hair on shoulders, shoulder hair strands, old hair remnants, hair over dress strap, hair on arm, hair on bicep, green screen hair"
    : "";
  const baseNegativeTokens = isAttireAdapted
    ? PERSONA_SWAP_ATTIRE_ADAPTED_NEGATIVE_TOKENS
    : PERSONA_SWAP_NEGATIVE_TOKENS;
  const genderNegative =
    isAttireAdapted && target.gender === "male"
      ? "female breasts, cleavage, low cut dress, corset, exposed cleavage, bare shoulders, feminine torso, spaghetti straps, strapless dress, dress boning"
      : "";
  const sleeveNegative = isFullSleeves
    ? "bare arms, exposed arms, sleeveless suit, sleeveless vest, vest without sleeves, naked arms, tank top, sleeveless blazer, exposed biceps, exposed shoulders, bare arm skin, arm skin showing"
    : "";
  const combinedNeg = [
    baseNegativeTokens,
    genderNegative,
    sleeveNegative,
    antiGhostHairNeg,
    lightingClauses.negativeLightingPrompt,
    volumetricDirectives.negativeClause,
  ]
    .filter(Boolean)
    .join(", ");

  if (prompt["89"] && prompt["89"].inputs) {
    prompt["89"].inputs["negative_prompt"] = combinedNeg;
  }
  if (prompt["5"] && prompt["5"].inputs) {
    prompt["5"].inputs["text"] = combinedNeg;
  }

  for (const [nodeId, node] of Object.entries(prompt)) {
    if (node?.inputs) {
      if ("negative_prompt" in node.inputs) {
        node.inputs["negative_prompt"] = `${node.inputs["negative_prompt"] || ""}, ${combinedNeg}`.replace(/^,\s*/, "");
      } else {
        const nodeTitle =
          typeof (node as { _meta?: { title?: unknown } })._meta?.title === "string"
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
 * Resolves the reference portrait image for a target persona.
 * Checks for master portrait in public/avatars/master_{id}/, standalone avatar PNGs, and avatar URLs.
 */
export async function resolvePersonaReferenceImage(
  targetPersonaId: string,
  customImage?: string
): Promise<string[]> {
  const target = resolveTargetPersonaData(targetPersonaId);

  // If a custom image was explicitly passed, resolve it
  if (customImage && customImage.trim().length > 0) {
    const uploaded = await resolveComfyAsset(customImage, `persona_${targetPersonaId}_ref`);
    return [uploaded];
  }

  const cleanId = targetPersonaId.toLowerCase().trim();
  const portraitCandidates: string[] = [];
  const bodyCandidates: string[] = [];

  // Check body ref files
  const bodyRefFile = path.join(process.cwd(), "public", "avatars", `${cleanId}_body_ref.png`);
  if (fs.existsSync(bodyRefFile)) {
    bodyCandidates.push(bodyRefFile);
  }

  // 1. Check canonical master folder: public/avatars/master_{cleanId}/
  const masterDir = path.join(process.cwd(), "public", "avatars", `master_${cleanId}`);
  if (fs.existsSync(masterDir)) {
    try {
      const stat = fs.statSync(masterDir);
      if (stat.isDirectory()) {
        const files = fs.readdirSync(masterDir);
        for (const file of files) {
          const l = file.toLowerCase();
          if (!/\.(png|jpg|jpeg|webp)$/i.test(l) || l.includes("_bg.")) continue;
          const fullPath = path.join(masterDir, file);
          if (l.includes("standing_isolated") || l.includes("standing") || l.includes("desk_isolated")) {
            bodyCandidates.push(fullPath);
          } else if (l.includes("signature_pose") || l.includes("portrait") || l.includes("front") || l.includes("headshot")) {
            portraitCandidates.push(fullPath);
          }
        }
      }
    } catch {}
  }

  // Check master archive folder (e.g. for aris tech blazer, etc.)
  const archiveDir = path.join(process.cwd(), "public", "avatars", `master_${cleanId}_archive`);
  if (fs.existsSync(archiveDir)) {
    try {
      const subdirs = fs.readdirSync(archiveDir);
      for (const sub of subdirs) {
        const subPath = path.join(archiveDir, sub);
        if (fs.statSync(subPath).isDirectory()) {
          const subFiles = fs.readdirSync(subPath);
          for (const f of subFiles) {
            if (/\.(png|jpg|jpeg|webp)$/i.test(f) && !f.startsWith("_") && f.includes("M1")) {
              bodyCandidates.push(path.join(subPath, f));
            }
          }
        }
      }
    } catch {}
  }

  // Standard portrait files
  portraitCandidates.push(
    path.join(process.cwd(), "public", "avatars", `${cleanId}.png`),
    path.join(process.cwd(), "public", "avatars", `${cleanId}_ref.png`),
    path.join(process.cwd(), "public", "avatars", `master_${cleanId}.png`),
    path.join(process.cwd(), "public", "avatars", `${cleanId}.jpg`),
    path.join(process.cwd(), "public", "avatars", `${cleanId}_master.png`)
  );

  // Assemble prioritized candidates:
  // [0]: Primary Portrait (Face identity)
  // [1]: Primary Body & Signature Attire (Wardrobe/Body physique)
  // [2..n]: Additional verification plates
  const candidates: string[] = [];
  const primaryPortrait = portraitCandidates.find((p) => fs.existsSync(p));
  const primaryBody = bodyCandidates.find((b) => fs.existsSync(b));

  if (primaryPortrait) candidates.push(primaryPortrait);
  if (primaryBody) candidates.push(primaryBody);

  for (const p of [...portraitCandidates, ...bodyCandidates]) {
    if (!candidates.includes(p) && fs.existsSync(p)) {
      candidates.push(p);
    }
  }

  // Target persona avatarUrl fallback
  if (target.persona?.avatarUrl) {
    const avatarPath = target.persona.avatarUrl.startsWith("/")
      ? path.join(process.cwd(), "public", target.persona.avatarUrl.replace(/^\//, ""))
      : target.persona.avatarUrl;
    if (!candidates.includes(avatarPath)) {
      candidates.push(avatarPath);
    }
  }

  const uploadedFiles: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      const uploaded = await resolveComfyAsset(candidate, `persona_${cleanId}_url`);
      uploadedFiles.push(uploaded);
      if (uploadedFiles.length >= 3) break;
      continue;
    }
    if (fs.existsSync(candidate)) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isFile()) {
          const uploaded = await uploadFileToComfyUI(candidate, "", path.basename(candidate));
          uploadedFiles.push(uploaded);
          if (uploadedFiles.length >= 3) break;
        }
      } catch {}
    }
  }

  if (uploadedFiles.length > 0) {
    return uploadedFiles;
  }

  // Fallback to avatarUrl if not uploaded yet
  if (target.persona?.avatarUrl) {
    const uploaded = await resolveComfyAsset(
      target.persona.avatarUrl,
      `persona_${cleanId}_avatar`
    );
    return [uploaded];
  }

  // Final fallback placeholder
  const fallbackUploaded = await resolveComfyAsset(
    "/placeholder_ruby.png",
    `persona_${cleanId}_placeholder`
  );
  return [fallbackUploaded];
}

/**
 * Fallback simulation for testing and mock environments.
 */
export async function simulatePersonaSwapInpaint(
  inputs: PersonaSwapInputs,
  onProgress?: (progress: PersonaSwapProgress) => void
): Promise<{
  outputFilename: string;
  outputPublicUrl: string;
  outputPath: string;
  buffer: Buffer;
  simulated: boolean;
}> {
  const target = resolveTargetPersonaData(inputs.targetPersonaId);
  const targetName = inputs.targetPersonaName || target.name;
  const targetSlug = inputs.targetPersonaId.toLowerCase().replace(/[^a-z0-9]/g, "_");

  onProgress?.({
    phase: "init",
    message: `[Simulation] Resolving source action loop and portrait reference for ${targetName}...`,
    percent: 5,
  });

  onProgress?.({
    phase: "tracking",
    message: `[Simulation] SAM 3.1 segmenting head and facial boundaries while pixel-locking outfit...`,
    percent: 25,
  });

  onProgress?.({
    phase: "crop",
    message: `[Simulation] MVEx_SubjectCrop isolating head and neck region with dynamic headroom...`,
    percent: 45,
  });

  onProgress?.({
    phase: "diffusion",
    message: `[Simulation] MiniMax H3 transferring facial structure & identity of ${targetName}...`,
    percent: 75,
  });

  onProgress?.({
    phase: "decode",
    message: `[Simulation] VAEDecode rendering high-fidelity facial latents...`,
    percent: 90,
  });

  onProgress?.({
    phase: "uncrop",
    message: `[Simulation] MVEx_SubjectUncrop blending neck seam with collar and outfit...`,
    percent: 98,
  });

  const completedDir = path.join(process.cwd(), "public", "assets", "completed");
  if (!fs.existsSync(completedDir)) {
    try {
      fs.mkdirSync(completedDir, { recursive: true });
    } catch {}
  }

  const outputFilename = `simulated_persona_swap_${targetSlug}_${Date.now()}.mp4`;
  const outputPath = path.join(completedDir, outputFilename);
  const mockBuffer = Buffer.from(`mock-mp4-video-persona-swap-${targetSlug}`);
  try {
    fs.writeFileSync(outputPath, mockBuffer);
  } catch {}

  onProgress?.({
    phase: "done",
    message: `[Simulation] Persona identity transference to ${targetName} completed successfully!`,
    percent: 100,
  });

  return {
    outputFilename,
    outputPublicUrl: `/assets/completed/${outputFilename}`,
    outputPath,
    buffer: mockBuffer,
    simulated: true,
  };
}

/**
 * Executes the Neural Persona Transference pipeline end-to-end.
 */
export async function executePersonaSwapInpaint(
  inputs: PersonaSwapInputs,
  onProgress?: (progress: PersonaSwapProgress) => void
): Promise<{
  outputFilename: string;
  outputPublicUrl: string;
  outputPath: string;
  buffer: Buffer;
  simulated?: boolean;
}> {
  const isHealthy = await checkComfyUIHealth();
  if (!isHealthy) {
    if (inputs.allowSimulation || process.env.COMFYUI_MOCK === "true") {
      return simulatePersonaSwapInpaint(inputs, onProgress);
    }
    throw new Error(
      "ComfyUI server is currently offline on port 8188. Please ensure ComfyUI is running with MiniMax H3 & SAM 3.1 models loaded."
    );
  }

  const lockId = `persona-swap-${Date.now()}`;
  return comfyGenerationLock.withLock(lockId, async () => {
    try {
      const target = resolveTargetPersonaData(inputs.targetPersonaId);
      const targetName = inputs.targetPersonaName || target.name;

      onProgress?.({
        phase: "init",
        message: `Resolving source action loop and portrait reference for ${targetName}...`,
        percent: 5,
      });

      const uploadedVideo = await resolveComfyAsset(
        inputs.sourceVideoPath,
        "source_video"
      );
      const uploadedImages = await resolvePersonaReferenceImage(
        inputs.targetPersonaId,
        inputs.referenceImagePath
      );

      onProgress?.({
        phase: "init",
        message: `Configured identity plate for ${targetName} with head-locked SubjectCrop...`,
        percent: 10,
      });

      const prompt = buildPersonaSwapPrompt(inputs, uploadedVideo, uploadedImages);
      const clientId = `newsstudio-persona-swap-${Date.now()}`;

      onProgress?.({
        phase: "tracking",
        message: `Submitting Neural Persona Transference graph to ComfyUI...`,
        percent: 15,
      });

      const promptId = await submitPrompt(prompt, clientId);

      const progressTracker = (pct: number) => {
        let phase: PersonaSwapProgress["phase"] = "tracking";
        let message = `SAM 3.1 segmenting head and facial boundaries while pixel-locking outfit...`;
        const mappedPct = Math.round(15 + pct * 0.8);

        if (pct > 25 && pct <= 40) {
          phase = "crop";
          message = "MVEx_SubjectCrop isolating head and neck region with dynamic headroom...";
        } else if (pct > 40 && pct <= 85) {
          phase = "diffusion";
          message = `MiniMax H3 transferring facial structure & identity of ${targetName}...`;
        } else if (pct > 85 && pct <= 95) {
          phase = "decode";
          message = "VAEDecode rendering high-fidelity facial latents...";
        } else if (pct > 95) {
          phase = "uncrop";
          message = "MVEx_SubjectUncrop blending neck seam with collar and outfit...";
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
        message: "Downloading transferred persona video...",
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
      const safeOutputName = `persona_swapped_${Date.now()}_${path.basename(outputFilename)}`;
      const localDest = path.join(completedDir, safeOutputName);
      fs.writeFileSync(localDest, buffer);

      const outputPublicUrl = `/assets/completed/${safeOutputName}`;

      onProgress?.({
        phase: "done",
        message: `Persona identity transference to ${targetName} completed successfully!`,
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
        console.warn("[PersonaSwap] Failed to clear ComfyUI VRAM in finally block:", err);
      });
    }
  });
}
