/**
 * scripts/gemini-cli/thumbnailGenerator.ts
 *
 * High-CTR YouTube & Social Media Viral Thumbnail Generator.
 * Composes emotionally arresting 16:9 widescreen or 9:16 vertical thumbnails with:
 *   - High-contrast expressive anchor facial reactions (Shock, Secret, Joy, Warning, Disbelief)
 *   - Clean negative space reserved for graphic text overlays
 *   - Cinematic rim lighting and vibrant, high-saturation color grading
 */

import { Persona } from "../../src/lib/tts/personas";
import { PersonaAttire, CompiledScenePrompt } from "./types";
import { resolvePersonaAvatarPath, getPersonaAttires } from "./personaAttires";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";

export interface ThumbnailHookPreset {
  id: string;
  name: string;
  expression: string;
  backdrop: string;
  lighting: string;
  compositionNotes: string;
}

export const THUMBNAIL_HOOK_PRESETS: Record<string, ThumbnailHookPreset> = {
  breaking_shock: {
    id: "breaking_shock",
    name: "😱 Breaking News Shock / Jaw-Drop (Emergency Alert)",
    expression: "shocked, intense wide eyes, jaw slightly dropped, hands raised near chest in authentic visceral disbelief",
    backdrop: "glowing neon red and amber broadcast studio backdrop with dramatic blurred breaking news emergency graphics in background bokeh",
    lighting: "high-contrast cinematic rim lighting with dramatic red edge highlights and bright 5600K key light on face",
    compositionNotes: "Anchor positioned on the RIGHT side of the frame with intense expressive reaction, leaving the entire LEFT half of the 16:9 widescreen frame completely open with clean negative space for huge bold text headline overlay",
  },
  secret_mystery: {
    id: "secret_mystery",
    name: "🔍 Secret Exposed / Investigative Mystery (Curiosity Gap)",
    expression: "conspiratorial, leaning slightly forward, one raised eyebrow, intense direct eye contact, index finger tapped thoughtfully against chin",
    backdrop: "dark moody investigative room with blurred holographic financial candlestick charts and glowing blueprint wireframes floating in dark blue background",
    lighting: "dramatic cyan and deep violet cinematic split lighting with sharp facial contours and crisp rim light",
    compositionNotes: "Anchor on LEFT side of frame in sharp focus, leaving the entire RIGHT half with dark clean negative space for text and floating topic badge",
  },
  bullish_triumph: {
    id: "bullish_triumph",
    name: "🚀 Bullish Triumph / Wealth Explosion (Green Candle Euphoria)",
    expression: "ecstatic, triumphant broad winning smile, confident direct gaze, fist pumped slightly forward with victorious energy",
    backdrop: "vibrant glowing emerald green stock market charts soaring upwards with golden light particles and green bokeh flares",
    lighting: "radiant warm golden key light with bright emerald green rim light on shoulders and hair",
    compositionNotes: "Anchor centered-left with energetic forward posture, leaving the upper-right open for 10x / BIG PROFIT typography",
  },
  dire_warning: {
    id: "dire_warning",
    name: "⚠️ Dire Warning / Catastrophic Crash (Red Alert Danger)",
    expression: "grave, dead-serious warning expression, furrowed brow, urgent pointing gesture directed towards viewer",
    backdrop: "dramatic stormy crimson dark skies with cracked digital glass and red warning hazard icons in soft blur",
    lighting: "harsh high-contrast top lighting with intense red under-glow reflecting off collarbones and jaw",
    compositionNotes: "Anchor in tight dramatic framing on the RIGHT, leaving the LEFT half completely uncluttered for WARNING headline banner",
  },
  skeptical_disbelief: {
    id: "skeptical_disbelief",
    name: "🤨 Skeptical Disbelief / Fact-Check Callout (Exposing Lies)",
    expression: "smirking skeptically, head tilted slightly, squinted analytical eyes, holding digital tablet showing highlighted evidence",
    backdrop: "modern newsroom investigation desk with blurred red 'FALSE' verification stamps and digital documents in background",
    lighting: "clean bright 5600K high-key daylight with subtle cool blue shadow fill",
    compositionNotes: "Anchor on the LEFT pointing thumb back towards the RIGHT negative space where proof / comparison cards will sit",
  },
};

