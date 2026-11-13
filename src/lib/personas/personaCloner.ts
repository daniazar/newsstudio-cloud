/**
 * src/lib/personas/personaCloner.ts
 *
 * Vision-Powered Persona Cloning Core Service.
 * Analyzes an image of a person using Gemini Vision, extracts full identity,
 * forensic body type, proportions (bust size, waist, hips, build), facial features,
 * and wardrobe, then registers the persona across local JSON and Prisma DB.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../prisma";
import { Persona, PersonaVisualTraits, saveCustomPersona } from "../tts/personas";

function extractAndSaveVoice(options: ClonePersonaOptions, slug: string): string | undefined {
  const voicesDir = path.join(process.cwd(), "public", "voices");
  const presetsDir = path.join(process.cwd(), "public", "presets", "voices");
  fs.mkdirSync(voicesDir, { recursive: true });
  fs.mkdirSync(presetsDir, { recursive: true });

  const destWav = path.join(voicesDir, `${slug}.wav`);
  const presetWav = path.join(presetsDir, `${slug}.wav`);

  let ffmpegBin = "ffmpeg";
  const bundledFfmpeg = path.join(process.cwd(), "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
  if (fs.existsSync(bundledFfmpeg)) {
    ffmpegBin = bundledFfmpeg;
  }

  if (options.videoPath) {
    const src = path.isAbsolute(options.videoPath) ? options.videoPath : path.resolve(process.cwd(), options.videoPath);
    if (fs.existsSync(src)) {
      try {
        execFileSync(ffmpegBin, ["-y", "-i", src, "-vn", "-acodec", "pcm_s16le", "-ar", "24000", "-ac", "1", destWav], { stdio: "ignore" });
        fs.copyFileSync(destWav, presetWav);
        return destWav;
      } catch (e) {
        console.warn("⚠️ Audio extraction from video failed:", e);
      }
    }
  }

  if (options.voicePath) {
    const src = path.isAbsolute(options.voicePath) ? options.voicePath : path.resolve(process.cwd(), options.voicePath);
    if (fs.existsSync(src)) {
      try {
        execFileSync(ffmpegBin, ["-y", "-i", src, "-vn", "-acodec", "pcm_s16le", "-ar", "24000", "-ac", "1", destWav], { stdio: "ignore" });
        fs.copyFileSync(destWav, presetWav);
        return destWav;
      } catch {
        fs.copyFileSync(src, destWav);
        fs.copyFileSync(src, presetWav);
        return destWav;
      }
    }
  }

  if (options.voiceBase64) {
    const clean = options.voiceBase64.replace(/^data:audio\/[^;]+;base64,/, "");
    const tempFile = path.join(process.cwd(), "scratch", `temp_voice_${slug}.raw`);
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    fs.writeFileSync(tempFile, Buffer.from(clean, "base64"));
    try {
      execFileSync(ffmpegBin, ["-y", "-i", tempFile, "-vn", "-acodec", "pcm_s16le", "-ar", "24000", "-ac", "1", destWav], { stdio: "ignore" });
      fs.copyFileSync(destWav, presetWav);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return destWav;
    } catch {
      fs.copyFileSync(tempFile, destWav);
      fs.copyFileSync(tempFile, presetWav);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return destWav;
    }
  }

  return undefined;
}

export interface CloneTransformOptions {
  /** Rejuvenation target / preset: 'young_rookie' (21-25yo), 'prime_anchor' (30-35yo), 'mature_senior' (55-65yo), or target age number */
  rejuvenate?: boolean | "young_rookie" | "prime_anchor" | "mature_senior" | number;
  /** Relative age offset in years, e.g. -15 to de-age by 15 years, or +20 to age up */
  ageShift?: number;
  /** Glamour level upgrade */
  glamourLevel?: "natural" | "broadcast_studio_hd" | "red_carpet_celebrity";
  /** Gender swap transformation */
  genderSwap?: boolean | "male_to_female" | "female_to_male";
  /** Body type modification */
  bodyMod?: "original" | "athletic_toned" | "voluptuous_hourglass" | "slender_runway" | "muscular_bodybuilder" | "curvy_plus";
  /** Outfit restyle preset */
  outfitPreset?: "keep_photo" | "executive_anchor_suit" | "cocktail_gala" | "cyberpunk_techwear" | "outdoor_storm_jacket" | "casual_chic";
  /** Studio lighting upgrade */
  lightingUpgrade?: "photo_lighting" | "3point_broadcast_studio" | "cinematic_neon_glow" | "golden_hour_twilight";
}

