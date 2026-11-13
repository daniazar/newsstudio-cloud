/**
 * scripts/gemini-cli/skyboxGenerator.ts
 *
 * 360° Virtual Studio Cyclorama & Skybox Panorama Generator.
 * Synthesizes ultra-wide equirectangular and panoramic studio set plates (zero people)
 * for use in 3D camera sweeps, crane shots, and Remotion 3D backdrops.
 */

import fs from "fs";
import path from "path";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";

export interface SkyboxPreset {
  id: string;
  name: string;
  desc: string;
  lighting: string;
}

export const SKYBOX_PRESETS: Record<string, SkyboxPreset> = {
  breaking_news_hq_360: {
    id: "breaking_news_hq_360",
    name: "🚨 360° Breaking News Command Center",
    desc: "An ultra-wide panoramic 360-degree broadcast studio command center. Curved seamless 360-degree LED video screens showing global data streams, polished mirror-black reflection floor, recessed perimeter lighting, curved anchor desk platform in center, modern architectural ceiling trusses. Zero people in scene.",
    lighting: "High-contrast emergency crimson and cool white 5600K broadcast key lighting, pristine sharp architectural reflections.",
  },
  futuristic_tokyo_skyline_360: {
    id: "futuristic_tokyo_skyline_360",
    name: "🌧️ 360° Penthouse Rainy Tokyo Skyline",
    desc: "An ultra-wide panoramic luxury broadcast penthouse studio with 360-degree floor-to-ceiling glass windows overlooking a rain-slicked neon Tokyo metropolis at midnight. Elegant walnut acoustic slat walls, integrated ambient bronze light strips, minimalist modern furniture, wet raindrop streaks on glass. Zero people in scene.",
    lighting: "Warm 3200K interior amber glow contrasting with moody exterior neon cyan and magenta city rain reflections.",
  },
  presidential_national_broadcast_360: {
    id: "presidential_national_broadcast_360",
    name: "🏛️ 360° Presidential National Broadcast Hall",
    desc: "An ultra-wide monumental national news broadcast auditorium. Curved neoclassical fluted pillars, frosted acrylic accents, sweeping deep navy and gold architectural lighting ribbons, dual presidential briefing lecterns, state-of-the-art broadcast telemetry screens. Zero people in scene.",
    lighting: "Authoritative 5600K balanced daylight illumination, subtle gold rim lighting on architectural pillars.",
  },
  cyberpunk_crypto_floor_360: {
    id: "cyberpunk_crypto_floor_360",
    name: "🌆 360° Cyberpunk Crypto Trading Deck",
    desc: "An ultra-wide panoramic cyberpunk financial broadcast floor. Transparent holographic candlestick telemetry pillars, floating neon blockchain volume charts, polished obsidian floor, panoramic view of futuristic skyscraper canyon. Zero people in scene.",
    lighting: "Volumetric neon cyan and electric violet lighting, razor-sharp holographic bloom, deep shadow contrast.",
  },
};

export interface SkyboxGeneratorOptions {
  presetKey?: string;
  customPrompt?: string;
  aspectRatio?: "16:9" | "3:2";
  engine?: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  destPath?: string;
}

export function compileSkyboxPrompt(preset: SkyboxPreset, customPrompt?: string): string {
  const coreDesc = customPrompt || preset.desc;
  return `A pristine 16:9 ultra-wide panoramic architectural master photograph of a high-end virtual television broadcast studio set (EMPTY STUDIO, NO PEOPLE, NO REPORTERS, NO HUMANS):
[ARCHITECTURAL ENVIRONMENT]:
• ${coreDesc}
[LIGHTING & OPTICS]:
• ${preset.lighting}
• Shot on Hasselblad H6D-100c with 16mm ultra-wide architectural tilt-shift lens, perfectly level horizon line, zero barrel distortion, razor-sharp 8k raw photo clarity, deep volumetric depth.`;
}

export async function runSkyboxGenerator(options: SkyboxGeneratorOptions): Promise<string | null> {
  const presetKey = options.presetKey || "breaking_news_hq_360";
  const preset = SKYBOX_PRESETS[presetKey] || SKYBOX_PRESETS.breaking_news_hq_360;
  const prompt = compileSkyboxPrompt(preset, options.customPrompt);
  const baseName = `skybox_360_${preset.id}_master`;

  const outputDir = path.join(process.cwd(), "public", "studio_environments", "composited_scenes");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const finalDest = options.destPath || path.join(outputDir, `${baseName}.jpg`);

  console.log("\n==================================================================");
  console.log("🏛️ 360° VIRTUAL STUDIO CYCLORAMA & SKYBOX GENERATOR");
  console.log("==================================================================");
  console.log(`Preset:       ${preset.name}`);
  console.log(`Aspect Ratio: ${options.aspectRatio || "16:9"}`);
  console.log(`Engine:       ${(options.engine || "agy").toUpperCase()}`);
  console.log(`Destination:  ${finalDest}\n`);

  if (options.dryRun) {
    console.log(`[DRY-RUN] Compiled Prompt:\n${prompt}\n`);
    return null;
  }

  const compiled: CompiledScenePrompt = {
    prompt,
    imagePaths: [],
    baseName,
    aspectRatio: options.aspectRatio || "16:9",
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
    console.log(`\n✅ 360° Studio Skybox Generated & Saved!`);
    console.log(`📁 File: file:///${finalDest.replace(/\\/g, "/")}\n`);
    return finalDest;
  }

  return null;
}
