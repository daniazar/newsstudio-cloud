/**
 * scripts/gemini-cli/promptCompiler.ts
 *
 * Pure functional prompt compiler with robust multi-image reference tracking,
 * dynamic hairstyles, chroma auto-detection, lighting, and foreground scale enforcement.
 */

import { CompositeSceneConfig, CompiledScenePrompt, PersonaAttire } from "./types";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { STUDIO_PLATES_CATALOG } from "./studioCatalog";
import { CAMERA_ARRAY_PRESETS } from "./cameraPresets";
import { EXPRESSION_PRESETS } from "./expressionPresets";
import { GESTURE_PRESETS } from "./gesturePresets";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { detectOptimalChroma } from "./chromaDetector";
import { LIGHTING_PRESETS } from "./lightingPresets";
import { getPersonaPhysicalBase } from "../../src/lib/tts/personas";
import fs from "fs";
import path from "path";

import { BROADCAST_PROPS, AR_HOLOGRAPHIC_GRAPHICS, TIME_OF_DAY_PRESETS, applyFabricAndColorOverrides } from "./propsAndFabrics";

function cleanTrailingPunctuation(str: string): string {
  return str.trim().replace(/[.,;:\s]+$/, "");
}

export function compileCompositeScene(
  config: CompositeSceneConfig,
  resolvedAttire?: PersonaAttire
): CompiledScenePrompt {
  const persona = config.persona;
  const t = persona.traits;
  const isMale = persona.gender === "male";
  const genderTag = isMale ? "handsome male news anchor" : "striking female news anchor";
  const pronoun = isMale ? "he" : "she";
  const possessive = isMale ? "his" : "her";

  const cam = CAMERA_ARRAY_PRESETS[config.cameraPresetKey] || CAMERA_ARRAY_PRESETS.cam1_center_wide;
  const studio = STUDIO_PLATES_CATALOG[config.studioPlateKey] || STUDIO_PLATES_CATALOG.section_01_anchor_desk;

  const expression = config.customExpression
    ? config.customExpression
    : (EXPRESSION_PRESETS[config.expressionKey || "calm_authoritative"]?.prompt || EXPRESSION_PRESETS.calm_authoritative.prompt);

  let gesture = config.customGesture
    ? config.customGesture
    : (GESTURE_PRESETS[config.gestureKey || "desk_hands_clasped"]?.prompt || cam.defaultPose);

  // Inject Prop & Accessory if selected
  if (config.customProp) {
    gesture = `${gesture}, actively ${config.customProp}`;
  } else if (config.propKey && BROADCAST_PROPS[config.propKey]) {
    gesture = `${gesture}, ${BROADCAST_PROPS[config.propKey].prompt}`;
  }

  const hairstyle = resolveHairstylePrompt(persona, config.hairstyleKey, config.customHairstyle);

  let rawAttire = config.customAttire || resolvedAttire?.description || persona.traits.defaultAttire || "Professional tailored broadcast newsroom attire.";
  const attireDesc = applyFabricAndColorOverrides(rawAttire, config.fabricKey, config.colorKey);

  // Handle Chroma Key Backdrop auto-detection
  let studioDesc = config.customBackdrop || studio.description;
  const isChromaRequest = config.chromaMode && config.chromaMode !== "none";
  const isChromaPlate = config.studioPlateKey.includes("chroma");

  if (isChromaRequest || isChromaPlate) {
    const chroma = detectOptimalChroma(attireDesc, config.chromaMode === "none" ? undefined : config.chromaMode);
    studioDesc = chroma.prompt;
  } else if (config.todKey && TIME_OF_DAY_PRESETS[config.todKey]) {
    studioDesc = `${studioDesc}, with the outside window panorama displaying ${TIME_OF_DAY_PRESETS[config.todKey].prompt}`;
  }



  // Build Dynamic Reference Image Paths & Record 1-Based Index Mapping
  const imagePaths: string[] = [];
  let subjectRefIdx: number | null = null;
  let attireRefIdx: number | null = null;
  let studioRefIdx: number | null = null;

  // 1. Subject Reference Likeness Anchor
  if (config.hasPersonaImageRef !== false) {
    const pPath = resolvePersonaAvatarPath(persona);
    if (pPath && fs.existsSync(pPath)) {
      imagePaths.push(pPath);
      subjectRefIdx = imagePaths.length;
    }
  }

  // 2. Attire Reference Plate (only if explicit plate file exists on disk)
  if (config.hasAttireImageRef !== false && resolvedAttire?.relativePath) {
    const aPath = path.resolve(resolvedAttire.relativePath);
    if (fs.existsSync(aPath)) {
      imagePaths.push(aPath);
      attireRefIdx = imagePaths.length;
    }
  }

  // 3. Studio Environment Background Plate (Omit if pure chroma custom prompt)
  if (config.hasStudioImageRef !== false && studio.relativePath && !config.customBackdrop && !isChromaRequest) {
    const sPath = path.resolve(studio.relativePath);
    if (fs.existsSync(sPath)) {
      imagePaths.push(sPath);
      studioRefIdx = imagePaths.length;
    }
  }

  // Dynamic Aspect Ratio Framing Header
  let aspectFramingHeader = "A photorealistic 16:9 widescreen television broadcast scene";
  const isVertical = config.aspectRatio === "9:16";
  if (isVertical) {
    aspectFramingHeader = "A photorealistic vertical 9:16 (1080x1920) mobile story broadcast scene";
  } else if (config.aspectRatio === "1:1") {
    aspectFramingHeader = "A photorealistic 1:1 square broadcast portrait scene";
  } else if (config.aspectRatio === "4:3" || config.aspectRatio === "3:4") {
    aspectFramingHeader = `A photorealistic ${config.aspectRatio} broadcast television scene`;
  }

  const promptParts: string[] = [
    `${aspectFramingHeader} masterfully composing the provided reference images:`,
  ];

  // Multi-Image Reference Binding with Exact Dynamic Indices
  if (imagePaths.length > 0) {
    promptParts.push(`\n[MULTI-IMAGE REFERENCE BINDING]:`);
    
    if (subjectRefIdx !== null) {
      let targetAge = t.age;
      let ageDesc = `${targetAge}-year-old`;
      if (config.rejuvenate) {
        if (config.rejuvenate === "young_rookie" || config.rejuvenate === true) {
          ageDesc = "radiant 23-year-old youthful";
        } else if (config.rejuvenate === "prime_anchor") {
          ageDesc = "commanding 31-year-old prime";
        } else if (config.rejuvenate === "mature_senior") {
          ageDesc = "distinguished 58-year-old senior";
        } else if (typeof config.rejuvenate === "number" || !isNaN(Number(config.rejuvenate))) {
          ageDesc = `${config.rejuvenate}-year-old`;
        }
      }

      promptParts.push(`• SUBJECT IDENTITY & ANATOMY: Match the exact ${ageDesc} ${genderTag} from Reference ${subjectRefIdx} (${persona.name}) with natural facial anatomy (${cleanTrailingPunctuation(t.face)}), eye catchlights, and authentic physical build (${cleanTrailingPunctuation(t.build)}). Height: ${t.heightCm} cm (${t.heightFeet}), Weight: ${t.weightKg} kg (${t.weightLbs} lbs). Strictly preserve natural waist, bust, and hip proportions.`);

      if (config.rejuvenate) {
        promptParts.push(`• REJUVENATION DIRECTIVE: Impart glowing youthful skin elasticity, radiant collagen, and fresh vital contours while locking authentic eye color, facial bone structure, smile, and distinct beauty marks from Reference ${subjectRefIdx}.`);
      }
      if (config.glamourLevel) {
        promptParts.push(`• BROADCAST GLAMOUR ENHANCEMENT: Render with luminous skin subsurface scattering, high-definition television studio hair styling, subtle studio makeup, and crisp 3-point key light separation.`);
      }
      if (config.genderSwap) {
        promptParts.push(`• GENDER SWAP DIRECTIVE: Render the opposite-gender counterpart of the person in Reference ${subjectRefIdx}, preserving exact eye color, hair tone, bone geometry, and anchor presence.`);
      }
      if (config.bodyMod && config.bodyMod !== "original") {
        promptParts.push(`• BODY SCULPTING OVERRIDE: Sculpt physical build according to: ${config.bodyMod}.`);
      }
    }


    promptParts.push(`• HAIRSTYLE OVERRIDE: Render the hair styled precisely as: ${cleanTrailingPunctuation(hairstyle)} (override any conflicting hair in Reference 1).`);
    
    if (attireRefIdx !== null) {
      promptParts.push(`• ATTIRE & FABRIC: Dress the anchor in the exact garment from Reference ${attireRefIdx} (${cleanTrailingPunctuation(attireDesc)}), replicating the precise fabric texture, seams, drape, and accessories.`);
    } else {
      promptParts.push(`• ATTIRE OVERRIDE: Dress the anchor in ${cleanTrailingPunctuation(attireDesc)} (do not copy the outfit from Reference 1).`);
    }

    if (studioRefIdx !== null) {
      promptParts.push(`• ENVIRONMENT & ROOM CONTINUITY: Seamlessly place the anchor into the physical broadcast studio set from Reference ${studioRefIdx} (${cleanTrailingPunctuation(studioDesc)}), keeping exact room geometry, materials, and background lighting visible behind the anchor.`);
    } else {
      promptParts.push(`• BACKGROUND & BACKDROP: ${cleanTrailingPunctuation(studioDesc)}.`);
    }
  } else {
    promptParts.push(`Subject: A hyper-photorealistic masterpiece portrait of ${t.age}-year-old ${genderTag} ${persona.name}. ${getPersonaPhysicalBase(persona)}`);
    promptParts.push(`Hairstyle: ${cleanTrailingPunctuation(hairstyle)}`);
    promptParts.push(`Attire: ${cleanTrailingPunctuation(attireDesc)}`);
    promptParts.push(`Studio Setting / Backdrop: ${cleanTrailingPunctuation(studioDesc)}`);
  }

  // Camera Framing & Prominent Subject Scale
  const isStandingGesture = config.gestureKey?.includes("standing") || config.customGesture?.toLowerCase().includes("standing");
  const isLoungeStudio = config.studioPlateKey.includes("lounge") || config.studioPlateKey.includes("section_03");

  let contextualFraming = cam.framing;
  if (isLoungeStudio && isStandingGesture) {
    contextualFraming = "Medium waist-up vertical framing standing prominently in the foreground of the interview lounge, with the leather club armchairs and walnut wood acoustic slat wall visible in the background behind the anchor";
  } else if (isLoungeStudio && !isStandingGesture) {
    contextualFraming = "Tight waist-up broadcast framing seated forward in the foreground with upper back of charcoal leather armchair and walnut acoustic wall directly behind (anchor fills 75-85% of frame height, do not zoom out to show full room)";
  }

  let contextualGesture = gesture;
  if (isLoungeStudio && gesture.includes("desk surface")) {
    contextualGesture = gesture.replace(/on the glass desk surface in front of the anchor/g, "neatly clasped on her lap");
  }

  promptParts.push(`\n[CAMERA FRAMING & FOREGROUND DOMINANCE]:`);
  promptParts.push(`• Shot from ${cam.cameraAngle}.`);
  promptParts.push(`• Lens & Framing: Shot on ${cam.lens}, ${contextualFraming}.`);
  promptParts.push(`• FOREGROUND PRIORITY: The anchor MUST occupy 70% to 85% of the frame height as the clear, prominent foreground subject. The studio room serves strictly as background context behind the anchor.`);

  promptParts.push(`\n[FACIAL EXPRESSION & EMOTION]:`);
  promptParts.push(`• ${cleanTrailingPunctuation(expression)}.`);

  promptParts.push(`\n[ARMS, HANDS & BODY GESTURE]:`);
  promptParts.push(`• ${cleanTrailingPunctuation(contextualGesture)}.`);

  // 3D Augmented Reality Holographic Infographic Injection
  if (config.arGraphicsKey && AR_HOLOGRAPHIC_GRAPHICS[config.arGraphicsKey]) {
    promptParts.push(`\n[3D AUGMENTED REALITY HOLOGRAPHIC GRAPHIC]:`);
    promptParts.push(`• Seamlessly render ${AR_HOLOGRAPHIC_GRAPHICS[config.arGraphicsKey].prompt}.`);
  }



  promptParts.push(`\n[SKIN & MOLE CONTINUITY]:`);
  if (persona.id === "ruby") {
    promptParts.push(`Her skin on neck, chest, and arms is smooth, clean, and flawless porcelain, with only a tiny, delicate, subtle pinpoint dark beauty mark mole on the lower right side of her neck (no large red patches, no stains).`);
  } else {
    promptParts.push(`${possessive.charAt(0).toUpperCase() + possessive.slice(1)} skin tone is ${t.skinTone || "natural and smooth"} with fine natural skin pores, realistic iris reflections, and clear complexion.`);
  }

  const light = LIGHTING_PRESETS[config.lightingKey || "prime_time_bright"] || LIGHTING_PRESETS.prime_time_bright;

  promptParts.push(`\n[LIGHTING & DEPTH]:`);
  promptParts.push(`• ${cleanTrailingPunctuation(light.prompt)}.`);
  promptParts.push(`Sharp focus on anchor, realistic specular highlights matching the environment, 8k photo, raw photo quality, master cinematographic composition.`);

  const baseName = config.imageName || `${persona.id}_${config.cameraPresetKey}_${config.wardrobeKey}_${Date.now().toString().slice(-6)}`;

  return {
    prompt: promptParts.join(" "),
    imagePaths,
    baseName,
    aspectRatio: config.aspectRatio,
  };
}