export interface ClonePersonaOptions extends CloneTransformOptions {
  /** Absolute or relative path to an image file on disk */
  imagePath?: string;
  /** Raw image buffer */
  imageBuffer?: Buffer;
  /** Base64-encoded image string (with or without data URI prefix) */
  imageBase64?: string;
  /** Image MIME type (e.g. "image/jpeg", "image/png", "image/webp") */
  mimeType?: string;
  /** Optional manual slug override */
  slug?: string;
  /** Optional manual name override */
  name?: string;
  /** Optional manual title / role override */
  role?: string;
  /** Optional manual language override ('en' | 'es' | 'fr' | 'it' | 'de' | 'pt' | 'zh' | 'ja') */
  language?: "en" | "es" | "fr" | "it" | "de" | "pt" | "zh" | "ja";
  /** Optional manual gender override ('female' | 'male') */
  gender?: "female" | "male";
  /** Path to audio sample (.wav, .mp3, .m4a) for voice cloning */
  voicePath?: string;
  /** Path to video sample (.mp4, .mov, .webm) from which speech audio will be extracted */
  videoPath?: string;
  /** Base64-encoded audio sample */
  voiceBase64?: string;
  /** Optional user instructions or character notes */
  guidance?: string;
  /** Target tenant/company ID (defaults to "org_default_tenant") */
  companyId?: string;
  /** Whether to sync to Prisma database (default: true) */
  syncToDatabase?: boolean;
}

export interface ClonedPersonaResult {
  persona: Persona;
  avatarLocalPath: string;
  avatarUrl: string;
  voiceLocalPath?: string;
  masterArchivePath: string;
  signatureAttire: {
    id: string;
    label: string;
    description: string;
    category: "broadcast" | "edgy_leather" | "gala" | "techwear" | "casual";
  };
  appliedTransformations: {
    rejuvenate?: string | number | boolean;
    glamourLevel?: string;
    genderSwap?: boolean | string;
    bodyMod?: string;
    outfitPreset?: string;
  };
  rawExtraction: Record<string, unknown>;
}

