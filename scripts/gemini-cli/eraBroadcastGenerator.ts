/**
 * scripts/gemini-cli/eraBroadcastGenerator.ts
 *
 * Historical Era Time-Travel Anchoring Generator.
 * Synthesizes period-accurate television broadcasts (1920s, 1960s, 1980s, 2050s)
 * featuring our modern anchor personas with authentic lighting, lenses, sets, and styling.
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

export interface EraPreset {
  id: string;
  name: string;
  eraTitle: string;
  desc: string;
  wardrobe: string;
  opticsAndFilm: string;
}

export const ERA_PRESETS: Record<string, EraPreset> = {
  era_1960_apollo: {
    id: "era_1960_apollo",
    name: "🚀 1969 — Apollo Moon Landing Newsroom",
    eraTitle: "Apollo Space Race Special (July 1969)",
    desc: "A classic 1969 television broadcast newsroom during the Apollo 11 moon landing. Vintage teak wood-paneled walls, analog black-and-white CRT television monitors on rolling metal stands, mechanical typewriter and rotary phone on wooden desk, heavy vintage chrome desk microphone.",
    wardrobe: "Wearing a period-accurate 1960s tailored structured wool news suit with thin lapels and retro vintage styling.",
    opticsAndFilm: "Warm 16mm Kodachrome color film stock texture, subtle optical halation around tungsten studio key lights, authentic vintage television broadcast color science.",
  },
  era_1980_synthwave: {
    id: "era_1980_synthwave",
    name: "📼 1985 — Prime-Time Retro Synthwave News",
    eraTitle: "Evening News Special (October 1985)",
    desc: "A bold 1980s prime-time broadcast studio. Neon geometric grid lighting accents in cobalt blue and magenta, stacked CRT video wall monitors, sleek lacquered black news desk.",
    wardrobe: "Wearing an iconic 1980s power suit with bold structured padded shoulders, vibrant jewel-tone teal silk blouse, signature voluminous styled hair.",
    opticsAndFilm: "Vibrant early 1980s Betacam video tape aesthetic, rich saturated primary colors, subtle chromatic aberration and authentic CRT phosphorescence.",
  },
  era_1920_newsreel: {
    id: "era_1920_newsreel",
    name: "📻 1928 — Art Deco Radio Newsreel",
    eraTitle: "Metropolis Newsreel Bulletin (1928)",
    desc: "A 1920s Art Deco newsreel studio. Classic geometric brass and mahogany acoustic walls, large vintage Western Electric spring-suspended round carbon microphone, heavy paper teletype ticker rolls.",
    wardrobe: "Wearing an elegant 1920s tailored tweed herringbone jacket with silk scarf, classic finger-wave hairstyle.",
    opticsAndFilm: "Classic silver-gelatin monochrome black-and-white film, rich deep sepia mid-tones, organic film grain, soft vignetting, authentic 1920s silent-era cinematic lighting.",
  },
  era_2050_orbital: {
    id: "era_2050_orbital",
    name: "🛰️ 2050 — Low-Earth Orbit Station News Deck",
    eraTitle: "Orbital Global Feed (Year 2050)",
    desc: "A futuristic 2050 orbital news deck aboard an international space station. Massive curved panoramic observation window showing the blue curve of planet Earth and glowing city night lights below, floating transparent holographic telemetry pillars, sleek matte titanium anchor console.",
    wardrobe: "Wearing a sleek high-tech carbon-fiber broadcast jumpsuit with magnetic collar and glowing subtle micro-LED telemetry trim.",
    opticsAndFilm: "Pristine modern anamorphic 8k digital cinematography, anamorphic horizontal lens flare, razor-sharp holographic bloom, neutral 6500K deep-space lighting.",
  },
};

export interface EraBroadcastOptions {
  persona: Persona;
  presetKey?: string;
  aspectRatio?: string;
  engine?: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  destPath?: string;
}

export function compileEraPrompt(persona: Persona, preset: EraPreset, aspectRatio: string = "16:9"): string {
  const t = persona.traits;
  const genderTag = persona.gender === "male" ? "man, male news anchor" : "woman, female news anchor";
  const hairstyle = resolveHairstylePrompt(persona, "signature");

  const aspectHeader = aspectRatio === "4:3"
    ? "A 4:3 vintage CRT television broadcast master photograph"
    : "A 16:9 television broadcast master photograph";

  return `${aspectHeader} set in the historical era of ${preset.eraTitle} featuring ${persona.name}:
[IDENTITY & FACIAL CONTINUITY]:
• Use Reference 1 ONLY to match the authentic face, eye color, ${t.face}, and ${t.skinTone || "natural skin tone"} of ${persona.name}.
• DO NOT copy modern styling, modern suit, or plain studio background of Reference 1.

[HISTORICAL ERA SET & ENVIRONMENT]:
• ${preset.desc}

[PERIOD ATTIRE & STYLING]:
• ${preset.wardrobe}
• Hairstyle adapted authentically for ${preset.eraTitle}.

[OPTICS, LIGHTING & FILM AESTHETICS]:
• ${preset.opticsAndFilm}
• Master broadcast cinematography, historical authenticity, pristine 8k image quality.`;
}

export async function runEraBroadcastGenerator(options: EraBroadcastOptions): Promise<string | null> {
  const persona = options.persona;
  const presetKey = options.presetKey || "era_1960_apollo";
  const preset = ERA_PRESETS[presetKey] || ERA_PRESETS.era_1960_apollo;
  const aspectRatio = options.aspectRatio || "16:9";
  const prompt = compileEraPrompt(persona, preset, aspectRatio);
  const baseName = `era_${preset.id}_${persona.id}_master`;

  const outputDir = path.join(
    process.cwd(),
    "public",
    "avatars",
    `master_${persona.id}_archive`,
    "era_broadcasts"
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const finalDest = options.destPath || path.join(outputDir, `${baseName}.jpg`);
  const avatarRef = resolvePersonaAvatarPath(persona);
  const imagePaths = avatarRef && fs.existsSync(avatarRef) ? [avatarRef] : [];

  console.log("\n==================================================================");
  console.log("⏳ HISTORICAL ERA TIME-TRAVEL BROADCAST GENERATOR");
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${persona.id}]`);
  console.log(`Era Preset:   ${preset.name}`);
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
    aspectRatio,
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
    console.log(`\n✅ Historical Era Broadcast Scene Generated & Saved!`);
    console.log(`📁 File: file:///${finalDest.replace(/\\/g, "/")}\n`);
    return finalDest;
  }

  return null;
}
