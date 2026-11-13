/**
 * scripts/gemini-cli/studioGenerator.ts
 *
 * AI Virtual Studio Set & Environment Plate Generator.
 * Generates clean, photorealistic 16:9 or 9:16 background studio plates (without anchors)
 * calibrated for seamless alpha chroma key compositing with realistic human scale.
 */

import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";

export interface StudioSetPreset {
  id: string;
  label: string;
  description: string;
  aspectRatio: string;
  category: "newsroom" | "videowall" | "financial" | "breaking" | "lounge" | "cyber" | "debate";
}

export const STUDIO_SET_PRESETS: Record<string, StudioSetPreset> = {
  standup_skyline_stage: {
    id: "standup_skyline_stage",
    label: "🌟 Prime-Time Standup Stage (Panoramic Twilight Skyline & Glass Pillars)",
    category: "newsroom",
    description: "An ultra-premium prime-time television broadcast studio standup set: Open clean center presentation stage with dark mirror-polished black epoxy floor with soft ambient light reflections. In background: Expansive floor-to-ceiling panoramic glass curtain windows displaying a breathtaking blue twilight skyscraper skyline with sparkling evening city lights. High 20-foot (6-meter) architectural studio ceiling with professional motorized studio lighting grid and softboxes positioned realistically high above the field of view. Clean architectural brushed steel and glass pillars on left and right borders. Camera optics: Shot on 50mm broadcast prime lens at standard eye-level (1.55m optical center), zero wide-angle distortion, natural perspective compression, subtle optical depth of field on distant skyscrapers, empty broadcast set, zero people, master architectural broadcast studio photography, 8k photo, raw photo quality.",
    aspectRatio: "16:9",
  },
  videowall_8k_standup: {
    id: "videowall_8k_standup",
    label: "📊 8K Interactive Mega Video Wall Stage (Data Visualizer & Light Guides)",
    category: "videowall",
    description: "A state-of-the-art interactive broadcast news studio stage: Massive 12-foot-tall curved 8K seamless LED video display wall in the background displaying live global news infographics, world map telemetry, and subtle geometric broadcast motion graphics in cool cobalt and cyan tones. Dark polished mirror-finish studio floor with glowing linear neon guide lines recessed flush into the floor. High 22-foot studio ceiling with distant overhead studio trusses and broadcast lighting fixtures. Camera optics: Neutral 50mm broadcast studio lens at eye-level height (1.55m), perfectly level horizon, zero fish-eye warping, clean spatial depth, empty stage, zero people, professional television architectural photography, 8k photo.",
    aspectRatio: "16:9",
  },
  futuristic_financial_floor: {
    id: "futuristic_financial_floor",
    label: "📈 Futuristic Financial Trading Floor (Global Markets & Wall Street Telemetry)",
    category: "financial",
    description: "An ultra-modern financial news broadcast command center: High-tech glass presentation console at realistic standing scale (42-inch height) to the side, expansive curved LED financial video wall in background displaying real-time candlestick charts, stock market indices, and macroeconomic data streams in emerald green, gold, and cobalt blue. Distant trading workstations visible in deep background through acoustic glass with soft f/2.8 optical bokeh blur. Dark polished epoxy floor with subtle light streaks, high 20-foot studio ceiling with overhead softboxes. Shot on 50mm broadcast lens at 1.55m eye-level height, realistic object proportions, empty set, zero people, master architectural television studio photography, 8k raw photo.",
    aspectRatio: "16:9",
  },
  breaking_red_alert_stage: {
    id: "breaking_red_alert_stage",
    label: "🚨 Breaking News Emergency Red Alert Stage (High Tension & Strobe Accents)",
    category: "breaking",
    description: "A high-tension breaking news emergency broadcast television studio set: Clean presentation floor with dark reflective black obsidian floor reflecting crimson neon edge lighting. In the background: Large panoramic high-definition studio video monitors displaying animated emergency red breaking news graphics, bold alert telemetry, and pulsing crimson ambient rim lighting. Studio architecture: High 20-foot studio ceiling with professional television truss lighting rigs, emergency strobe lights, dark dramatic atmosphere. Shot on 50mm broadcast studio lens at 1.55m eye-level height, zero distortion, realistic spatial scale, empty broadcast set, zero people, master architectural broadcast studio photography, 8k photo, raw photo quality.",
    aspectRatio: "16:9",
  },
  luxury_penthouse_podcast: {
    id: "luxury_penthouse_podcast",
    label: "🛋️ Luxury Penthouse Interview Lounge (Walnut Acoustic Slats & Rainy Skyline)",
    category: "lounge",
    description: "A luxury high-floor penthouse television interview lounge: Two empty designer charcoal grey leather club armchairs at exact seated human scale (30-inch seat height) centered around a low circular brass and smoked glass coffee table with water glasses and news documents. Warm vertical walnut acoustic wood slat accent wall with embedded amber LED vertical light tubes, expansive panoramic floor-to-ceiling windows looking over a rainy twilight skyline, soft 3200K broadcast warm key light, high 18-foot loft ceiling. Shot on 50mm lens at 1.55m eye-level height, realistic furniture scale, empty set, zero people, master interior architectural photography, 8k raw photo.",
    aspectRatio: "16:9",
  },
  cyberpunk_crypto_command: {
    id: "cyberpunk_crypto_command",
    label: "🌆 Cyberpunk Crypto & Tech Broadcast Deck (Neon Matrix & Obsidian)",
    category: "cyber",
    description: "A futuristic cyberpunk news broadcast studio deck: Multi-tiered curved display monitors in background showing cryptocurrency metrics, blockchain telemetry, and glowing holographic data matrices in neon cyan and violet volumetric studio lighting. Sleek brushed gunmetal steel panels, polished obsidian floor reflecting neon hues, high 20-foot ceiling with overhead cable trays and camera tracks. Shot on 50mm broadcast lens at 1.55m eye-level height, zero distortion, realistic human scale, empty set, zero people, master architectural broadcast photography, 8k photo.",
    aspectRatio: "16:9",
  },
  clean_broadcast_newsroom: {
    id: "clean_broadcast_newsroom",
    label: "🏢 Prime Glass Broadcast Newsroom (Busy Newsroom Depth & Soft Bokeh)",
    category: "newsroom",
    description: "A prestigious television broadcast news studio set: Foreground polished presentation floor with subtle circular LED light track. In background behind architectural soundproof glass partitions: Active bustling modern 24/7 newsroom floor with news desks, monitors, and production workstations visible in deep background with creamy f/2.8 optical bokeh depth of field. High 22-foot studio ceiling with professional broadcast lighting grid. Shot on 50mm broadcast prime lens at standard eye-level (1.55m), perfectly level horizon, zero distortion, empty presentation stage, zero people, master television architectural photography, 8k raw photo.",
    aspectRatio: "16:9",
  },
  presidential_debate_hall: {
    id: "presidential_debate_hall",
    label: "🏛️ Presidential Broadcast Debate Stage (Dual Lecterns & LED Pillars)",
    category: "debate",
    description: "A grand national political broadcast debate stage: Two empty sleek acrylic and chrome debate lecterns positioned on left and right on an elevated polished dark navy stage, symmetrical cobalt blue and white LED light pillars in background, large central video screen with subtle golden national geometric watermark, high 24-foot auditorium ceiling with professional studio floodlights and key lights. Shot on 50mm broadcast lens at 1.55m eye level, empty stage, zero people, 8k television broadcast set photography.",
    aspectRatio: "16:9",
  },
};

