// src/lib/prompt/promptCompiler.ts

import {
  STUDIO_CLOTHING_PRESETS,
  HAIRSTYLE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  type FullPreset
} from "@/data/prompt_presets";
import { presetRegistry } from "./presetRegistry";

export interface CompilePromptOptions {
  personaDescription: string;
  preset: FullPreset;
  attire?: string;
  hairstyle?: string;
  hairColor?: string;
  cameraAngle?: string;
  cameraMovement?: string; // e.g. "slow pan right", "dolly zoom"
  lighting?: string;
  shotType?: string;
  extraModifiers?: string[];
  loras?: { name: string; strength: number }[];
  randomizeVariation?: boolean;
  visualBodyPrompt?: string;
  partnerDescription?: string;
  partnerBodyPrompt?: string;
  partnerName?: string;
  primaryName?: string;
  interactionRole?: string;
  enableDuplicateStripping?: boolean;
  enableCategorySeparation?: boolean;
  enableQualityBoilerplate?: boolean;
  enableSfwWordSwap?: boolean;
  isAttireOnlyPreview?: boolean; // For mannequin-style person-agnostic renders
  studioApprovedOnly?: boolean;
  fullAttireOnly?: boolean;
  audioMode?: "ltx-native" | "tts-overlay" | "silent";
  ambientSound?: string;
  isExposed?: boolean;
}

const CAMERA_ANGLES = [
  "slight side angle shot",
  "straight-on centered camera view",
  "slight low-angle cinematic frame",
  "subtle high-angle news camera position",
  "slight dynamic tilt shot",
  "three-quarter profile angle"
];

const SHOT_TYPES = [
  "medium shot capturing the subject from the waist up",
  "professional news anchor composition chest-up framing",
  "cinematic close-up portrait framing",
  "torso shot focusing on gestures and expressions",
  "medium close-up news broadcast composition"
];

const LIGHTING_TWEAKS = [
  "volumetric dust motes drifting in the soft studio lighting",
  "warm side-rim lights catching the shoulders",
  "subtle backlighting creating a gentle rim halo on hair",
  "diffused corporate studio key lights casting soft shadows",
  "cinematic high contrast side key lighting"
];

const ENVIRONMENT_TWEAKS = [
  "softly blurred background lights creating clean circular bokeh",
  "glowing screens humming quietly in the defocused background",
  "highly detailed background textures visible in clean depth of field",
  "polished studio reflection highlights on background surfaces"
];

const BODY_EXPOSED_TWEAKS = [
  "subtle moisture sheen on her shoulders and chest catching soft highlights",
  "delicate skin pores visible under professional studio lighting",
  "soft goosebumps on her arms and skin adding realistic texture",
  "slight body heat haze creating subtle ambient warmth",
  "pronounced collarbone contours catching soft rim lighting",
  "delicate veins faintly visible beneath pale translucent skin, highly detailed",
  "soft natural skin folds matching natural body pose, raw photorealism",
  "gentle studio shadows contouring her curves with high contrast"
];

/**
 * Parses the raw video description and formats it explicitly into DIALOGUE, SCENE, and EFFECTS blocks
 * to ensure timeline consistency for LTX-Video.
 */
export function formatUnifiedTimeline(rawVideoDesc: string, effects: string[], ambientSound?: string): string {
  if (!rawVideoDesc) return "";

  // Split raw description by timestamps if available, or just treat it as a single block
  const hasTimestamps = /At \d+s:/.test(rawVideoDesc) || /\[\d+-\d+\]/.test(rawVideoDesc);
  
  if (!hasTimestamps) {
    let result = `SCENE:\n${rawVideoDesc}`;
    if (effects.length > 0) {
      result += `\nEFFECTS:\n${effects.join(", ")}`;
    }
    if (ambientSound) {
      result += `\nAUDIO:\n[Ambient]: ${ambientSound}`;
    }
    return result;
  }

  // Parse lines starting with "At Xs:" or "[X-Y]"
  const parts = rawVideoDesc.split(/((?:At \d+s:|\[\d+-\d+\]))/g).filter(Boolean);
  
  const dialogues: string[] = [];
  const scenes: string[] = [];

  let currentTimestamp = "[0-30]"; // default if none found
  for (const part of parts) {
    if (part.startsWith("At ") && part.endsWith("s:")) {
      const ts = part.replace("At ", "").replace("s:", "");
      currentTimestamp = `[${ts}-${parseInt(ts) + 2}]`;
    } else if (part.startsWith("[") && part.endsWith("]")) {
      currentTimestamp = part;
    } else {
      const text = part.trim();
      if (!text) continue;
      
      const timeTag = currentTimestamp;
      
      if (text.includes("[Voice of") || text.includes("says:")) {
        // Extract dialogue and scene parts if they are mixed
        const voiceMatch = text.match(/\[Voice of (.*?)\]:\s*['"](.*?)['"]/i) || text.match(/says:\s*['"](.*?)['"]/i);
        if (voiceMatch) {
          const speaker = text.includes("[Voice of") ? voiceMatch[1] : "Speaker";
          const quote = text.includes("[Voice of") ? voiceMatch[2] : voiceMatch[1];
          dialogues.push(`${timeTag} ${speaker} says: "${quote}"`);
          // Add remaining non-dialogue text as scene actions if it exists
          const remainingText = text.replace(voiceMatch[0], "").trim();
          if (remainingText && remainingText.length > 3) {
            scenes.push(`${timeTag} ${remainingText}`);
          }
        } else {
          dialogues.push(`${timeTag} ${text}`);
        }
      } else {
        scenes.push(`${timeTag} ${text}`);
      }
    }
  }

  let finalOutput = "";
  if (dialogues.length > 0) {
    finalOutput += `DIALOGUE:\n${dialogues.join("\n")}\n\n`;
  }
  if (scenes.length > 0) {
    finalOutput += `SCENE:\n${scenes.join("\n")}\n\n`;
  }
  if (effects.length > 0) {
    finalOutput += `EFFECTS:\n${effects.join(", ")}\n\n`;
  }
  if (ambientSound) {
    finalOutput += `AUDIO:\n[Ambient]: ${ambientSound}\n`;
  }

  return finalOutput.trim();
}

/**
 * Generates a synchronized video timeline from full dialogue text, using a reading speed heuristic.
 * Maps text to timestamps and injects provided facial expressions.
 */
export function generateTimelineFromText(text: string, expressions: string[] = []): string {
  if (!text) return "";

  // Simple heuristic: 2.5 words per second
  const WORDS_PER_SECOND = 2.5;

  const CAMERA_SHOT_PROGRESSIONS = [
    "medium shot centered on news studio desk, anchor waist-up composition",
    "dynamic camera cut to three-quarter side profile close-up",
    "progressive camera zoom-in focusing on expressive facial delivery",
    "camera zoom-out to chest-up stance with active hand gestures",
  ];
  
  // Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentSecond = 0;
  let timeline = "";

  sentences.forEach((sentence, index) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    
    const wordCount = trimmed.split(/\s+/).length;
    const durationSeconds = Math.max(2, Math.round(wordCount / WORDS_PER_SECOND));
    
    // Pick an expression if provided, plus dynamic camera shot directive
    const expression = expressions.length > 0 ? ` [${expressions[index % expressions.length]}]` : "";
    const cameraShot = CAMERA_SHOT_PROGRESSIONS[index % CAMERA_SHOT_PROGRESSIONS.length];
    
    timeline += `At ${currentSecond}s: [${cameraShot}]${expression} delivering the line [Voice of speaker]: "${trimmed}"\n`;
    
    currentSecond += durationSeconds;
  });

  return timeline.trim();
}

/**
 * Clean up extra spaces, duplicate commas, and common CLI clashing phrases.
 */
export function cleanModifier(val: string): string {
  let newVal = val;
  const clashingPhrases = [
    "playing tennis",
    "laying on ground",
    "scuba diving",
    "group of friends at a party",
    "golden watch",
    "urban context",
    "at a party"
  ];
  for (const phrase of clashingPhrases) {
    newVal = newVal.replace(new RegExp(phrase, "gi"), "");
  }

  // Remove bracket wrappers, but preserve [Voice of X] tags for audio-driven multi-persona
  newVal = newVal.replace(/\[(?!Voice of)([^\]]+)\]/gi, "$1");
  newVal = newVal.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();
  return newVal;
}

/**
 * Transforms attire text to make it person-agnostic for product photography.
 */
