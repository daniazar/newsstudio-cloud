/**
 * scripts/gemini-cli/seasonalWardrobeGenerator.ts
 *
 * 4-Season Persona Wardrobe Matrix Generator.
 * Synthesizes seasonal wardrobe collections (Spring, Summer, Autumn, Winter)
 * preserving authentic persona likeness while adapting textures, fabrics, colors, and lighting.
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

export interface SeasonPreset {
  id: string;
  name: string;
  season: "spring" | "summer" | "autumn" | "winter";
  wardrobeDesc: string;
  palette: string;
  lightingAndAtmosphere: string;
}

export const SEASON_PRESETS: Record<string, SeasonPreset> = {
  season_spring: {
    id: "season_spring",
    name: "🌸 Spring — Pastel Silk & Linen Tailoring",
    season: "spring",
    wardrobeDesc: "Wearing a refined pastel lilac silk blouse with delicate draped neckline and tailored ivory linen blazer.",
    palette: "Pastel lilac, ivory white, sage green accents, delicate fresh color harmony.",
    lightingAndAtmosphere: "Soft 5400K morning spring daylight, airy luminous studio background, gentle natural skin radiance.",
  },
  season_summer: {
    id: "season_summer",
    name: "☀️ Summer — Sleeveless Sheath & Crisp Linen",
    season: "summer",
    wardrobeDesc: "Wearing an elegant sleeveless cobalt and crisp white color-block tailored sheath dress with gold minimalist jewelry.",
    palette: "Vibrant royal cobalt blue, crisp bright white, warm sun-kissed golden accents.",
    lightingAndAtmosphere: "Bright high-key summer daylight illumination, crisp high-contrast rim light separating shoulders.",
  },
  season_autumn: {
    id: "season_autumn",
    name: "🍂 Autumn — Structured Wool Trench & Cashmere",
    season: "autumn",
    wardrobeDesc: "Wearing a rich burgundy cashmere turtleneck under a tailored double-breasted camel wool trench coat with horn buttons.",
    palette: "Rich burgundy, deep camel, warm terracotta, warm amber hues.",
    lightingAndAtmosphere: "Warm 3400K golden hour directional lighting, soft autumn foliage blurred in the studio window.",
  },
  season_winter: {
    id: "season_winter",
    name: "❄️ Winter — Heavy Cashmere & Velvet Gala Lapels",
    season: "winter",
    wardrobeDesc: "Wearing an architectural midnight navy tailored blazer with structured dark velvet lapels and silver silk scarf.",
    palette: "Midnight navy, emerald velvet, charcoal wool, icy platinum silver accents.",
    lightingAndAtmosphere: "Crisp cool 5800K winter broadcast key light with soft icy blue ambient backlighting.",
  },
};

export interface SeasonalWardrobeOptions {
  persona: Persona;
  seasonKey?: string;
  count?: number;
  aspectRatio?: string;
  engine?: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  destPath?: string;
}

export function compileSeasonalPrompt(persona: Persona, preset: SeasonPreset): string {
  const t = persona.traits;
  const genderTag = persona.gender === "male" ? "man, male news anchor" : "woman, female news anchor";
  const hairstyle = resolveHairstylePrompt(persona, "signature");

  return `A master 9:16 vertical broadcast studio portrait showcasing seasonal wardrobe for ${persona.name}:
[IDENTITY & FACIAL CONTINUITY]:
• Use Reference 1 ONLY to match the authentic face, eye color, ${t.face}, ${t.skinTone || "natural skin tone"}, and ${hairstyle} of ${persona.name}.
• DO NOT copy the original outfit or crop of Reference 1.

[SEASONAL WARDROBE & STYLING]:
• Season: ${preset.name}
• ${preset.wardrobeDesc}
• Color Palette: ${preset.palette}

[ATMOSPHERE & LIGHTING]:
• ${preset.lightingAndAtmosphere}
• Professional broadcast studio backdrop, sharp 8k raw photo texture, natural fabric weaves.`;
}

export async function runSeasonalWardrobeGenerator(options: SeasonalWardrobeOptions): Promise<string | null> {
  const persona = options.persona;
  const seasonKey = options.seasonKey || "season_spring";
  const preset = SEASON_PRESETS[seasonKey] || SEASON_PRESETS.season_spring;
  const prompt = compileSeasonalPrompt(persona, preset);
  const baseName = `seasonal_${preset.id}_${persona.id}_master`;

  const outputDir = path.join(
    process.cwd(),
    "public",
    "avatars",
    `master_${persona.id}_archive`,
    "seasonal_wardrobe"
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const finalDest = options.destPath || path.join(outputDir, `${baseName}.jpg`);
  const avatarRef = resolvePersonaAvatarPath(persona);
  const imagePaths = avatarRef && fs.existsSync(avatarRef) ? [avatarRef] : [];

  console.log("\n==================================================================");
  console.log("👗 4-SEASON PERSONA WARDROBE MATRIX GENERATOR");
  console.log("==================================================================");
  console.log(`Persona:      ${persona.name} [${persona.id}]`);
  console.log(`Season:       ${preset.name}`);
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
    aspectRatio: "9:16",
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
    console.log(`\n✅ Seasonal Wardrobe Master Generated & Saved!`);
    console.log(`📁 File: file:///${finalDest.replace(/\\/g, "/")}\n`);
    return finalDest;
  }

  return null;
}