export interface GenerateStudioOptions {
  presetKey?: string;
  customPrompt?: string;
  aspectRatio?: string;
  engine: "agy" | "api" | "tool_json";
  plateName?: string;
  preview?: boolean;
}

export function compileStudioPlateScene(options: GenerateStudioOptions): CompiledScenePrompt {
  const {
    presetKey = "standup_skyline_stage",
    customPrompt,
    aspectRatio = "16:9",
  } = options;

  const preset = STUDIO_SET_PRESETS[presetKey];
  let promptText = customPrompt || (preset ? preset.description : STUDIO_SET_PRESETS.standup_skyline_stage.description);

  // Aspect-ratio specific spatial tuning
  if (aspectRatio === "9:16") {
    promptText = `A vertical 9:16 (1080x1920) television broadcast studio environment plate: ${promptText} Composition is vertically framed with high architectural verticality, floor occupying bottom 20% of frame, ceiling trusses high at top, perfectly calibrated for a standing alpha chroma news anchor in foreground.`;
  } else if (aspectRatio === "16:9") {
    promptText = `A widescreen 16:9 (1920x1080) television broadcast studio environment plate: ${promptText} Composition is wide establishing shot with balanced left-center-right broadcast zones, floor occupying bottom 25% of frame, calibrated for alpha chroma anchor compositing.`;
  }

  const baseName = options.plateName || `studio_plate_${presetKey}_${aspectRatio.replace(":", "x")}_${Date.now().toString().slice(-6)}`;

  return {
    prompt: promptText,
    imagePaths: [], // Clean studio environment generation has no subject reference
    baseName,
    aspectRatio,
  };
}

export async function runStudioGeneratorMode(options: GenerateStudioOptions): Promise<string | null> {
  console.log("\n==================================================================");
  console.log("🌐 SCALE-CALIBRATED VIRTUAL STUDIO SET & ENVIRONMENT GENERATOR");
  console.log("==================================================================");
  console.log(`Studio Preset: ${options.presetKey || "Custom"}`);
  console.log(`Aspect Ratio:  ${options.aspectRatio || "16:9"}`);
  console.log(`Engine:        ${options.engine.toUpperCase()}`);

  const compiled = compileStudioPlateScene(options);
  console.log(`Plate Name:    ${compiled.baseName}`);
  console.log(`\nScale-Calibrated Broadcast Prompt:\n"${compiled.prompt}"\n`);

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