export function makeAttireAgnostic(attire: string): string {
  if (!attire) return "";
  let clean = attire.replace(/^attire:\s*/i, "").trim();
  
  // Replace specific persona markers and pronouns
  clean = clean.replace(/\bruby\b/gi, "subject");
  clean = clean.replace(/\bblaze\b/gi, "subject");
  clean = clean.replace(/\bmodel wearing\b/gi, "clothing items:");
  clean = clean.replace(/\ba woman wearing\b/gi, "clothing items:");
  clean = clean.replace(/\ba man wearing\b/gi, "clothing items:");
  clean = clean.replace(/\bshe wears\b/gi, "composed of");
  clean = clean.replace(/\bhe wears\b/gi, "composed of");
  clean = clean.replace(/\bher shoulders\b/gi, "shoulders");
  clean = clean.replace(/\bher waist\b/gi, "waist");
  clean = clean.replace(/\bher skin\b/gi, "skin");
  
  return `This is a product photography capture of [${clean}], with clean studio lighting, crisp shadow control, displayed on a high-fashion neutral mannequin`;
}

/**
 * Deduplicate LoRAs to prevent conflicting styles (e.g. multiple lighting or global body types),
 * but allow multiple specific anatomy LoRAs (especially for women).
 */
export function deduplicateLoras(loras: { name: string; strength: number }[]): { name: string; strength: number }[] {
  if (!loras || loras.length === 0) return [];
  
  const result: { name: string; strength: number }[] = [];
  let hasLighting = false;
  let hasGlobalBody = false;

  for (const lora of loras) {
    const lowerName = lora.name.toLowerCase();
    
    // Check for lighting / realism conflicts
    if (lowerName.includes("lighting") || lowerName.includes("ultrareal") || lowerName.includes("detailer") || lowerName.includes("realism")) {
      if (hasLighting) continue;
      hasLighting = true;
    }
    
    // Check for global body type conflicts (e.g. body weight slider)
    if (lowerName.includes("body-weight-slider")) {
      if (hasGlobalBody) continue;
      hasGlobalBody = true;
    }
    
    // Anatomy LoRAs (breasts, hips, nipples, vagina, etc.) are allowed multiple times
    
    // If not skipped, add to result (but check if it's already in the result)
    if (!result.some(r => r.name === lora.name)) {
      result.push(lora);
    }
  }
  return result;
}



/**
 * Instant algorithmic compiler polishing script.
 */
export function algorithmicPolish(
  imagePrompt: string,
  videoPrompt: string,
  category: string,
  options: {
    enableDuplicateStripping?: boolean;
    enableCategorySeparation?: boolean;
    enableQualityBoilerplate?: boolean;
    enableSfwWordSwap?: boolean;
  }
): { imagePrompt: string; videoPrompt: string } {
  let img = imagePrompt;
  let vid = videoPrompt;

  const {
    enableDuplicateStripping = true,
    enableCategorySeparation = true,
    enableQualityBoilerplate = true,
    enableSfwWordSwap = false
  } = options;

  // 1. Category Separation
  if (enableCategorySeparation) {
    if (category === "scenarios") {
      // Strips model details from scenario
      img = img.replace(/\bmodel\b|\bwoman\b|\bpresenter\b|\bwearing\b/gi, "");
    } else if (category === "actions") {
      // Strips visual clothes details from action image prompt
      img = img.replace(/\bblazer\b|\bsuit\b|\bdress\b|\bskirt\b|\bjeans\b/gi, "");
    }
  }

  // 2. Duplicate Stripping
  if (enableDuplicateStripping) {
    const words = img.split(/,\s*/);
    const uniqueWords = Array.from(new Set(words.map(w => w.trim()))).filter(Boolean);
    img = uniqueWords.join(", ");
  }

  // 3. SFW Word Swap
  if (enableSfwWordSwap) {
    const swaps: Record<string, string> = {
      "areola": "chest skin",
      "nipple": "breast texture",
      "nude": "clothed style",
      "naked": "dressed style",
      "pelvic": "torso",
      "groin": "waistline",
      "vulva cleft": "waist seam",
      "penis": "belt buckle",
      "shaft": "belt strap",
      "dick": "belt",
      "bdsm": "studio pose",
      "bondage": "secure pose",
      "restraint": "still pose",
      "shibari": "studio framing"
    };

    for (const [key, replacement] of Object.entries(swaps)) {
      const regex = new RegExp(`\\b${key}s?\\b`, "gi");
      img = img.replace(regex, replacement);
      vid = vid.replace(regex, replacement);
    }
  }

  // 4. Quality Boilerplate
  if (enableQualityBoilerplate) {
    img = `${img}, masterpiece, highly detailed skin texture, raw photorealism, professional broadcast quality`;
  }

  return { imagePrompt: img, videoPrompt: vid };
}

/**
 * Select a random clothing option from STUDIO_CLOTHING_PRESETS.
 */
export function selectRandomAttire(
  exposedEnabled: boolean = false,
  studioApprovedOnly: boolean = true,
  fullAttireOnly: boolean = false
): string {
  const allSections = STUDIO_CLOTHING_PRESETS.sections;
  
  // Collect all items across allowed sections
  const allowedItems: (typeof STUDIO_CLOTHING_PRESETS.sections)[number]["items"] = [];
  
  allSections.forEach(section => {
    // If not exposed, filter out non-professional unless allowed by other flags
    if (!exposedEnabled && section.sectionName !== "Professional Newsroom Attire") {
      return;
    }
    
    section.items.forEach(item => {
      if (studioApprovedOnly && !item.isStudioApproved) {
        return;
      }
      if (fullAttireOnly && !item.isFullAttire) {
        return;
      }
      allowedItems.push(item);
    });
  });

  // Fallback if filter is too restrictive
  if (allowedItems.length === 0) {
    allSections.forEach(sec => {
      allowedItems.push(...sec.items);
    });
  }

  const randomItem = allowedItems[Math.floor(Math.random() * allowedItems.length)];
  return randomItem.desc;
}

/**
 * Select a random hairstyle from HAIRSTYLE_OPTIONS.
 */
export function selectRandomHairstyle(): string {
  const opt = HAIRSTYLE_OPTIONS[Math.floor(Math.random() * HAIRSTYLE_OPTIONS.length)];
  return opt.value;
}

/**
 * Select a random hair color from HAIR_COLOR_OPTIONS.
 */
export function selectRandomHairColor(): string {
  const opt = HAIR_COLOR_OPTIONS[Math.floor(Math.random() * HAIR_COLOR_OPTIONS.length)];
  return opt.value;
}

/**
 * Clean up/replace default persona hair styles if custom hair attributes are provided.
 */
export function sanitizeBaseDescription(base: string, hasCustomStyle: boolean, hasCustomColor: boolean, customStyle?: string, customColor?: string): string {
  let result = base;
  if (base.includes("Ruby")) {
    if (hasCustomStyle && hasCustomColor && customStyle && customColor) {
      result = result.replace("vibrant copper-red hair falling elegantly over her shoulders, ", `${customColor} ${customStyle} hair, `);
      result = result.replace("vibrant copper-red hair falling elegantly over her shoulders", `${customColor} ${customStyle} hair`);
    } else if (hasCustomStyle && customStyle) {
      result = result.replace("hair falling elegantly over her shoulders", `${customStyle} hair`);
    } else if (hasCustomColor && customColor) {
      result = result.replace("vibrant copper-red", customColor);
    }
  } else if (base.includes("Blaze")) {
    if (hasCustomStyle && hasCustomColor && customStyle && customColor) {
      result = result.replace("Sharp, asymmetrical platinum blonde bob haircut, perfectly straightened, ", `${customColor} ${customStyle} hair, `);
      result = result.replace("Sharp, asymmetrical platinum blonde bob haircut, perfectly straightened", `${customColor} ${customStyle} hair`);
    } else if (hasCustomStyle && customStyle) {
      result = result.replace("asymmetrical platinum blonde bob haircut, perfectly straightened", `${customStyle} hair`);
    } else if (hasCustomColor && customColor) {
      result = result.replace("platinum blonde", customColor);
    }
  }
  return result;
}

/**
 * Core function to compile visual and video presenter prompts.
 */