const CLONE_SYSTEM_INSTRUCTION = `You are a world-class AI Character Architect, Vision Forensic Specialist, and Visual Continuity Director.
Your task is to analyze a person's photograph with extreme precision and construct a complete, professional AI News Presenter / Anchor persona profile.

CRITICAL REQUIREMENT — BODY TYPE, PROPORTIONS & ANATOMICAL CONTINUITY:
You must extract the person's precise physical body type, proportions, bust/chest size, waist, hips, and silhouette.
This is mandatory so the system can generate this exact character in different clothes, formal broadcast suits, casual wear, gala gowns, or swimwear later without altering their physical likeness or body proportions.

TRANSFORMATION & REJUVENATION CAPABILITIES:
If transformation directives (such as Rejuvenation/De-aging, Glamour/HD Beautify, Gender Swap, Body Type Modification, or Wardrobe Overhaul) are requested:
1. Rejuvenation / Age Shift: Adjust estimated age, skin elasticity, collagen, and vitality while strictly locking facial bone geometry, eye shape, smile lines, and distinct beauty marks.
2. Glamour / Studio HD: Elevate hair styling, volume, healthy sheen, and broadcast studio lighting while removing casual blemishes.
3. Gender Swap: Generate the opposite-gender counterpart preserving their exact eye color, hair tone, and presence.
4. Body Proportions: Sculpt the build according to the requested modifier (e.g. voluptuous 34D/36DD hourglass, athletic toned, slender runway).
5. Outfit Overhaul: Replace casual clothes with the requested style (e.g. tailored executive double-breasted suit or gala gown).

Extract and output ONLY valid JSON matching this schema:
{
  "slug": "string (lowercase_snake_case, unique, e.g. 'valeria_rossi_anchor')",
  "name": "string (Fitting professional first and last name)",
  "role": "string (e.g. 'Senior International Correspondent', 'Lead Prime-Time Anchor', 'Chief Financial Analyst')",
  "gender": "female" | "male",
  "language": "en" | "es" | "fr" | "it" | "de" | "pt" | "zh" | "ja",
  "description": "string (1-2 sentences summarizing their broadcast demeanor, vocal cadence, and subject domain)",
  "bio": "string (Rich background biography detailing their career, journalism credentials, and on-camera presence)",
  "systemPrompt": "string (2nd-person LLM scriptwriting directive, e.g. 'You are [Name], a charismatic and authoritative news anchor...')",
  "traits": {
    "age": 32,
    "heightCm": 174,
    "heightFeet": "5'8.5\\"",
    "weightKg": 59,
    "weightLbs": 130,
    "skinTone": "string (Exact skin tone and undertones, e.g. 'Warm Latin olive tan skin tone with natural sun-kissed undertones')",
    "skinTexture": "string (Micro-details e.g. 'Natural skin pores, subtle smile lines around eyes, delicate collarbone mole')",
    "hair": "string (Detailed hairstyle, length, texture, color, e.g. 'Voluminous shoulder-length chestnut brown hair with soft natural waves and center part')",
    "face": "string (Eye color, bone structure, nose, lips, distinct facial markers e.g. 'High defined cheekbones, expressive hazel-green eyes with gold flecks, refined jawline, warm authoritative expression')",
    "build": "string (PRECISE BODY PROPORTIONS & SILHOUETTE, e.g. 'Athletic voluptuous hourglass frame, 34D bust, 25-inch waist, 37-inch hips, toned shoulders' or 'Broad athletic muscular frame, 42-inch chest, 32-inch waist, tapered v-taper physique')",
    "nudeDetails": {
      "bareTorso": "string (e.g. 'Smooth flat abdomen, subtle defined waist curve, small neat navel')",
      "breasts": "string (For females: e.g. 'firm natural round 34D breasts with soft rose aureolas and delicate erect nipples')",
      "vulva": "string (e.g. 'Clean shaved feminine anatomy.')",
      "phallus": {
        "type": "circumcised",
        "flaccid": "soft flaccid anatomy (4.2 inches length, 1.3 inches girth)",
        "erect": "firm erect anatomy (7.2 inches length, 1.5 inches girth)"
      }
    },
    "defaultAttire": "string (Detailed description of the garment worn in photo or transformed wardrobe e.g. 'Tailored cobalt blue single-breasted blazer over crisp cream silk camisole with gold pendant necklace')",
    "defaultBackground": "string (e.g. 'Modern broadcast newsroom studio set with soft blurred ambient screens')",
    "defaultLighting": "string (e.g. 'Professional 3-point studio lighting with soft key light and subtle hair rim light')"
  },
  "signatureAttire": {
    "label": "string (e.g. '👗 Cobalt Blue Executive Blazer & Silk Top')",
    "description": "string (Full garment description)",
    "category": "broadcast" | "edgy_leather" | "gala" | "techwear" | "casual"
  },
  "styleGuidelines": "string (Wardrobe guidelines highlighting what cuts, colors, and silhouettes best flatter their body proportions)"
}`;

/**
 * Normalizes an image source into a base64 string and detects mime type.
 */
