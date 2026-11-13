/**
 * src/lib/thumbnail/thumbnailPresets.ts
 *
 * Client-safe definitions, presets, CTR formulas, and prompt compiler for NewsStudio thumbnails.
 * Contains zero Node.js filesystem or native dependencies to allow safe importing in client components.
 */

import { Persona } from "@/lib/tts/personas";

export interface HookPreset {
  id: string;
  name: string;
  expression: string;
  backdrop: string;
  lighting: string;
  badgeStyle: string;
  defaultHeadline: string;
  ctrBonus: number;
}

export const HOOK_PRESETS: HookPreset[] = [
  {
    id: "breaking_shock",
    name: "😱 Breaking News Shock / Jaw-Drop",
    expression: "shocked, intense wide eyes, jaw slightly dropped, hands raised near chest in authentic visceral disbelief",
    backdrop: "glowing neon red and amber broadcast studio backdrop with dramatic blurred breaking news emergency graphics in background bokeh",
    lighting: "high-contrast cinematic rim lighting with dramatic red edge highlights and bright 5600K key light on face",
    badgeStyle: "bg-red-600 text-white font-black shadow-red-600/40",
    defaultHeadline: "BREAKING: REVOLUTIONARY AI BREAKTHROUGH ANNOUNCED",
    ctrBonus: 1.8,
  },
  {
    id: "secret_mystery",
    name: "🔍 Secret Exposed / Investigative Mystery",
    expression: "conspiratorial, leaning slightly forward, one raised eyebrow, intense direct eye contact, index finger tapped thoughtfully against chin",
    backdrop: "dark moody investigative newsroom with holographic financial candlestick charts and glowing blueprint wireframes in deep blue bokeh",
    lighting: "dramatic cyan and deep violet cinematic split lighting with sharp facial contours and crisp rim light",
    badgeStyle: "bg-indigo-600 text-white font-black shadow-indigo-600/40",
    defaultHeadline: "THE UNFILTERED TRUTH BEHIND 45% ENTERPRISE ADOPTION",
    ctrBonus: 1.4,
  },
  {
    id: "bullish_triumph",
    name: "🚀 Bullish Triumph / Wealth Explosion",
    expression: "ecstatic, triumphant broad winning smile, confident direct gaze, fist pumped slightly forward with victorious energy",
    backdrop: "vibrant glowing emerald green stock market charts soaring upwards with golden light particles and green bokeh flares",
    lighting: "radiant warm golden key light with bright emerald green rim light on shoulders and hair",
    badgeStyle: "bg-emerald-600 text-white font-black shadow-emerald-600/40",
    defaultHeadline: "10X GAINS: HOW THIS DISRUPTION CRUSHED EXPECTATIONS",
    ctrBonus: 1.6,
  },
  {
    id: "dire_warning",
    name: "⚠️ Dire Warning / Catastrophic Alert",
    expression: "grave, dead-serious warning expression, furrowed brow, urgent pointing gesture directed towards viewer",
    backdrop: "dramatic stormy crimson dark skies with cracked digital glass and red warning hazard icons in soft blur",
    lighting: "harsh high-contrast top lighting with intense red under-glow reflecting off collarbones and jaw",
    badgeStyle: "bg-amber-500 text-black font-black shadow-amber-500/40",
    defaultHeadline: "CRITICAL SYSTEM WARNING: IMMINENT MARKET IMPACT",
    ctrBonus: 1.5,
  },
  {
    id: "skeptical_disbelief",
    name: "🤨 Skeptical Disbelief / Fact-Check",
    expression: "smirking skeptically, head tilted slightly, squinted analytical eyes, holding digital tablet showing highlighted evidence",
    backdrop: "modern newsroom investigation desk with blurred red 'FALSE' verification stamps and digital documents in background",
    lighting: "clean bright 5600K high-key daylight with subtle cool blue shadow fill",
    badgeStyle: "bg-sky-600 text-white font-black shadow-sky-600/40",
    defaultHeadline: "FACT CHECK: ARE THE NEW CLAIMS ACTUALLY TRUE?",
    ctrBonus: 1.2,
  },
  {
    id: "tech_futurism",
    name: "🤖 Next-Gen Tech / AI Vision",
    expression: "awe-inspired, focused forward look, visionary expression, hands gesturing towards translucent glowing data streams",
    backdrop: "ultra-modern high-tech glass studio with neon cyan fiber optics, holographic quantum processors and clean dark background",
    lighting: "dual cyan-teal key lighting with sharp magenta rim light and subtle glass reflections",
    badgeStyle: "bg-cyan-500 text-black font-black shadow-cyan-500/40",
    defaultHeadline: "NEXT-GEN QUANTUM COMPUTING UNVEILED",
    ctrBonus: 1.3,
  },
];