export function compilePresenterPrompt(options: CompilePromptOptions) {
  let { personaDescription, preset, attire, hairstyle, hairColor, cameraAngle, cameraMovement, shotType, extraModifiers, loras } = options;
  
  // 1. Deduplicate LoRAs
  if (loras) {
    loras = deduplicateLoras(loras);
  }

  // 2. Audio-Driven LoRA Logic
  if (options.audioMode === "ltx-native") {
    // Inject ID LoRA for lip sync native audio
    if (!loras) loras = [];
    if (!loras.some(l => l.name === "id_lora.safetensors")) {
      loras.push({ name: "id_lora.safetensors", strength: 0.85 });
    }
  } else if (options.audioMode === "tts-overlay") {
    // Inject Presenter LoRA when audio is overlaid later
    if (!loras) loras = [];
    if (!loras.some(l => l.name === "presenter_lora.safetensors")) {
      loras.push({ name: "presenter_lora.safetensors", strength: 0.85 });
    }
  }
  
  const {
    randomizeVariation = false,
    studioApprovedOnly = true,
    fullAttireOnly = false
  } = options;

  // Handle randomization if requested
  if (randomizeVariation) {
    const descName = preset?.description?.toLowerCase() || "";
    const titleName = preset?.name?.toLowerCase() || "";
    const isExposed = descName.includes("nude") ||
                      descName.includes("bdsm") ||
                      descName.includes("sheer") ||
                      titleName.includes("nude") ||
                      titleName.includes("bdsm") ||
                      titleName.includes("sheer");
                      
    if (!attire) attire = selectRandomAttire(isExposed, studioApprovedOnly, fullAttireOnly);
    if (!hairstyle && Math.random() < 0.4) hairstyle = selectRandomHairstyle();
    if (!hairColor && Math.random() < 0.4) hairColor = selectRandomHairColor();
    if (!cameraAngle) cameraAngle = CAMERA_ANGLES[Math.floor(Math.random() * CAMERA_ANGLES.length)];
    if (!shotType) shotType = SHOT_TYPES[Math.floor(Math.random() * SHOT_TYPES.length)];
  }

  // Handle SFW TV presenter attire: default to random professional newsroom attire if none selected
  const isExposedByContext = [
    preset.action,
    preset.scenario,
    ...(extraModifiers || [])
  ].some(mod => {
    if (!mod) return false;
    const lower = mod.toLowerCase();
    return lower.includes("nude") || 
           lower.includes("naked") || 
           lower.includes("topless") || 
           lower.includes("sheer") || 
           lower.includes("lingerie") || 
           lower.includes("groin") || 
           lower.includes("vulva cleft") || 
           lower.includes("penis") || 
           lower.includes("testicles") || 
           lower.includes("breasts") || 
           lower.includes("futanari") || 
           lower.includes("bdsm") ||
           lower.includes("glamour") ||
           lower.includes("boudoir") ||
           lower.includes("nsfw") ||
           lower.includes("erotic") ||
           lower.includes("cleavage") ||
           lower.includes("bikini");
  });

  if (!attire && !isExposedByContext) {
    attire = selectRandomAttire(false, studioApprovedOnly, fullAttireOnly);
  }

  // Build modifiers list
  const modifiers: string[] = [];

  if (preset.medium) modifiers.push(preset.medium);
  if (attire) modifiers.push(attire);
  if (shotType) modifiers.push(shotType);
  if (cameraAngle) modifiers.push(cameraAngle);
  
  if (cameraMovement) {
    modifiers.push(cameraMovement);
    // Inject Camera IC-LoRA for dynamic movement
    if (!loras) loras = [];
    if (!loras.some(l => l.name === "ltx-cameraman-ic-lora.safetensors")) {
      loras.push({ name: "ltx-cameraman-ic-lora.safetensors", strength: 0.85 });
    }
  }
  
  if (preset.scenario) modifiers.push(preset.scenario);
  if (preset.lighting) {
    let lighting = preset.lighting;
    if (randomizeVariation && Math.random() < 0.5) {
      lighting = `${lighting}, ${LIGHTING_TWEAKS[Math.floor(Math.random() * LIGHTING_TWEAKS.length)]}`;
    }
    modifiers.push(lighting);
  }
  if (preset.color) modifiers.push(preset.color);

  // Add random environment tweak if requested
  if (randomizeVariation && Math.random() < 0.5) {
    modifiers.push(ENVIRONMENT_TWEAKS[Math.floor(Math.random() * ENVIRONMENT_TWEAKS.length)]);
  }

  // Merge extra modifiers
  (extraModifiers || []).forEach(mod => {
    if (mod) modifiers.push(mod);
  });

  // Clean modifiers list, filtering out timeline actions to keep the starting frame visual prompt static
  const cleanedModifiers = modifiers
    .map(cleanModifier)
    .filter(Boolean)
    .filter(mod => !/At \d+s:/i.test(mod) && !/\[\d+-\d+\]/i.test(mod));

  // Check if glamour exposed is selected
  const isExposed = options.isExposed !== undefined ? options.isExposed : [
    attire,
    preset.action,
    preset.scenario,
    ...(extraModifiers || [])
  ].some(mod => {
    if (!mod) return false;
    const lower = mod.toLowerCase();
    return lower.includes("nude") || 
           lower.includes("naked") || 
           lower.includes("topless") || 
           lower.includes("sheer") || 
           lower.includes("lingerie") || 
           lower.includes("groin") || 
           lower.includes("vulva cleft") || 
           lower.includes("penis") || 
           lower.includes("testicles") || 
           lower.includes("breasts") || 
           lower.includes("futanari") || 
           lower.includes("bdsm") ||
           lower.includes("glamour") ||
           lower.includes("boudoir") ||
           lower.includes("nsfw") ||
           lower.includes("erotic") ||
           lower.includes("cleavage") ||
           lower.includes("bikini");
  });

  if (isExposed && randomizeVariation) {
    // Add 1-2 random fine-grained body detail tweaks to increase variety and realism!
    const numTweaks = Math.random() < 0.5 ? 1 : 2;
    const shuffled = [...BODY_EXPOSED_TWEAKS].sort(() => 0.5 - Math.random());
    shuffled.slice(0, numTweaks).forEach(tweak => modifiers.push(tweak));
  }

  const baseDescriptionToUse = (isExposed && options.visualBodyPrompt) ? options.visualBodyPrompt : personaDescription;

  // Sanitize base description
  const hasCustomStyle = !!hairstyle;
  const hasCustomColor = !!hairColor;
  const baseCleaned = sanitizeBaseDescription(baseDescriptionToUse, hasCustomStyle, hasCustomColor, hairstyle, hairColor);

  // Perform multi-persona role and description compilation if partner details exist
  let finalBaseCleaned = baseCleaned;
  let finalModifiers = [...cleanedModifiers];
  let finalImageDesc = (preset as { imageDesc?: string }).imageDesc || "";
  let finalVideoPrompt = (preset as { videoDesc?: string }).videoDesc || preset.videoPrompt || preset.action || "pose: looking at the camera, subtle organic movements and natural posture shifting";

  if (options.partnerDescription && options.partnerName && options.primaryName) {
    const primaryName = options.primaryName;
    const partnerName = options.partnerName;
    
    // Choose dominant/submissive name mapping based on role option
    let dominantName = primaryName;
    let submissiveName = partnerName;
    
    if (options.interactionRole === "primary_submissive_partner_dominant") {
      dominantName = partnerName;
      submissiveName = primaryName;
    } else if (options.interactionRole === "primary_dominant_partner_submissive") {
      dominantName = primaryName;
      submissiveName = partnerName;
    } else {
      // Symmetrical / default: primary is A, partner is B
      dominantName = primaryName;
      submissiveName = partnerName;
    }

    // Sanitize the partner's base description
    const partnerBaseCleaned = sanitizeBaseDescription(
      options.partnerBodyPrompt || options.partnerDescription,
      false,
      false
    );

    // Form a unified description block identifying both characters and their appearances
    if (options.interactionRole && options.interactionRole !== "symmetrical") {
      finalBaseCleaned = `A high-fidelity BDSM scene featuring two distinct subjects: the dominant partner is named ${dominantName}, and the submissive partner is named ${submissiveName}. ` +
                         `Dominant partner (${dominantName}) visual appearance: ${partnerName === dominantName ? partnerBaseCleaned : baseCleaned}. ` +
                         `Submissive partner (${submissiveName}) visual appearance: ${partnerName === submissiveName ? partnerBaseCleaned : baseCleaned}.`;
    } else {
      finalBaseCleaned = `A high-fidelity photorealistic scene featuring two distinct subjects: ${primaryName} and ${submissiveName}. ` +
                         `${primaryName} visual appearance: ${baseCleaned}. ` +
                         `${submissiveName} visual appearance: ${partnerBaseCleaned}.`;
    }

    // Helper to replace generic terms in modifier text with precise casting and positions
    const substituteRoles = (text: string): string => {
      let t = text;
      
      // Perform case-insensitive replacements
      t = t.replace(/\btwo female models\b/gi, `${primaryName} and ${submissiveName}`);
      t = t.replace(/\btwo female subjects\b/gi, `${primaryName} and ${submissiveName}`);
      t = t.replace(/\btwo female partners\b/gi, `${primaryName} and ${submissiveName}`);
      t = t.replace(/\btwo models\b/gi, `${primaryName} and ${submissiveName}`);

      // Role-specific BDSM replacements
      t = t.replace(/\bdominant partner\/model\b/gi, `${dominantName}`);
      t = t.replace(/\bdominant partner\b/gi, `${dominantName}`);
      t = t.replace(/\bdominant model\b/gi, `${dominantName}`);
      t = t.replace(/\bdominant subject\b/gi, `${dominantName}`);
      t = t.replace(/\bsubmissive partner\/model\b/gi, `${submissiveName}`);
      t = t.replace(/\bsubmissive partner\b/gi, `${submissiveName}`);
      t = t.replace(/\bsubmissive model\b/gi, `${submissiveName}`);
      t = t.replace(/\bsubmissive subject\b/gi, `${submissiveName}`);

      // Double-sided actions (one model... another model)
      if (t.toLowerCase().includes("one model") && t.toLowerCase().includes("another model")) {
        t = t.replace(/\bone model\b/i, `${dominantName}`);
        t = t.replace(/\banother model\b/i, `${submissiveName}`);
      }
      if (t.toLowerCase().includes("one female model") && t.toLowerCase().includes("another female model")) {
        t = t.replace(/\bone female model\b/i, `${dominantName}`);
        t = t.replace(/\banother female model\b/i, `${submissiveName}`);
      }
      if (t.toLowerCase().includes("first subject") && t.toLowerCase().includes("second subject")) {
        t = t.replace(/\bfirst subject\b/i, `${primaryName}`);
        t = t.replace(/\bsecond subject\b/i, `${submissiveName}`);
      }

      // Model A / Model B tag replacements to match character names
      t = t.replace(/\bmodel a's\b/gi, `${primaryName}'s`);
      t = t.replace(/\bmodel b's\b/gi, `${partnerName}'s`);
      t = t.replace(/\bmodel a\b/gi, `${primaryName}`);
      t = t.replace(/\bmodel b\b/gi, `${partnerName}`);
      
      // Specify positioning for clear layout
      if (t.toLowerCase().includes("standing") && t.toLowerCase().includes("kneeling")) {
        t = t + `, dominant partner ${dominantName} is standing on the left side, submissive partner ${submissiveName} is kneeling on the right side of the scene`;
      } else if (t.toLowerCase().includes("lying side-by-side")) {
        t = t + `, ${primaryName} is lying on the left side of the bed, ${submissiveName} is lying on the right side of the bed facing her`;
      } else if (t.toLowerCase().includes("scissoring")) {
        t = t + `, with ${primaryName} positioned on top, grinding hips against ${submissiveName} who is lying underneath`;
      }

      return t;
    };

    // Apply substitutions to modifiers list, image description, and video prompt
    finalModifiers = finalModifiers.map(substituteRoles);
    if (finalImageDesc) {
      finalImageDesc = substituteRoles(finalImageDesc);
    }
    finalVideoPrompt = substituteRoles(finalVideoPrompt);
  }

  // Positive Visual Prompt (Image Generator)
  let positivePrompt = "";
  if (finalImageDesc) {
    // If the database has a detailed enriched imageDesc, use the new bucket format:
    positivePrompt = [
      finalBaseCleaned,
      finalImageDesc,
      ...finalModifiers,
      "8k resolution, highly detailed, photorealistic anatomy, professional photography"
    ].filter(Boolean).join(", ");
  } else {
    // Fallback to legacy assembly
    positivePrompt = [
      finalBaseCleaned,
      ...finalModifiers,
      "realistic human features, photorealistic anatomy, professional photography"
    ].filter(Boolean).join(", ");
  }

  // Inject active LoRA trigger words
  if (loras && loras.length > 0) {
    const triggerWordMap: Record<string, string> = {
      "flux-lenovo-ultrareal.safetensors": "l3n0v0, ultrarealistic raw photo, high detail skin texture, shot on 35mm lens, detailed eyes, realistic lighting",
      "flux-sex-nudes-other-fun-stuff-snofs.safetensors": "snofs, completely naked, intimate photography, highly detailed body structure, explicit, anatomically correct",
      "flux-krea2-klein.safetensors": "krea2, klein, raw photorealistic nude body, highly detailed skin texture",
      "futanari-bulge.safetensors": "penis bulge, bulge, visible bulge shape",
      "super-realism.safetensors": "super-realism, hyperrealistic detail, highly textured skin",
      "wan-lip-bite.safetensors": "she bites her lip, flirty expression, seductive eyes, close up face, lip-biting motion",
      "flux-saggy-breasts.safetensors": "sagging breasts, natural breasts, gravity physics shape, realistic drape",
      "flux-macromastia-clothed.safetensors": "macromastia, massive breasts, heavy chest, fabric stretch, tight clothing, deep cleavage",
      "wan-solo-dildo.safetensors": "piston_dildo_style, insertion action, realistic toy details, solo dildo penetration",
      "ltx-solo-dildo.safetensors": "piston_dildo_style, insertion action, realistic toy details, solo dildo penetration",
      "krea2_Enhancer.safetensors": "enhanced quality, sharp focus, clean textures",
      "secret-sauce-krea2.safetensors": "uncensored, realistic details",
      "hmcum-krea2.safetensors": "hmcum",
      "fake-breasts-krea2.safetensors": "fake breasts, huge fake breasts",
      "penis-size-slider-krea2.safetensors": "penis, erect penis, flaccid penis",
      "krea2-latex.safetensors": "latex, shiny latex",
      "penis-state-krea2.safetensors": "His/Her penis is erect, His/Her penis is flaccid",
      "hucow-milking.safetensors": "hucow milking, lactation, breast milking",
      "Realistic_studio_zimage_epoch_10.safetensors": "realistic face, high detail skin, studio lighting",
      "facial-cumshot-krea2.safetensors": "white thick cum on face, facial cumshot",
      "handsfree-blowjob-krea2.safetensors": "handsfree blowjob, mouth open, sucking penis",
      "krea2-aio-nsfw.safetensors": "nsfw, explicit, sexual interaction",
      "krea2-large-penis.safetensors": "large huge erect penis, futanari, transgender, explicit detail",
      "krea2-bigger-glans.safetensors": "bigger glans, detailed head of penis, explicit texture",
      "krea2-mystic-xxx.safetensors": "mystic xxx, highly detailed explicit scenes, photorealistic anatomy",
      "krea2-futanari-anatomy.safetensors": "futanari penis anatomy, detailed pubic mound, firm organic connection",
      "krea2-penis.safetensors": "detailed penis, raw explicit shaft texture, anatomically correct",
      "krea2-anal-helper.safetensors": "anal insertion helper, detailed buttocks, explicit angle",
      "krea2-filter-bypass.safetensors": "filter bypass, raw photorealistic details",
      "krea2-big-ass-hips.safetensors": "big ass, wide hips, narrow waist, hourglass figure",
      "krea2-body-weight-slider.safetensors": "body weight slider, realistic body mass, natural folds",
      "krea2-metal-bondage.safetensors": "metal bondage frame, secure restraint pose",
      "krea2-realistic-snapshot.safetensors": "realistic snapshot, ZIT style, casual photography",
      "krea2-seed-variance-enhancer.safetensors": "seed variance enhancer, highly detailed rendering",
      "krea2-boob-grabbing.safetensors": "mega boob grabbing, hands squeezing breasts, interactive grab",
      "krea2-facegrid.safetensors": "facegrid 18-angles, expressions layout, multiple angles of head",
      "krea2-hard-nipples.safetensors": "hard nipples, erected nipples, fabric tension"
    };

    const triggersToAdd: string[] = [];
    loras.forEach(lora => {
      const trigger = triggerWordMap[lora.name];
      if (trigger && !positivePrompt.toLowerCase().includes(trigger.toLowerCase())) {
        triggersToAdd.push(trigger);
      }
    });

    if (triggersToAdd.length > 0) {
      positivePrompt = triggersToAdd.join(", ") + ", " + positivePrompt;
    }
  }

  const lowerPrompt = positivePrompt.toLowerCase();
  // Fix anatomical orientation for futanari generations
  if (lowerPrompt.includes("futanari")) {
    positivePrompt += ", correct anatomical orientation: the base of the member, dick starts at the groin area and grows from there, organically and firmly connected to the pubic mound above the vulva cleft, the shaft pointing outwards/upwards away from the body, the glans tip/head is pointing away from the pelvis, and the testicles hang below the base of the shaft";
  } else if (lowerPrompt.includes("penis") || lowerPrompt.includes("circumcised") || lowerPrompt.includes("groin style: male") || lowerPrompt.includes("uncircumcised") || lowerPrompt.includes("dick") || lowerPrompt.includes("member")) {
    // Fix anatomical orientation for male generations
    positivePrompt += ", correct anatomical orientation: the base of the member, dick starts at the groin area and grows from there, organically and firmly connected to the pelvis, the shaft pointing outwards/upwards away from the body, the glans tip/head is pointing away from the pelvis, and the testicles hang below the base of the shaft";
  }

  // Timing/Movement prompt for Remotion/LTX (Video timeline animations & physics)
  let videoPrompt = finalVideoPrompt;
  const lowerVideo = videoPrompt.toLowerCase();

  // 1. Compile Chronological Actions Timeline
  if (lowerVideo.includes("sitting at a news anchor desk") || lowerVideo.includes("anchor")) {
    videoPrompt = "At 0s: sitting at the news anchor desk looking down at papers in hand, organic posture shifting. At 2s: places the papers on the desk, arranging them carefully, subtle shoulder movements. At 4s: looks directly into the camera, natural head tilting, smiling, and continues speaking with occasional hand gestures, background studio lights shimmering softly, 4k resolution.";
  } else if (lowerVideo.includes("reporting") || lowerVideo.includes("on-location")) {
    videoPrompt = "At 0s: standing on location holding the microphone at chest level, organic posture shifting, looking slightly off-camera. At 2s: raises hand to gesture while looking directly into the camera lens, natural head tilting. At 4s: continues speaking with subtle shoulder movements and animated expressions as the background traffic moves behind.";
  } else if (lowerVideo.includes("kneeling") && lowerVideo.includes("standing")) {
    videoPrompt = "At 0s: kneeling model looking up submissively, standing model looking down, holding harness. At 2s: kneeling model leans forward slowly while standing model strokes hair. At 4s: continuing the submissive posture with direct eye contact.";
  } else if (lowerVideo.includes("lying side-by-side")) {
    videoPrompt = "At 0s: lying side-by-side on the bed facing each other, arms resting on shoulders. At 2s: leaning in for a slow, gentle kiss. At 4s: pulling back slightly, eyes locked, smiling softly.";
  } else if (lowerVideo.includes("grinding") || lowerVideo.includes("groin to groin") || lowerVideo.includes("hips grinding")) {
    videoPrompt = "At 0s: standing face-to-face in a close embrace, chests pressed together. At 2s: slowly rocking hips back and forth, grinding pelvic mounds with muscles tensed. At 4s: continuing the rhythmic friction while breathing heavily, eyes closed.";
  } else if (lowerVideo.includes("spanking") || lowerVideo.includes("whip")) {
    videoPrompt = "At 0s: submissive model on hands and knees, dominant model standing beside with hand raised. At 2s: brings hand down in a swift spanking strike on the buttocks. At 4s: strokes the red mark gently, submissive model tensing hips.";
  } else if (lowerVideo.includes("deepthroat") || lowerVideo.includes("oral") || lowerVideo.includes("cunnilingus")) {
    videoPrompt = "At 0s: kneeling model lips touching the tip of the shaft. At 2s: sliding lips and mouth down the shaft in a slow rhythmic sucking motion. At 4s: continuing the deep oral stroke, saliva glistening on the lips.";
  } else if (lowerVideo.includes("milking")) {
    videoPrompt = "At 0s: milking cups clamped onto the base of the shaft. At 2s: milking machine contracts and expands rhythmically, moving up and down the shaft. At 4s: continuing the mechanical pumping motion as fluids collect in tubes.";
  }

  // 2. Dynamic Physics & Accessory Animations
  const physicsModifiers: string[] = [];
  const lowerModifiers = finalModifiers.join(" ").toLowerCase() + " " + lowerPrompt;

  // Breast Physics (natural vs silicone)
  if (lowerModifiers.includes("natural breasts") || lowerModifiers.includes("dd cup") || lowerModifiers.includes("ddd cup")) {
    if (!lowerModifiers.includes("silicone")) {
      physicsModifiers.push("natural gravity physics, soft sway and bounce movement, realistic fluid breast jiggle during motion");
    }
  }
  if (lowerModifiers.includes("silicone breasts") || lowerModifiers.includes("silicone cup") || lowerModifiers.includes("fake breasts")) {
    physicsModifiers.push("firm rounded breast profile, perky shape with minimal movement and stiff bounce");
  }

  // Member Animations
  if (lowerModifiers.includes("penis") || lowerModifiers.includes("shaft") || lowerModifiers.includes("dick") || lowerModifiers.includes("futanari")) {
    physicsModifiers.push("throbbing pulse animation along the veins of the erect shaft");
  }

  // Device Animations
  if (lowerModifiers.includes("milking device") || lowerModifiers.includes("milking cup") || lowerModifiers.includes("milker")) {
    physicsModifiers.push("milking cups contract and expand rhythmically, moving up and down the shaft in a continuous sliding motion");
  }
  if (lowerModifiers.includes("vibrator") || lowerModifiers.includes("vibrating") || lowerModifiers.includes("wand") || lowerModifiers.includes("plug")) {
    physicsModifiers.push("vibrator hums, subtle high-frequency vibration visible on nearby skin surface");
  }

  // Fluid Animations
  if (lowerModifiers.includes("dripping") || lowerModifiers.includes("wet glistening") || lowerModifiers.includes("fluid") || lowerModifiers.includes("semen") || lowerModifiers.includes("pre-cum")) {
    physicsModifiers.push("fluids running slowly down the skin, glistening wet highlights catching light during movements");
  }

  // Restraints Physics
  if (lowerModifiers.includes("bondage") || lowerModifiers.includes("ropes") || lowerModifiers.includes("handcuffs") || lowerModifiers.includes("shibari")) {
    physicsModifiers.push("handcuffs rattling, ropes tightening under body weight tension, restricting movement");
  }

  let finalSound = options.ambientSound || "";
  const presetSoundEffects = (preset as { soundEffects?: string }).soundEffects;
  if (presetSoundEffects) {
    finalSound = finalSound ? `${finalSound}, ${presetSoundEffects}` : presetSoundEffects;
  }

  videoPrompt = formatUnifiedTimeline(videoPrompt, physicsModifiers, finalSound || undefined);

  // 3. Dynamic Negative Prompt Engine
  let negativePrompt = "(worst quality, low quality:1.4), bad anatomy, deformed body, mutated, broken limbs, bad hands, extra fingers, missing fingers, bad feet, asymmetrical face, ugly face, skin blemishes, acnes, fat, thick thighs, duplicate, watermark, signature, text, jpeg artifacts";

  // Lighting-Adaptive Negative Tuning
  const isDarkLighting = 
    options.lighting?.toLowerCase().match(/\b(dark|low key|noir|shadow|night|dim|chiaroscuro|ambient)\b/) ||
    lowerModifiers.match(/\b(dark|low key|noir|shadow|night|dim|chiaroscuro|ambient)\b/);

  if (!isDarkLighting) {
    // Standard bright environments: keep shadows clean, prevent mud/darkness
    negativePrompt += ", underexposed, dark shadows, low contrast, dim lighting, muddy shadows";
  } else {
    // Dark/Moody environments: prevent flat light, overexposure, or washed out highlights
    negativePrompt += ", overexposed, bright highlights, flat lighting, harsh sunlight, high key lighting, washed out";
  }

  // Enforce Category-based Negative Rules
  if (preset.category === "Professional Newsroom" || preset.category === "Field Reporting") {
    negativePrompt += ", casual attire, messy background, unprofessional, messy desk";
    if (options.studioApprovedOnly) {
       negativePrompt += ", nsfw, nude, cleavage, exposed skin";
    }
  }

  if (
    options.extraModifiers?.some(m => m.toLowerCase().includes("realistic") || m.toLowerCase().includes("photorealism") || m.toLowerCase().includes("photography")) || 
    preset.medium?.toLowerCase().includes("photorealism") ||
    preset.medium?.toLowerCase().includes("photograph")
  ) {
    negativePrompt += ", 3d, source_furry, grayscale, monochrome, animation, animated, cartoon, illustration, painting, render";
  }

  const isNudeOrExposed = options.isExposed !== undefined ? options.isExposed : (lowerModifiers.includes("nude") || lowerModifiers.includes("naked") || lowerModifiers.includes("exposed") || lowerModifiers.includes("glamour") || lowerModifiers.includes("boudoir") || lowerModifiers.includes("nsfw") || lowerModifiers.includes("erotic") || lowerModifiers.includes("cleavage") || lowerModifiers.includes("lingerie") || lowerModifiers.includes("bikini") || lowerModifiers.includes("breasts") || lowerModifiers.includes("bdsm"));
  if (!isNudeOrExposed) {
    negativePrompt += ", nsfw, nude, naked, breasts, cleavage, explicit, exposed, nipples, pussy, penis";
  }

  if (options.isAttireOnlyPreview && attire) {
    const agnosticPrompt = makeAttireAgnostic(attire);
    return {
      positivePrompt: agnosticPrompt,
      videoPrompt: "Static showcase. Subtle fabric movement, fabric folds flowing gently.",
      negativePrompt,
      attireUsed: attire,
      presetSlug: "attire-only-preview",
      loras
    };
  }

  const category = (preset as { category?: string }).category || "attire";
  const polished = algorithmicPolish(positivePrompt, videoPrompt, category, {
    enableDuplicateStripping: options.enableDuplicateStripping,
    enableCategorySeparation: options.enableCategorySeparation,
    enableQualityBoilerplate: options.enableQualityBoilerplate,
    enableSfwWordSwap: options.enableSfwWordSwap
  });

  return {
    positivePrompt: polished.imagePrompt,
    videoPrompt: polished.videoPrompt,
    negativePrompt,
    attireUsed: attire || "default professional outfit",
    presetSlug: preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    loras
  };
}

/**
 * Convenience function to compile a visual prompt with random variation.
 */
export function compileVariedPrompt(personaDescription: string, presetSlug: string) {
  const preset = presetRegistry.get(presetSlug) || presetRegistry.getAll()[0].preset;
  return compilePresenterPrompt({
    personaDescription,
    preset,
    randomizeVariation: true
  });
}

/**
 * Auto-detect and suggest visual LoRAs based on prompt keywords.
 */
export function autoDetectLoras(promptText: string): { name: string; strength: number }[] {
  const lower = promptText.toLowerCase();
  const suggestions: { name: string; strength: number }[] = [];

  const snofsKeywords = [
    "naked", "nude", "bdsm", "groin", "erotic", "lingerie", "sex", "snofs", "penetration", "intercourse",
    "anus", "blowjob", "boudoir", "condoms", "deepthroat", "braless", "cowgirl", "cum", "cunnilingus",
    "dildo", "doggystyle", "fingering", "panties", "handjob", "hitachi", "ipcam", "nightvision",
    "masturbat", "massage", "missionary", "pregnant", "prone", "sheer", "snapchat", "selfie",
    "spooning", "strap-on", "tentacles", "testicles", "undressing", "vagina", "wet clothes",
    "anal sex", "anilingus", "glamour", "cleavage", "bikini"
  ];

  const hasSnofsTrigger = snofsKeywords.some(keyword => lower.includes(keyword));

  // Match keyword mappings to verified LoRA files
  if (hasSnofsTrigger) {
    suggestions.push({ name: "aidmaNSFWunlock-FLUX-V0.2.safetensors", strength: 1.0 });
    suggestions.push({ name: "flux-sex-nudes-other-fun-stuff-snofs.safetensors", strength: 0.8 });
  }
  if (lower.includes("realistic") || lower.includes("photorealistic") || lower.includes("skin texture") || lower.includes("realism") || lower.includes("ultrareal") || lower.includes("glamour")) {
    suggestions.push({ name: "flux-skin-detailer.safetensors", strength: 0.8 });
    suggestions.push({ name: "super-realism.safetensors", strength: 0.6 });
    suggestions.push({ name: "flux-lenovo-ultrareal.safetensors", strength: 0.9 });
  }
  if (lower.includes("nude") || lower.includes("naked") || lower.includes("topless")) {
    suggestions.push({ name: "aidmaNSFWunlock-FLUX-V0.2.safetensors", strength: 0.8 });
    suggestions.push({ name: "krea2_Enhancer.safetensors", strength: 0.85 });
  }
  if ((lower.includes("breasts") || lower.includes("cleavage") || lower.includes("bikini") || lower.includes("braless") || lower.includes("vagina")) && !lower.includes("male") && !lower.includes("pectoral")) {
    suggestions.push({ name: "flux-female-anatomy.safetensors", strength: 0.8 });
  }
  if (lower.includes("saggy") || lower.includes("sagging") || lower.includes("saggy breasts") || lower.includes("sagging breasts")) {
    suggestions.push({ name: "flux-saggy-breasts.safetensors", strength: 0.8 });
  }
  if (lower.includes("macromastia") || lower.includes("massive breasts") || lower.includes("gigantic breasts") || lower.includes("extremely large breasts")) {
    suggestions.push({ name: "flux-macromastia-clothed.safetensors", strength: 0.7 });
  }
  if (lower.includes("fake breasts") || lower.includes("bimbo") || lower.includes("fake tits")) {
    suggestions.push({ name: "fake-breasts-krea2.safetensors", strength: 0.75 });
  }
  if (lower.includes("cum") || lower.includes("semen") || lower.includes("ejaculat") || lower.includes("hmcum")) {
    suggestions.push({ name: "hmcum-krea2.safetensors", strength: 0.8 });
    suggestions.push({ name: "facial-cumshot-krea2.safetensors", strength: 0.8 });
    suggestions.push({ name: "krea2-aio-nsfw.safetensors", strength: 0.6 });
  }
  if (lower.includes("futanari") || lower.includes("futa") || lower.includes("hermaphrodite") || lower.includes("dickgirl") || lower.includes("bulge")) {
    suggestions.push({ name: "futanari-bulge.safetensors", strength: 0.75 });
    suggestions.push({ name: "krea2-futanari-anatomy.safetensors", strength: 0.75 });
  }
  if (lower.includes("penis") || lower.includes("cock") || lower.includes("dick") || lower.includes("shaft")) {
    suggestions.push({ name: "krea2-penis.safetensors", strength: 0.8 });
    suggestions.push({ name: "penis-size-slider-krea2.safetensors", strength: 0.8 });
    suggestions.push({ name: "penis-state-krea2.safetensors", strength: 0.8 });
  }
  if (lower.includes("latex")) {
    suggestions.push({ name: "krea2-latex.safetensors", strength: 0.8 });
  }
  if (lower.includes("erect") || lower.includes("flaccid")) {
    suggestions.push({ name: "penis-state-krea2.safetensors", strength: 0.8 });
  }
  if (lower.includes("milking") || lower.includes("lactat") || lower.includes("hucow")) {
    suggestions.push({ name: "hucow-milking.safetensors", strength: 0.8 });
  }
  if (lower.includes("realistic skin") || lower.includes("beautiful woman") || lower.includes("face detail")) {
    suggestions.push({ name: "Realistic_studio_zimage_epoch_10.safetensors", strength: 0.6 });
  }
  if (lower.includes("blowjob") || lower.includes("oral") || lower.includes("sucking")) {
    suggestions.push({ name: "handsfree-blowjob-krea2.safetensors", strength: 0.85 });
  }
  if (lower.includes("nsfw") || lower.includes("explicit") || lower.includes("sexual")) {
    suggestions.push({ name: "krea2-aio-nsfw.safetensors", strength: 0.8 });
    suggestions.push({ name: "wan-dr34ml4y-nsfw.safetensors", strength: 0.8 });
  }
  if (lower.includes("better motion") || lower.includes("stabilize") || lower.includes("smooth motion") || lower.includes("natural posture")) {
    suggestions.push({ name: "ltx-better-motion.safetensors", strength: 0.85 });
  }
  if (lower.includes("dr34ml4y") || lower.includes("m15510n4ry") || lower.includes("d0gg1e") || lower.includes("d0ubl3_bj")) {
    suggestions.push({ name: "wan-dr34ml4y-nsfw.safetensors", strength: 0.8 });
  }
  if (lower.includes("reverse cowgirl") || lower.includes("r3v3rs3_c0wg1rl") || lower.includes("cowgirl")) {
    suggestions.push({ name: "wan-cowgirl.safetensors", strength: 0.8 });
    suggestions.push({ name: "ltx-cowgirl-futa-ride.safetensors", strength: 0.8 });
  }
  if (lower.includes("smoothmix")) {
    suggestions.push({ name: "wan-smoothmix.safetensors", strength: 0.8 });
  }
  if (lower.includes("seductive turns") || lower.includes("turning pose") || lower.includes("half circle")) {
    suggestions.push({ name: "wan-seductive-turns.safetensors", strength: 0.8 });
  }
  if (lower.includes("water splash") || lower.includes("big splash")) {
    suggestions.push({ name: "wan-big-splash.safetensors", strength: 0.8 });
  }
  if (lower.includes("bends forward") || lower.includes("cleavage bend")) {
    suggestions.push({ name: "wan-bouncy-bends.safetensors", strength: 0.8 });
  }
  if (lower.includes("synth pussy")) {
    suggestions.push({ name: "ltx-synth-pussy.safetensors", strength: 0.8 });
  }
  if (lower.includes("penile praxis")) {
    suggestions.push({ name: "ltx-penile-praxis.safetensors", strength: 0.8 });
  }
  if (lower.includes("stomach bulge") || lower.includes("belly bulge")) {
    suggestions.push({ name: "ltx-stomach-bulge.safetensors", strength: 0.8 });
  }
  if (lower.includes("riding pov") || lower.includes("backshot animation") || lower.includes("frontshot animation")) {
    suggestions.push({ name: "ltx-riding-pov.safetensors", strength: 0.8 });
  }
  if (lower.includes("futa cumshot") || lower.includes("futa masturbation")) {
    suggestions.push({ name: "ltx-futa-cumshot.safetensors", strength: 0.8 });
  }
  if (lower.includes("futa ride")) {
    suggestions.push({ name: "ltx-cowgirl-futa-ride.safetensors", strength: 0.8 });
  }
  if (lower.includes("penislora") || lower.includes("sulphur penis")) {
    suggestions.push({ name: "ltx-penis-sulphur.safetensors", strength: 0.8 });
  }
  if (lower.includes("sexgod") || lower.includes("handjobs")) {
    suggestions.push({ name: "ltx-sexgod-handjobs.safetensors", strength: 0.8 });
  }
  if (lower.includes("creampie animation") || lower.includes("cr3ampi3")) {
    suggestions.push({ name: "ltx-creampie-animation.safetensors", strength: 0.8 });
  }
  if (lower.includes("bouncy walk") || lower.includes("walking camera")) {
    suggestions.push({ name: "ltx-bouncy-walk.safetensors", strength: 0.8 });
  }
  if (lower.includes("bouncing boobs") || lower.includes("breast bouncing")) {
    suggestions.push({ name: "ltx-bouncing-boobs.safetensors", strength: 0.8 });
  }
  if (lower.includes("body physics") || lower.includes("nsfwsme") || lower.includes("fluid motion")) {
    suggestions.push({ name: "ltx-nsfw-body-physics.safetensors", strength: 0.8 });
  }
  if (lower.includes("soft enhance") || lower.includes("soft detail")) {
    suggestions.push({ name: "ltx-soft-enhance.safetensors", strength: 0.8 });
  }
  if (lower.includes("flux 4 play") || lower.includes("4 play")) {
    suggestions.push({ name: "flux-4-play-nsfw.safetensors", strength: 0.8 });
  }
  if (lower.includes("fingering")) {
    suggestions.push({ name: "wan-perfect-fingering.safetensors", strength: 0.8 });
    suggestions.push({ name: "ltx-fingering-dildo.safetensors", strength: 0.8 });
  }
  if (lower.includes("futa cumshot") || lower.includes("futa masturbation")) {
    suggestions.push({ name: "wan-futa-cumshot.safetensors", strength: 0.8 });
  }
  if (lower.includes("f4c3spl4sh")) {
    suggestions.push({ name: "wan-f4c3spl4sh.safetensors", strength: 0.8 });
  }
  if (lower.includes("bouncing boobs") || lower.includes("breast bouncing") || lower.includes("breasts are bouncing")) {
    suggestions.push({ name: "wan-bouncing-boobs.safetensors", strength: 0.8 });
  }
  if (lower.includes("cum facial") || lower.includes("cum on face") || lower.includes("facial cumshot") || lower.includes("cum shoots") || lower.includes("cum pulses")) {
    suggestions.push({ name: "wan-cum-facial.safetensors", strength: 0.8 });
  }
  if (lower.includes("titfuck") || lower.includes("paizuri") || lower.includes("titjob")) {
    suggestions.push({ name: "wan-pov-titfuck.safetensors", strength: 0.8 });
  }
  if (lower.includes("breast play") || lower.includes("breastrub")) {
    suggestions.push({ name: "wan-breast-play.safetensors", strength: 0.8 });
  }
  if (lower.includes("deepthroat") || lower.includes("throatfuck") || lower.includes("oral sex") || lower.includes("gasping for air")) {
    suggestions.push({ name: "wan-deepthroat.safetensors", strength: 0.8 });
    suggestions.push({ name: "wan-ultimate-deepthroat.safetensors", strength: 0.8 });
    suggestions.push({ name: "ltx-deepthroat.safetensors", strength: 0.8 });
  }
  if (lower.includes("doggy style") || lower.includes("doggy style sex")) {
    suggestions.push({ name: "wan-doggy-style.safetensors", strength: 0.8 });
  }
  if (lower.includes("real orgasm") || lower.includes("remoteorgasm") || lower.includes("climaxing")) {
    suggestions.push({ name: "ltx-real-orgasm.safetensors", strength: 0.8 });
  }
  if (lower.includes("video reasoning") || lower.includes("vbvr") || lower.includes("reasoning")) {
    suggestions.push({ name: "ltx-reasoning.safetensors", strength: 0.8 });
  }
  if (lower.includes("better physics") || lower.includes("physltx") || lower.includes("physics")) {
    suggestions.push({ name: "ltx-better-physics.safetensors", strength: 0.8 });
  }
  if (lower.includes("better nsfw motion") || lower.includes("nsfw motion")) {
    suggestions.push({ name: "ltx-better-nsfw-motion.safetensors", strength: 0.8 });
  }
  if (lower.includes("joyshot") || lower.includes("joyshot cumshot")) {
    suggestions.push({ name: "ltx-joyshot-cumshot.safetensors", strength: 0.8 });
  }
  if (lower.includes("epic cumshot") || lower.includes("epic cumshots")) {
    suggestions.push({ name: "ltx-epic-cumshots.safetensors", strength: 0.8 });
  }
  if (lower.includes("anal insertion")) {
    suggestions.push({ name: "ltx-anal-insertion.safetensors", strength: 0.8 });
  }
  if (lower.includes("better motion") || lower.includes("mvmt_lora")) {
    suggestions.push({ name: "ltx-better-motion.safetensors", strength: 0.8 });
  }
  if (lower.includes("instagramification") || lower.includes("instagram") || lower.includes("igbadie") || lower.includes("influencer")) {
    suggestions.push({ name: "instagramification-krea2.safetensors", strength: 0.8 });
  }
  if (lower.includes("krea 2 nsfw") || lower.includes("nsfw v4") || lower.includes("knpv4")) {
    suggestions.push({ name: "nsfw-v4-krea2.safetensors", strength: 0.8 });
  }
  if (lower.includes("thot shot") || lower.includes("rlyskye") || lower.includes("skye")) {
    suggestions.push({ name: "thot-shot-skye-krea2.safetensors", strength: 0.8 });
  }
  if (lower.includes("realistic slider") || lower.includes("realistic-slider")) {
    suggestions.push({ name: "realistic-slider-krea2.safetensors", strength: 0.8 });
  }
  if (lower.includes("femboy") || lower.includes("androgynous") || lower.includes("trans")) {
    suggestions.push({ name: "femboy-krea2.safetensors", strength: 0.8 });
  }
  if (lower.includes("pornmaster") || lower.includes("色情大師")) {
    suggestions.push({ name: "pornmaster-detail-slider-krea2.safetensors", strength: 0.8 });
    suggestions.push({ name: "pornmaster-uncensored-krea2.safetensors", strength: 0.8 });
    suggestions.push({ name: "flux-pornmaster-asian-beauty.safetensors", strength: 0.8 });
  }
  if (lower.includes("instagram-influencer")) {
    suggestions.push({ name: "krea2-instagram-influencer.safetensors", strength: 0.8 });
  }
  if (lower.includes("rawgirl") || lower.includes("spicy raw")) {
    suggestions.push({ name: "krea2-rawgirl-spicy.safetensors", strength: 0.8 });
  }
  if (lower.includes("phone photography") || lower.includes("snapshot") || lower.includes("amateur photo")) {
    suggestions.push({ name: "krea2-phone-photography.safetensors", strength: 0.8 });
  }
  if (lower.includes("cumshot slider") || lower.includes("cum on face slider")) {
    suggestions.push({ name: "flux-klein-cumshot-slider.safetensors", strength: 0.8 });
  }
  if (lower.includes("aging") || lower.includes("old age") || lower.includes("wrinkles")) {
    suggestions.push({ name: "flux-aging-slider.safetensors", strength: 0.8 });
  }
  if (lower.includes("asian beauty")) {
    suggestions.push({ name: "flux-pornmaster-asian-beauty.safetensors", strength: 0.8 });
  }
  if (lower.includes("sexgod doggystyle") || lower.includes("doggystyle sex")) {
    suggestions.push({ name: "flux-sexgod-doggystyle.safetensors", strength: 0.8 });
  }
  if (lower.includes("amateur photography") || lower.includes("casual photo")) {
    suggestions.push({ name: "flux-amateur-photography.safetensors", strength: 0.8 });
  }
  if (lower.includes("betternudes") || lower.includes("better nudes")) {
    suggestions.push({ name: "flux-betternudes.safetensors", strength: 0.8 });
  }
  if (lower.includes("airport crush") || lower.includes("airport")) {
    suggestions.push({ name: "flux-airport-crush.safetensors", strength: 0.8 });
  }
  if (lower.includes("2000s") || lower.includes("analog core") || lower.includes("vintage film")) {
    suggestions.push({ name: "flux-2000s-analog-core.safetensors", strength: 0.85 });
  }
  if (lower.includes("ankle grab") || lower.includes("ankle grab missionary")) {
    suggestions.push({ name: "flux-ankle-grab-missionary.safetensors", strength: 0.8 });
  }
  if (lower.includes("vintage lingerie") || lower.includes("stockings") || lower.includes("suspenders")) {
    suggestions.push({ name: "flux-vintage-lingerie.safetensors", strength: 0.85 });
  }
  if (lower.includes("reverse cowgirl anal") || lower.includes("full nelson")) {
    suggestions.push({ name: "krea2-reverse-cowgirl-anal.safetensors", strength: 0.8 });
  }
  if (lower.includes("smooth motion") || lower.includes("60 fps") || lower.includes("buttery smooth")) {
    suggestions.push({ name: "ltx-smooth-60fps.safetensors", strength: 0.85 });
  }
  if (lower.includes("ultimate deepthroat") || lower.includes("throatfuck")) {
    suggestions.push({ name: "ltx-ultimate-deepthroat.safetensors", strength: 0.85 });
  }
  if (lower.includes("rogue ai") || lower.includes("missionary cowgirl")) {
    suggestions.push({ name: "ltx-rogue-missionary.safetensors", strength: 0.8 });
  }
  if (lower.includes("anal play")) {
    suggestions.push({ name: "ltx-anal-play.safetensors", strength: 0.8 });
  }
  if (lower.includes("3d animations") || lower.includes("cgi style")) {
    suggestions.push({ name: "ltx-3d-animations.safetensors", strength: 0.8 });
  }
  if (lower.includes("sex from behind") || lower.includes("facing cam")) {
    suggestions.push({ name: "ltx-behind-facing-cam.safetensors", strength: 0.8 });
  }
  if (lower.includes("paizuri thrusting") || lower.includes("titfuck thrusting")) {
    suggestions.push({ name: "ltx-paizuri-thrust.safetensors", strength: 0.8 });
  }
  if (lower.includes("creampie cum") || lower.includes("cum animation early")) {
    suggestions.push({ name: "ltx-creampie-cum-early.safetensors", strength: 0.8 });
  }
  if (lower.includes("fingering lora") || lower.includes("fingering motion")) {
    suggestions.push({ name: "ltx-fingering.safetensors", strength: 0.85 });
  }
  if (lower.includes("sexgod nudity") || lower.includes("female nudity")) {
    suggestions.push({ name: "ltx-sexgod-female-nudity.safetensors", strength: 0.8 });
  }
  if (lower.includes("sexgod hairy") || lower.includes("hairy girls")) {
    suggestions.push({ name: "ltx-sexgod-hairy.safetensors", strength: 0.8 });
  }
  if (lower.includes("breast massage")) {
    suggestions.push({ name: "ltx-sexgod-breast-massage.safetensors", strength: 0.8 });
  }
  if (lower.includes("better breasts") || lower.includes("breast jiggle")) {
    suggestions.push({ name: "ltx-better-breasts-motion.safetensors", strength: 0.8 });
  }
  if (lower.includes("pussyjob") || lower.includes("sulphur pussyjob")) {
    suggestions.push({ name: "ltx-pussyjob-sulphur.safetensors", strength: 0.8 });
  }
  if (lower.includes("hits the face") || lower.includes("hits face")) {
    suggestions.push({ name: "wan-hits-face.safetensors", strength: 0.8 });
  }
  if (lower.includes("slop bounce") || lower.includes("bounce animation")) {
    suggestions.push({ name: "wan-slop-bounce.safetensors", strength: 0.8 });
  }
  if (lower.includes("double handy") || lower.includes("singlehandy")) {
    suggestions.push({ name: "wan-double-handy-bj.safetensors", strength: 0.8 });
  }
  if (lower.includes("slop twerk") || lower.includes("twerking")) {
    suggestions.push({ name: "wan-slop-twerk.safetensors", strength: 0.8 });
  }
  if (lower.includes("mating press")) {
    suggestions.push({ name: "wan-mating-press.safetensors", strength: 0.8 });
  }

  return suggestions;
}

export interface StoryWardrobeAndLightingConfig {
  attire: string;
  lightingTone: number; // 0: neutral broadcast, 1: warm corporate/golden, 2: cyber/tech cyan, 3: breaking emergency red
  lightingDescription: string;
  studioBgId: string;
  presetKey: string;
}

/**
 * Automatically selects anchor wardrobe, virtual studio set, and lighting scheme
 * based on story category and urgency.
 */
export function resolveStoryWardrobeAndLighting(
  category: string = "general",
  urgency: "breaking" | "standard" | "urgent" | "feature" = "standard"
): StoryWardrobeAndLightingConfig {
  const normCat = (category || "").toLowerCase();

  if (urgency === "breaking" || normCat.includes("crisis") || normCat.includes("emergency") || normCat.includes("war") || normCat.includes("breaking")) {
    return {
      attire: "sharp tailored crimson blazer with black trim, professional emergency broadcast attire",
      lightingTone: 3, // dramatic breaking red
      lightingDescription: "dramatic breaking news studio lighting with deep crimson key accents and high-contrast rim light",
      studioBgId: "breaking_emergency_red",
      presetKey: "breaking_news",
    };
  }

  if (normCat.includes("finance") || normCat.includes("economy") || normCat.includes("market") || normCat.includes("crypto")) {
    return {
      attire: "impeccably tailored navy blue corporate power suit, crisp spread collar, sleek broadcast presentation",
      lightingTone: 1, // warm corporate
      lightingDescription: "prime-time bright executive studio lighting with clean volumetric backfill and warm side-rim lights",
      studioBgId: "financial_ticker_wall",
      presetKey: "prime_time_desk",
    };
  }

  if (normCat.includes("tech") || normCat.includes("ai") || normCat.includes("science") || normCat.includes("robot")) {
    return {
      attire: "sleek techwear minimalist black turtleneck with subtle graphite geometric lines, modern tech visionary style",
      lightingTone: 2, // cool cyber
      lightingDescription: "futuristic high-key studio lighting with volumetric cyan accents and crisp rim halos",
      studioBgId: "cyberpunk_volumetric_set",
      presetKey: "deep_tech",
    };
  }

  if (normCat.includes("culture") || normCat.includes("entertainment") || normCat.includes("lifestyle") || urgency === "feature") {
    return {
      attire: "luxurious emerald wrap dress with subtle satin sheen, relaxed elegance for conversational interview",
      lightingTone: 1, // golden hour warm
      lightingDescription: "golden hour twilight studio lighting, soft diffused wrap-around key, warm organic reflections",
      studioBgId: "warm_wood_loft",
      presetKey: "feature_interview",
    };
  }

  // Default General Broadcast
  return {
    attire: "modern charcoal broadcast blazer over a silk cream blouse, authoritative anchor wardrobe",
    lightingTone: 0, // neutral broadcast
    lightingDescription: "balanced 5600K broadcast key-light with clean softbox fill and neutral rim lighting",
    studioBgId: "newsroom_broadcasting_desk",
    presetKey: "general_broadcast",
  };
}