function resolveImagePayload(options: ClonePersonaOptions): { base64: string; mimeType: string; buffer: Buffer } {
  if (options.imageBuffer) {
    const mimeType = options.mimeType || "image/png";
    return {
      base64: options.imageBuffer.toString("base64"),
      mimeType,
      buffer: options.imageBuffer,
    };
  }

  if (options.imageBase64) {
    let clean = options.imageBase64;
    let detectedMime = options.mimeType || "image/png";

    if (clean.startsWith("data:")) {
      const match = clean.match(/^data:([^;]+);base64,/);
      if (match) {
        detectedMime = match[1];
        clean = clean.substring(match[0].length);
      }
    }

    const buffer = Buffer.from(clean, "base64");
    return {
      base64: clean,
      mimeType: detectedMime,
      buffer,
    };
  }

  if (options.imagePath) {
    const resolvedPath = path.isAbsolute(options.imagePath)
      ? options.imagePath
      : path.resolve(process.cwd(), options.imagePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found at path: ${resolvedPath}`);
    }

    const buffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    let mimeType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".webp") mimeType = "image/webp";

    return {
      base64: buffer.toString("base64"),
      mimeType,
      buffer,
    };
  }

  throw new Error("No image provided. Please specify imagePath, imageBase64, or imageBuffer.");
}

/**
 * Builds specific prompt transformation directives based on user options.
 */
function buildTransformationDirectives(options: ClonePersonaOptions): string[] {
  const directives: string[] = [];

  if (options.rejuvenate) {
    if (options.rejuvenate === "young_rookie" || options.rejuvenate === true) {
      directives.push("✨ REJUVENATION: De-age the subject to their early 20s (21-25yo). Impart radiant, youthful skin vitality and freshness while preserving their authentic eye color, facial bone structure, smile, and beauty marks.");
    } else if (options.rejuvenate === "prime_anchor") {
      directives.push("✨ REJUVENATION: Present the subject at their prime-time anchor age (29-34yo) with commanding poise and youthful broadcast authority.");
    } else if (options.rejuvenate === "mature_senior") {
      directives.push("✨ MATURITY PROGRESSION: Present the subject as a distinguished senior expert (55-65yo) with silver-touched hair and seasoned authority.");
    } else if (typeof options.rejuvenate === "number") {
      directives.push(`✨ AGE TRANSFORMATION: Set the subject's exact age to ${options.rejuvenate} years old while preserving facial identity.`);
    }
  }

  if (options.ageShift) {
    directives.push(`✨ AGE OFFSET: Adjust the subject's age by ${options.ageShift > 0 ? `+${options.ageShift}` : options.ageShift} years.`);
  }

  if (options.glamourLevel && options.glamourLevel !== "natural") {
    if (options.glamourLevel === "broadcast_studio_hd") {
      directives.push("💄 BROADCAST GLAMOUR: Upgrade appearance with high-end television studio hair styling, luminous skin subsurface scattering, refined makeup, and 3-point key studio lighting.");
    } else if (options.glamourLevel === "red_carpet_celebrity") {
      directives.push("✨ RED CARPET CELEBRITY GLAMOUR: Premium gala aesthetic, immaculate hairstyling, high-fashion radiance, and diamond jewelry accents.");
    }
  }

  if (options.genderSwap) {
    directives.push("🔄 GENDER SWAP: Create the opposite-gender counterpart of the person in the photo. Keep the exact eye color, hair tone, jawline geometry, and personality presence, adapting the build and facial contours to their opposite gender.");
  }

  if (options.bodyMod && options.bodyMod !== "original") {
    const bodyMap: Record<string, string> = {
      athletic_toned: "Athletic toned frame (34C bust for females or 42-inch muscular chest for males, 24-inch waist, 36-inch hips, defined abs)",
      voluptuous_hourglass: "Voluptuous curvy hourglass silhouette (34D/36DD bust, 25-inch narrow waist, 38-inch curved hips)",
      slender_runway: "Slender runway model physique (32B bust, 23-inch waist, 34-inch hips, long elegant limbs)",
      muscular_bodybuilder: "Muscular athletic build with prominent shoulder definition and v-taper torso",
      curvy_plus: "Full-figured curvy elegance (38DDD bust, 32-inch waist, 42-inch hips)"
    };
    directives.push(`💃 BODY SCULPTING: Transform physical build to: ${bodyMap[options.bodyMod] || options.bodyMod}`);
  }

  if (options.outfitPreset && options.outfitPreset !== "keep_photo") {
    const outfitMap: Record<string, string> = {
      executive_anchor_suit: "Tailored royal cobalt blue double-breasted blazer over crisp cream silk camisole with gold buttons",
      cocktail_gala: "Elegant floor-length emerald green satin wrap gown with gold belt and delicate necklace",
      cyberpunk_techwear: "Futuristic dark techwear jacket with subtle neon LED accents over fitted bandeau top",
      outdoor_storm_jacket: "Weatherproof high-performance storm jacket with press media credentials and radio mic",
      casual_chic: "Smart-casual cashmere knit sweater with tailored trousers and minimalist watch"
    };
    directives.push(`👗 WARDROBE RESTYLE: Replace original clothing with: ${outfitMap[options.outfitPreset] || options.outfitPreset}`);
  }

  if (options.lightingUpgrade && options.lightingUpgrade !== "photo_lighting") {
    const lightMap: Record<string, string> = {
      "3point_broadcast_studio": "Professional 3-point television studio lighting with soft diffused key light and crisp rim separation",
      cinematic_neon_glow: "Cyberpunk moody neon lighting with electric purple and cyan ambient fill",
      golden_hour_twilight: "Warm golden-hour natural sunset lighting with amber highlights"
    };
    directives.push(`💡 LIGHTING UPGRADE: ${lightMap[options.lightingUpgrade] || options.lightingUpgrade}`);
  }

  return directives;
}