export interface ThumbnailOptions {
  persona: Persona;
  attire?: PersonaAttire;
  hookPresetKey?: string;
  customHeadlineHook?: string;
  headlineTopic?: string;
  hairstyleKey?: string;
  aspectRatio?: "16:9" | "9:16";
  engine: "agy" | "api" | "tool_json";
  imageName?: string;
  dryRun?: boolean;
  preview?: boolean;
}

export function compileThumbnailScene(options: ThumbnailOptions): CompiledScenePrompt {
  const {
    persona,
    hookPresetKey = "breaking_shock",
    hairstyleKey = "signature",
    aspectRatio = "16:9",
  } = options;

  const hook = THUMBNAIL_HOOK_PRESETS[hookPresetKey] || THUMBNAIL_HOOK_PRESETS.breaking_shock;
  const hair = resolveHairstylePrompt(persona, hairstyleKey);
  const headline = options.customHeadlineHook || options.headlineTopic || "Major breaking world news revelation";
  const avatarPath = resolvePersonaAvatarPath(persona);

  const attireDesc = options.attire?.description || (persona.traits.defaultAttire || (persona.traits as any).wardrobe || "tailored high-end broadcast attire");

  const prompt = `A brand new ${aspectRatio} widescreen high-CTR viral YouTube video thumbnail cover about "${headline}":
Use Reference 1 ONLY to match the facial likeness, ${hair}, eye color, and ${persona.traits.skinTone || "natural skin tone"} of ${persona.name} (${persona.traits.face}).
DO NOT copy the centered headshot pose or grey background of Reference 1.

SCENE & COMPOSITION:
• ${persona.name} is positioned on the far RIGHT side of the ${aspectRatio} frame, leaning forward with an expressive viral hook: ${hook.expression}.
• Wardrobe: Dressed in ${attireDesc}.
• Negative Space & Background: The entire LEFT half of the ${aspectRatio} image features clean dark negative space for huge text overlay, with ${hook.backdrop}.
• Lighting & Contrast: ${hook.lighting}. Highly saturated vibrant colors, sharp contrast separation between subject and background.
• Master YouTube cover art photography, 8k ultra-sharp detail, crisp edge definition, raw photo quality.`;

  const baseName = options.imageName || `thumb_${persona.id}_${hookPresetKey}_${Date.now().toString().slice(-6)}`;

  return {
    prompt,
    imagePaths: avatarPath ? [avatarPath] : [],
    baseName,
    aspectRatio,
  };
}


export async function runThumbnailMode(options: ThumbnailOptions): Promise<string | null> {
  const attire = options.attire || (await getPersonaAttires(options.persona))[0] || {
    id: "default",
    label: "Signature Broadcast Attire",
    description: options.persona.traits.defaultAttire || "tailored prime-time broadcast attire",
  };

  const hook = THUMBNAIL_HOOK_PRESETS[options.hookPresetKey || "breaking_shock"] || THUMBNAIL_HOOK_PRESETS.breaking_shock;
  const headline = options.customHeadlineHook || options.headlineTopic || "NVIDIA REVEALS NEXT-GEN QUANTUM AI CHIP";

  console.log("\n==================================================================");
  console.log("🚨 HIGH-CTR YOUTUBE / SOCIAL THUMBNAIL COVER GENERATOR");
  console.log("==================================================================");
  console.log(`Persona:      ${options.persona.name} [${options.persona.id}]`);
  console.log(`Attire:       ${attire.label}`);
  console.log(`Hook Style:   ${hook.name}`);
  console.log(`Topic:        ${headline}`);
  console.log(`Aspect Ratio: ${options.aspectRatio || "16:9"}`);
  console.log(`Engine:       ${options.engine.toUpperCase()}\n`);

  const compiled = compileThumbnailScene({
    ...options,
    attire,
    customHeadlineHook: headline,
  });

  console.log(`Image Name:   ${compiled.baseName}`);
  console.log(`\nPrompt:\n"${compiled.prompt}"\n`);

  if (options.dryRun) {
    console.log("ℹ️ [DRY-RUN] Thumbnail prompt compiled successfully without invoking generator.\n");
    return null;
  }

  let generatedPath: string | null = null;
  if (options.engine === "agy") {
    generatedPath = await runWithAgy(compiled);
  } else if (options.engine === "api") {
    generatedPath = await runWithApi(compiled);
  } else {
    outputToolJson(compiled);
  }

  if (generatedPath && options.preview) {
    await renderTerminalImagePreview(generatedPath, 64);
  }

  return generatedPath;
}