export const DEFAULT_NEGATIVE_PROMPT =
  "nsfw, nude, naked, cleavage, bad anatomy, deformed fingers, extra limbs, extra hands, mutated face, blurry, low resolution, jpeg artifacts, watermark, logo, amateur photo, cartoon, 3d render, illustration, distorted text, grainy, overexposed, underexposed";

/**
 * Enforces production-safe, broadcast-clean filtering by removing NSFW and vulgar tokens.
 */
export function sanitizeBroadcastPrompt(text?: string): string {
  if (!text) return "";
  return text
    .replace(
      /\b(nude|naked|uncensored|nsfw|sex|doggystyle|blowjob|fellatio|creampie|cowgirl|missionary|penetration|futanari|futa|\bts\b|shemale|ladyboy|neovulva|tucked|transgender|penis|vulva|breasts|genitals|erotic|intimate|anal|topless|bottomless|bare_skin|unclothed|phallus|oral|ejaculation|orgasm|nipples|areola|clitoral|submissive|kneeling|titfuck|paizuri|intercourse|porn|porno|fetish|lewd|obscene|gore|vulgar|vulgarity)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Predicts the viral Click-Through Rate (CTR) percentage based on headline clarity,
 * emotional hook archetype, topic badge inclusion, and negative space composition.
 */
export function calculatePredictedCtr(params: {
  headline: string;
  hookId: string;
  badgeText?: string;
  subtext?: string;
  textPosition?: string;
  aspectRatio?: string;
}): number {
  const { headline, hookId, badgeText, subtext, textPosition, aspectRatio } = params;

  let base = 8.4;
  const cleanHeadline = headline.trim();

  // Headline bonus / penalty
  if (cleanHeadline.length >= 10 && cleanHeadline.length <= 45) {
    base += 2.0;
  } else if (cleanHeadline.length > 45) {
    base += 0.5; // Overcrowded
  } else if (cleanHeadline.length > 0) {
    base += 1.0;
  }

  // Hook archetype bonus
  const hook = HOOK_PRESETS.find((h) => h.id === hookId) || HOOK_PRESETS[0];
  base += hook.ctrBonus;

  // Topic badge bonus
  if (badgeText && badgeText.trim().length > 0) {
    base += 1.2;
  }

  // Subtext context bonus
  if (subtext && subtext.trim().length > 0) {
    base += 0.6;
  }

  // Negative space alignment
  if (textPosition === "left") {
    base += 0.4; // Traditional Western reading flow (text left, face right)
  }

  // Aspect ratio baseline
  if (aspectRatio === "16:9") {
    base += 0.2;
  }

  // Clamp between 5.0% and 18.5%
  return Math.min(18.5, Math.max(5.0, Number(base.toFixed(1))));
}

export interface ThumbnailPromptConfig {
  persona: Persona;
  hookPresetKey?: string;
  headline?: string;
  subtext?: string;
  badgeText?: string;
  aspectRatio?: "16:9" | "9:16";
  textPosition?: "left" | "right";
  engine?: string;
}

export interface CompiledThumbnailPrompt {
  prompt: string;
  negativePrompt: string;
  hook: HookPreset;
  persona: Persona;
  aspectRatio: "16:9" | "9:16";
  textPosition: "left" | "right";
  width: number;
  height: number;
  baseName: string;
  predictedCtr: number;
}

/**
 * Builds a broadcast-safe, high-contrast studio prompt configured for negative space text overlay.
 */
export function buildBroadcastCleanThumbnailPrompt(config: ThumbnailPromptConfig): CompiledThumbnailPrompt {
  const persona = config.persona;
  const hook = HOOK_PRESETS.find((h) => h.id === config.hookPresetKey) || HOOK_PRESETS[0];
  const aspectRatio = config.aspectRatio || "16:9";
  const textPosition = config.textPosition || "left";
  const rawHeadline = config.headline || hook.defaultHeadline;
  const cleanHeadline = sanitizeBroadcastPrompt(rawHeadline);

  const anchorPosition = textPosition === "left" ? "far RIGHT" : "far LEFT";
  const negativeSpacePosition = textPosition === "left" ? "LEFT" : "RIGHT";

  const wardrobe = persona.traits?.defaultAttire || "tailored broadcast news blazer and clean studio wardrobe";
  const hair = persona.traits?.hair || "neatly styled hair";
  const skinTone = persona.traits?.skinTone || "natural skin tone";
  const faceDesc = persona.traits?.face || "professional anchor";

  const isWidescreen = aspectRatio === "16:9";
  const width = isWidescreen ? 1280 : 768;
  const height = isWidescreen ? 720 : 1344;

  const prompt = [
    `A brand new ${aspectRatio} high-CTR viral video thumbnail cover about "${cleanHeadline}":`,
    `Subject: ${persona.name} (${faceDesc}, ${hair}, ${skinTone}), looking directly towards camera with emotional reaction.`,
    `Wardrobe: ${wardrobe}.`,
    `Expression & Pose: ${persona.name} is positioned on the ${anchorPosition} side of the frame, ${hook.expression}.`,
    `Composition & Negative Space: The entire ${negativeSpacePosition} side of the ${aspectRatio} frame features clean, high-contrast dark negative space reserved for graphic text overlay.`,
    `Backdrop: ${hook.backdrop}.`,
    `Lighting: ${hook.lighting}. Highly saturated vibrant colors, sharp contrast separation between subject and background.`,
    `Style & Quality: Master broadcast studio photography, 8k ultra-sharp detail, Hasselblad H6D-100c, photorealistic skin texture, crisp edge definition, broadcast television standard.`,
  ].join(" ");

  const baseName = `thumb_${persona.id}_${hook.id}_${Date.now().toString().slice(-6)}`;
  const predictedCtr = calculatePredictedCtr({
    headline: cleanHeadline,
    hookId: hook.id,
    badgeText: config.badgeText,
    subtext: config.subtext,
    textPosition,
    aspectRatio,
  });

  return {
    prompt,
    negativePrompt: DEFAULT_NEGATIVE_PROMPT,
    hook,
    persona,
    aspectRatio,
    textPosition,
    width,
    height,
    baseName,
    predictedCtr,
  };
}

export interface ThumbnailGenerateRequest {
  personaId?: string;
  hookPresetKey?: string;
  headline?: string;
  subtext?: string;
  badgeText?: string;
  aspectRatio?: "16:9" | "9:16";
  textPosition?: "left" | "right";
  engine?: "comfy" | "sdxl" | "flux" | "z_image" | "turbo" | "auto";
  customPrompt?: string;
  negativePrompt?: string;
  seed?: number;
  dryRun?: boolean;
}

export interface ThumbnailGenerateResult {
  success: boolean;
  imageUrl: string;
  prompt: string;
  negativePrompt: string;
  baseName: string;
  aspectRatio: "16:9" | "9:16";
  textPosition: "left" | "right";
  predictedCtr: number;
  hook: HookPreset;
  persona: {
    id: string;
    name: string;
    title: string;
    avatarUrl: string;
  };
  seed: number;
  engine: string;
  source: "comfyui" | "fallback";
  message?: string;
}