export const ClonedPersonaTraitsSchema = z.object({
  slug: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  gender: z.enum(["female", "male"]).optional(),
  language: z.enum(["en", "es", "fr", "it", "de", "pt", "zh", "ja"]).optional(),
  description: z.string().optional(),
  bio: z.string().optional(),
  systemPrompt: z.string().optional(),
  traits: z
    .object({
      age: z.number().optional(),
      heightCm: z.number().optional(),
      heightFeet: z.string().optional(),
      weightKg: z.number().optional(),
      weightLbs: z.number().optional(),
      skinTone: z.string().optional(),
      skinTexture: z.string().optional(),
      hair: z.string().optional(),
      face: z.string().optional(),
      build: z.string().optional(),
      nudeDetails: z
        .object({
          bareTorso: z.string().optional(),
          breasts: z.string().optional(),
          vulva: z.string().optional(),
          phallus: z
            .object({
              type: z.string().optional(),
              flaccid: z.string().optional(),
              erect: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
      defaultAttire: z.string().optional(),
      defaultBackground: z.string().optional(),
      defaultLighting: z.string().optional(),
    })
    .optional(),
  signatureAttire: z
    .object({
      label: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(["broadcast", "edgy_leather", "gala", "techwear", "casual"]).catch("broadcast").optional(),
    })
    .optional(),
  styleGuidelines: z.string().optional(),
});

/**
 * Clones a persona from an image using multimodal LLM vision and registers it in the system.
 */
export async function clonePersonaFromImage(options: ClonePersonaOptions): Promise<ClonedPersonaResult> {
  const { mimeType, buffer } = resolveImagePayload(options);

  const transformDirectives = buildTransformationDirectives(options);
  const directivesText = transformDirectives.length > 0
    ? `\n\nAPPLIED TRANSFORMATION & REJUVENATION DIRECTIVES:\n${transformDirectives.map((d) => `• ${d}`).join("\n")}`
    : "";

  const promptText = `Analyze this image in detail and extract the complete news anchor persona profile.
Pay special attention to the body type, bust size/chest proportions, waist, hips, and physical silhouette so this character can be generated in any clothing later.
${options.name ? `Preferred Name: "${options.name}".` : ""}
${options.role ? `Preferred Role: "${options.role}".` : ""}
${options.language ? `Preferred Language: "${options.language}".` : ""}
${options.gender ? `Preferred Gender: "${options.gender}".` : ""}
${options.guidance ? `Additional Character Guidance: "${options.guidance}".` : ""}${directivesText}`;

  const contentParts: Array<
    | { type: "text"; text: string }
    | { type: "file"; data: Buffer; mediaType: string }
  > = [
    {
      type: "file",
      data: buffer,
      mediaType: mimeType || "image/png",
    },
    {
      type: "text",
      text: promptText,
    },
  ];

  const visionModel = process.env.OLLAMA_VISION_MODEL || "llava";

  const { object: parsed } = await generateLlmObject({
    schema: ClonedPersonaTraitsSchema,
    schemaName: "ClonedPersonaTraits",
    system: CLONE_SYSTEM_INSTRUCTION,
    messages: [{ role: "user", content: contentParts }],
    temperature: 0.4,
    tier: "vision",
    fallbackModel: visionModel,
    allowFallback: true,
  });

  // 1. Sanitize & Apply Overrides
  const rawSlug = options.slug || parsed.slug || parsed.name?.toLowerCase().replace(/[^a-z0-9]/g, "_") || "cloned_anchor";
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9_]/g, "").replace(/^_+|_+$/g, "");
  const name = options.name || parsed.name || "Cloned Presenter";
  const role = options.role || parsed.role || "Lead Anchor";
  const gender: "female" | "male" = options.gender || (parsed.gender === "male" ? "male" : "female");
  const language: "en" | "es" | "fr" | "it" | "de" | "pt" | "zh" | "ja" = options.language || parsed.language || "en";

  const traits: PersonaVisualTraits = {
    age: parsed.traits?.age || 32,
    heightCm: parsed.traits?.heightCm || 175,
    heightFeet: parsed.traits?.heightFeet || "5'9\"",
    weightKg: parsed.traits?.weightKg || 58,
    weightLbs: parsed.traits?.weightLbs || 128,
    skinTone: parsed.traits?.skinTone || "Fair skin tone",
    skinTexture: parsed.traits?.skinTexture || "Natural skin pores, subtle smile lines",
    hair: parsed.traits?.hair || "Styled dark brown hair",
    face: parsed.traits?.face || "Expressive eyes, natural broadcast facial features",
    build: parsed.traits?.build || (gender === "female" ? "Voluptuous hourglass build (34D bust, 25-inch waist, 37-inch hips)" : "Athletic muscular build (42-inch chest, 32-inch waist)"),
    nudeDetails: (parsed.traits?.nudeDetails as PersonaVisualTraits['nudeDetails']) || (gender === "female" ? {
      bareTorso: "Smooth flat tummy, soft feminine waist curve",
      breasts: "firm natural 34D round breasts with soft rose aureolas and erect pink nipples.",
      vulva: "Clean shaved pubic region."
    } : {
      bareTorso: "Toned chest with light hair, flat abdominal muscles",
      phallus: {
        type: "circumcised",
        flaccid: "soft flaccid anatomy (4.2 inches length, 1.3 inches girth)",
        erect: "firm erect anatomy (7.2 inches length, 1.5 inches girth)"
      }
    }),
    defaultAttire: parsed.traits?.defaultAttire || "Tailored broadcast suit blazer over top",
    defaultBackground: parsed.traits?.defaultBackground || "Broadcast television newsroom studio",
    defaultLighting: parsed.traits?.defaultLighting || "Professional 3-point broadcast studio lighting"
  };

  const persona: Persona = {
    id: slug,
    name,
    title: role,
    description: parsed.description || `Authoritative ${role} with a charismatic broadcast cadence.`,
    bio: parsed.bio || `${name} is an experienced ${role} bringing clarity, poise, and journalistic rigor to broadcast productions.`,
    systemPrompt: parsed.systemPrompt || `You are "${name}," ${role}.\n\nYour persona:\n- ${name} is an authoritative on-camera broadcast presenter.\n- Style: Clear, compelling, and poised.\n- Never break character.`,
    traits,
    avatarUrl: `/avatars/${slug}.png`,
    voiceFile: `${slug}.wav`,
    language,
    gender,
    params: {
      exaggeration: 0.6,
      cfgWeight: 0.65,
      temperature: 0.8,
      speed: 1.0,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  };

  // 2. Save Avatar & Master Archive on Disk
  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  fs.mkdirSync(avatarsDir, { recursive: true });

  const avatarLocalPath = path.join(avatarsDir, `${slug}.png`);
  const refPath = path.join(avatarsDir, `${slug}_ref.png`);
  fs.writeFileSync(avatarLocalPath, buffer);
  fs.writeFileSync(refPath, buffer);

  const masterArchiveDir = path.join(avatarsDir, `master_${slug}_archive`);
  fs.mkdirSync(masterArchiveDir, { recursive: true });
  const masterAnchorPath = path.join(masterArchiveDir, `${slug}_master_anchor.png`);
  fs.writeFileSync(masterAnchorPath, buffer);

  const voiceLocalPath = extractAndSaveVoice(options, slug);

  // 3. Register to Custom Persona File Store
  saveCustomPersona(persona);

  // 4. Register to Prisma Database (if enabled)
  const syncDb = options.syncToDatabase !== false;
  if (syncDb) {
    try {
      const companyId = options.companyId || process.env.DEFAULT_ORG_ID || "org_default_tenant";
      
      await prisma.company.upsert({
        where: { id: companyId },
        update: {},
        create: { id: companyId, name: "Default Organization", tier: "enterprise" },
      });

      const dbPersona = await prisma.persona.upsert({
        where: { slug },
        update: {
          name: persona.name,
          role: persona.title,
          gender: persona.gender,
          language: persona.language,
          description: persona.description,
          bio: persona.bio,
          systemPrompt: persona.systemPrompt,
          visualPrompt: `${traits.build}. Hair: ${traits.hair}. Face: ${traits.face}. Attire: ${traits.defaultAttire}.`,
          visualPromptNeutral: `A hyper-photorealistic close-up portrait of ${traits.age}-year-old ${persona.name}. Hair: ${traits.hair}. Face: ${traits.face}. Solid medium-grey studio backdrop.`,
          visualBodyPrompt: `${traits.age}-year-old ${persona.gender}, ${traits.heightCm}cm, ${traits.weightKg}kg. Form: ${traits.build}. Skin: ${traits.skinTone}.`,
          voiceParams: JSON.stringify(persona.params),
          styleGuidelines: parsed.styleGuidelines || `Tailored fits that complement their ${traits.build}`,
          isActive: true,
          isSystemPersona: false,
        },
        create: {
          companyId,
          slug,
          name: persona.name,
          role: persona.title,
          gender: persona.gender,
          language: persona.language,
          description: persona.description,
          bio: persona.bio,
          systemPrompt: persona.systemPrompt,
          visualPrompt: `${traits.build}. Hair: ${traits.hair}. Face: ${traits.face}. Attire: ${traits.defaultAttire}.`,
          visualPromptNeutral: `A hyper-photorealistic close-up portrait of ${traits.age}-year-old ${persona.name}. Hair: ${traits.hair}. Face: ${traits.face}. Solid medium-grey studio backdrop.`,
          visualBodyPrompt: `${traits.age}-year-old ${persona.gender}, ${traits.heightCm}cm, ${traits.weightKg}kg. Form: ${traits.build}. Skin: ${traits.skinTone}.`,
          voiceParams: JSON.stringify(persona.params),
          styleGuidelines: parsed.styleGuidelines || `Tailored fits that complement their ${traits.build}`,
          isActive: true,
          isSystemPersona: false,
        },
      });

      // Register default avatar
      await prisma.personaAvatar.create({
        data: {
          companyId,
          personaId: dbPersona.id,
          label: `${persona.name} Master Reference`,
          url: `/avatars/${slug}.png`,
          storageKey: `avatars/${slug}.png`,
          frameType: "portrait",
          isDefault: true,
          promptUsed: traits.defaultAttire,
        },
      });

      // Register default Master Image plate
      await prisma.personaMasterImage.create({
        data: {
          personaId: dbPersona.id,
          attire: traits.defaultAttire || "Signature Attire",
          poseType: "seated_desk",
          promptUsed: traits.defaultAttire,
          storageKey: `avatars/${slug}.png`,
          url: `/avatars/${slug}.png`,
          isTransparent: false,
          isDefault: true,
        },
      });
    } catch (dbErr) {
      console.warn("⚠️ Warning: Prisma DB sync for cloned persona failed (falling back to JSON store):", dbErr);
    }
  }

  const signatureAttire = {
    id: `${slug}_signature`,
    label: parsed.signatureAttire?.label || `👗 ${name} Signature Outfit`,
    description: parsed.signatureAttire?.description || traits.defaultAttire || "Professional tailored broadcast newsroom attire.",
    category: (parsed.signatureAttire?.category || "broadcast") as "broadcast" | "edgy_leather" | "gala" | "techwear" | "casual",
  };

  return {
    persona,
    avatarLocalPath,
    avatarUrl: `/avatars/${slug}.png`,
    voiceLocalPath,
    masterArchivePath: masterArchiveDir,
    signatureAttire,
    appliedTransformations: {
      rejuvenate: options.rejuvenate,
      glamourLevel: options.glamourLevel,
      genderSwap: options.genderSwap,
      bodyMod: options.bodyMod,
      outfitPreset: options.outfitPreset,
    },
    rawExtraction: parsed,
  };
}
