/**
 * scripts/gemini-cli/warMapGenerator.ts
 *
 * 3D Holographic Geopolitical & War Relief Map Generator.
 * Synthesizes 16:9 aerial 3D topographic battle maps, tactical naval choke points,
 * and geopolitical airspace defense grids for broadcast news video walls and infographics.
 */

import fs from "fs";
import path from "path";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";

export interface WarMapPreset {
  id: string;
  name: string;
  region: string;
  desc: string;
  overlayStyle: string;
}

export const WAR_MAP_PRESETS: Record<string, WarMapPreset> = {
  taiwan_strait_maritime: {
    id: "taiwan_strait_maritime",
    name: "🚢 Taiwan Strait Maritime Blockade & Naval Zone",
    region: "East Asia / Taiwan Strait",
    desc: "A high-altitude 3D satellite topographic relief map of the Taiwan Strait, Taiwan island, and surrounding Pacific waters. Glowing illuminated red maritime exclusion zones, dashed tactical vector arrows indicating naval movement, pulsing radar rings around key deepwater ports, and bathymetric ocean depth shading.",
    overlayStyle: "Military-grade tactical GIS overlay, crisp luminous cyan shipping corridors, crimson military defense sectors, tactical typography labels, 8k cartographic rendering.",
  },
  middle_east_airspace_corridor: {
    id: "middle_east_airspace_corridor",
    name: "🛡️ Middle East Integrated Air Defense Grid",
    region: "Middle East / Persian Gulf",
    desc: "A high-angle 3D satellite relief map of the Persian Gulf and Levant region. Intersecting glowing green radar coverage domes, missile trajectory arcs in amber and white, fortified naval choke points in Strait of Hormuz, terrain elevation shading for desert and mountain ranges.",
    overlayStyle: "Tactical aerospace defense telemetry, illuminated radar rings, military grid coordinates, night satellite reconnaissance aesthetic.",
  },
  arctic_polar_trade_route: {
    id: "arctic_polar_trade_route",
    name: "❄️ Arctic Northern Sea Route & Resource Choke Points",
    region: "Arctic Circle",
    desc: "A polar orthographic 3D globe view of the Arctic Circle showing retreating sea ice, glowing neon blue Northern Sea Route shipping corridors, highlighted underwater continental shelf boundaries, and deep-sea oil/gas extraction zones.",
    overlayStyle: "Crisp polar cartography, ice-white terrain relief, glowing cyan maritime vectors, holographic border lines.",
  },
  cyber_global_undersea_cables: {
    id: "cyber_global_undersea_cables",
    name: "🌐 Global Subsea Internet Cables & Cyber Choke Points",
    region: "Global Oceans",
    desc: "A dramatic 3D relief map of global ocean floors showing pulsing fiber-optic submarine internet cables running across the Atlantic and Pacific, highlighted landing stations, and critical financial transaction data arteries.",
    overlayStyle: "Cyber command telemetry, glowing fiber-optic pulse lines, neon amber data choke points, dark bathymetric ocean floor.",
  },
};

export interface WarMapGeneratorOptions {
  presetKey?: string;
  customTopic?: string;
  aspectRatio?: string;
  engine?: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  destPath?: string;
}

export function compileWarMapPrompt(preset: WarMapPreset, customTopic?: string): string {
  const desc = customTopic ? `Tactical 3D geographic situation map focusing on: ${customTopic}. ${preset.desc}` : preset.desc;

  return `A high-end 16:9 television broadcast 3D geopolitical infographic map (NO HUMANS, CLEAN GRAPHIC PLATE):
[GEOGRAPHIC RELIEF & TOPOGRAPHY]:
• Region: ${preset.region}
• ${desc}
[TACTICAL TELEMETRY & VISUAL STYLING]:
• ${preset.overlayStyle}
• High-contrast television broadcast quality, crisp vector lines, 8k resolution, photorealistic topography and atmospheric haze.`;
}

export async function runWarMapGenerator(options: WarMapGeneratorOptions): Promise<string | null> {
  const presetKey = options.presetKey || "taiwan_strait_maritime";
  const preset = WAR_MAP_PRESETS[presetKey] || WAR_MAP_PRESETS.taiwan_strait_maritime;
  const prompt = compileWarMapPrompt(preset, options.customTopic);
  const baseName = `warmap_${preset.id}_master`;

  const outputDir = path.join(process.cwd(), "public", "studio_environments", "composited_scenes");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const finalDest = options.destPath || path.join(outputDir, `${baseName}.jpg`);

  console.log("\n==================================================================");
  console.log("🗺️ 3D HOLOGRAPHIC GEOPOLITICAL & WAR RELIEF MAP GENERATOR");
  console.log("==================================================================");
  console.log(`Preset:       ${preset.name}`);
  console.log(`Region:       ${preset.region}`);
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
    console.log(`\n✅ 3D Geopolitical War Map Generated & Saved!`);
    console.log(`📁 File: file:///${finalDest.replace(/\\/g, "/")}\n`);
    return finalDest;
  }

  return null;
}
