/**
 * scripts/gemini-cli/magazineCoverGenerator.ts
 *
 * Editorial Magazine Cover & Press Kit Builder.
 * Synthesizes high-impact editorial magazine covers (TIME, Forbes, WIRED, Vogue)
 * featuring our virtual news anchors for brand storytelling, social media hype, and on-air props.
 */

import fs from "fs";
import path from "path";
import { Persona } from "../../src/lib/tts/personas";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";

export interface MagazinePreset {
  id: string;
  name: string;
  publication: string;
  headline: string;
  desc: string;
  styling: string;
}

export const MAGAZINE_PRESETS: Record<string, MagazinePreset> = {
  time_person_of_the_year: {
    id: "time_person_of_the_year",
    name: "🏆 TIME — Person of the Year Cover",
    publication: "TIME",
    headline: "THE NEW VOICE OF TRUTH: HOW AI BROADCASTING CHANGED GLOBAL JOURNALISM",
    desc: "An iconic TIME Magazine Person of the Year front cover portrait. Iconic red border framing, bold iconic masthead typography. Serious, authoritative, penetrating gaze into the camera lens.",
    styling: "Dramatic Rembrandt studio portrait lighting, dark minimalist background, razor-sharp eye catchlights, tailored executive wool coat, timeless prestige editorial aesthetic.",
  },
  wired_ai_future: {
    id: "wired_ai_future",
    name: "⚡ WIRED — The Autonomous Media Revolution",
    publication: "WIRED",
    headline: "SYNTHETIC ANCHORS, INFINITE REACH: THE 24/7 AUTONOMOUS NEWSROOM",
    desc: "A futuristic WIRED Magazine front cover. High-contrast neon cyan and magenta rim lighting, subtle cybernetic holographic glitch elements, forward-thinking visionary posture.",
    styling: "Sleek matte black architectural techwear blazer, sharp jawline focus, cutting-edge typography layout, high-fashion tech editorial finish.",
  },
  forbes_visionary_leader: {
    id: "forbes_visionary_leader",
    name: "💼 Forbes — The Next-Gen Media Visionary",
    publication: "Forbes",
    headline: "THE 100 BILLION DOLLAR BROADCAST SHIFT: THE ARCHITECT OF AUTONOMOUS NEWS",
    desc: "A prestigious Forbes Business Magazine cover. Confident, charismatic executive smile, arms loosely folded in powerful CEO posture, luxury glass boardroom penthouse in soft background blur.",
    styling: "Tailored bespoke navy pantsuit with crisp white silk lapels, warm golden executive lighting, ultra-clean commercial portrait finish.",
  },
  vogue_broadcast_couture: {
    id: "vogue_broadcast_couture",
    name: "✨ Vogue — High-Fashion Prime-Time Couture",
    publication: "VOGUE",
    headline: "THE ART OF ON-AIR ELEGANCE: MODERN BROADCAST HAUTE COUTURE",
    desc: "A high-fashion Vogue front cover portrait. Dramatic sculptural couture neckline, flawless porcelain skin texture, artistic editorial head tilt, timeless high-fashion aesthetic.",
    styling: "Luxury emerald green velvet gown with architectural shoulders, soft ring-light beauty illumination, soft blurred studio background.",
  },
};

export interface MagazineCoverOptions {
  persona: Persona;
  presetKey?: string;
  customHeadline?: string;
  aspectRatio?: string;
  engine?: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  destPath?: string;
}

export function compileMagazinePrompt(
  persona: Persona,
  preset: MagazinePreset,
  customHeadline?: string
): string {
  const t = persona.traits;
  const genderTag = persona.gender === "male" ? "man, male news anchor" : "woman, female news anchor";
  const hairstyle = resolveHairstylePrompt(persona, "signature");
  const headline = customHeadline || preset.headline;

  return `A high-end 3:4 vertical editorial magazine front cover master photograph featuring ${persona.name}:
[IDENTITY & FACIAL CONTINUITY]:
• Use Reference 1 ONLY to match the authentic face, eye color, ${t.face}, ${t.skinTone || "natural skin tone"}, and ${hairstyle} of ${persona.name}.
• DO NOT copy the passport headshot crop or plain background of Reference 1.

[EDITORIAL COVER CONCEPT & MAGAZINE STYLING]:
• Publication Format: Authentic ${preset.publication} front cover layout with elegant magazine masthead, headline banners, and barcode details.
• Headline: "${headline}"
• ${preset.desc}
• Attire & Lighting: ${preset.styling}

[QUALITY & OPTICS]:
• Shot on Hasselblad H6D-100c with 100mm f/2.2 portrait lens, natural skin pore detail, flawless color grading, 8k raw commercial magazine quality.`;
}

export async function runMagazineCoverGenerator(options: MagazineCoverOptions): Promise<string | null> {
  const persona = options.persona;
  const presetKey = options.presetKey || "time_person_of_the_year";
  const preset = MAGAZINE_PRESETS[presetKey] || MAGAZINE_PRESETS.time_person_of_the_year;
  const prompt = compileMagazinePrompt(persona, preset, options.customHeadline);
  const baseName = `magazine_${preset.id}_${persona.id}_master`;

  const outputDir = path.join(
    process.cwd(),
    "public",
    "avatars",
    `master_${persona.id}_archive`,
    "press_kit"
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const finalDest = options.destPath || path.join(outputDir, `${baseName}.jpg`);
  const avatarRef = resolvePersonaAvatarPath(persona);
  const imagePaths = avatarRef && fs.existsSync(avatarRef) ? [avatarRef] : [];

  console.log("\n==================================================================");
  console.log("📰 EDITORIAL MAGAZINE COVER & PRESS KIT BUILDER");
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${persona.id}]`);
  console.log(`Magazine:     ${preset.name}`);
  console.log(`Engine:       ${(options.engine || "agy").toUpperCase()}`);
  console.log(`Destination:  ${finalDest}\n`);

  if (options.dryRun) {
    console.log(`[DRY-RUN] Compiled Prompt:\n${prompt}\n`);
    return null;
  }

  const compiled: CompiledScenePrompt = {
    prompt,
    imagePaths,
    baseName,
    aspectRatio: "3:4",
  };

  let generatedPath: string | null = null;
  if (options.engine === "api") {
    generatedPath = await runWithApi(compiled);
  } else if (options.engine === "tool_json") {
    outputToolJson(compiled);
    return null;
  } else {
    generatedPath = await runWithAgy(compiled);
  }

  if (generatedPath && fs.existsSync(generatedPath)) {
    fs.copyFileSync(generatedPath, finalDest);
    console.log(`\n✅ Editorial Magazine Cover Generated & Saved!`);
    console.log(`📁 File: file:///${finalDest.replace(/\\/g, "/")}\n`);
    return finalDest;
  }

  return null;
}
