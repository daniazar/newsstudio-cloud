/**
 * scripts/gemini-cli/propsAndFabrics.ts
 *
 * Broadcast Props & Accessories Catalog and Dynamic Textile & Color Swapper.
 */

export interface BroadcastProp {
  id: string;
  name: string;
  prompt: string;
}

export const BROADCAST_PROPS: Record<string, BroadcastProp> = {
  digital_tablet: {
    id: "digital_tablet",
    name: "📱 Digital News Tablet",
    prompt: "holding a sleek, slim glass digital news tablet in hands displaying glowing real-time telemetry and holographic news charts",
  },
  branded_coffee_mug: {
    id: "branded_coffee_mug",
    name: "☕ Branded Studio Coffee Mug",
    prompt: "a modern ceramic studio coffee mug with subtle embossed 'Ruby News' broadcast branding resting neatly on the desk surface",
  },
  broadcast_mic: {
    id: "broadcast_mic",
    name: "🎙️ Broadcast Ribbon Microphone",
    prompt: "a professional vintage broadcast ribbon microphone mounted on a sleek low-profile desk stand positioned subtly in the foreground",
  },
  titanium_glasses: {
    id: "titanium_glasses",
    name: "👓 Titanium Reading Glasses",
    prompt: "wearing elegant, minimalist titanium wire-rimmed designer glasses with anti-reflective lenses, accentuating analytical authority",
  },
  script_papers: {
    id: "script_papers",
    name: "📄 Printed Script Stack & Pen",
    prompt: "holding a neat stack of printed broadcast news script papers with a silver metallic newsroom pen held thoughtfully between fingers",
  },
};

export interface FabricPreset {
  id: string;
  name: string;
  prompt: string;
}

export const TEXTILE_FABRICS: Record<string, FabricPreset> = {
  crushed_velvet: { id: "crushed_velvet", name: "Crushed Velvet", prompt: "rich crushed velvet texture with deep lustrous sheen" },
  liquid_satin: { id: "liquid_satin", name: "Liquid Satin", prompt: "flowing liquid satin with smooth specular reflections" },
  matte_leather: { id: "matte_leather", name: "Matte Leather", prompt: "premium soft matte Italian leather with clean tailored stitching" },
  fine_silk: { id: "fine_silk", name: "Fine Silk", prompt: "delicate lightweight mulberry silk crepe with elegant drape" },
  metallic_sequins: { id: "metallic_sequins", name: "Metallic Sequins", prompt: "high-fashion micro-sequin embellishments with sparkling catchlights" },
  italian_linen: { id: "italian_linen", name: "Italian Linen", prompt: "crisp breathable Italian linen weave with natural textured fibers" },
};

export const COLOR_SWAPS: Record<string, string> = {
  emerald_green: "vibrant emerald green",
  crimson_red: "deep crimson red",
  cobalt_blue: "royal cobalt blue",
  liquid_gold: "shimmering liquid gold metallic",
  champagne: "warm champagne pearl",
  obsidian_black: "sleek obsidian black",
  royal_purple: "majestic royal amethyst purple",
};

export interface ARGraphicPreset {
  id: string;
  name: string;
  prompt: string;
}

export const AR_HOLOGRAPHIC_GRAPHICS: Record<string, ARGraphicPreset> = {
  crypto_candlestick_hologram: {
    id: "crypto_candlestick_hologram",
    name: "📊 3D Floating Crypto Candlestick Hologram",
    prompt: "a photorealistic 3D holographic green and red candlestick market telemetry chart floating seamlessly in mid-air beside the anchor's outstretched hand with glowing volumetric data points",
  },
  breaking_war_map: {
    id: "breaking_war_map",
    name: "🗺️ Holographic 3D Global Crisis Topo Map",
    prompt: "a glowing semi-transparent 3D tactical topographic globe and regional crisis map floating in mid-air with amber geopolitical territory highlights",
  },
  financial_pie_chart_3d: {
    id: "financial_pie_chart_3d",
    name: "📈 Floating 3D Financial Asset Breakdown",
    prompt: "an architectural floating 3D glass pie-chart and percentage telemetry readout glowing in soft cyan and gold in the foreground studio space",
  },
  tech_ai_neural_network_orb: {
    id: "tech_ai_neural_network_orb",
    name: "🧠 Glowing AI Neural Network Hologram Orb",
    prompt: "a complex pulsing 3D volumetric neural network orb with interconnected glowing nodes and synaptic light trails hovering beside the presenter",
  },
};

export interface TimeOfDayPreset {
  id: string;
  name: string;
  prompt: string;
}

export const TIME_OF_DAY_PRESETS: Record<string, TimeOfDayPreset> = {
  dawn: {
    id: "dawn",
    name: "🌅 Sunrise / Early Morning Dawn",
    prompt: "soft pastel pink, lavender, and golden sunrise light filling the sky, gentle morning mist over the distant cityscape through the floor-to-ceiling studio windows",
  },
  midday: {
    id: "midday",
    name: "☀️ High-Noon Crisp Daylight",
    prompt: "crystal-clear bright high-noon daylight, brilliant blue sky, sharp architectural glass reflections on the skyscrapers outside",
  },
  golden_hour: {
    id: "golden_hour",
    name: "🌇 Golden Hour Sunset Twilight",
    prompt: "dramatic warm amber and crimson sunset sky, long golden sun rays casting cinematic rim highlights across the studio set",
  },
  midnight_city: {
    id: "midnight_city",
    name: "🌃 Deep Midnight Glittering Cityscape",
    prompt: "deep midnight navy blue night sky with tens of thousands of glittering skyscraper office windows and distant red aviation warning lights shining through the glass",
  },
  rainy_night: {
    id: "rainy_night",
    name: "🌧️ Rainy Cyberpunk Night",
    prompt: "dark rainy night with wet streaks and raindrops sliding down the studio glass windows, reflecting colorful neon billboards and wet city pavement below",
  },
};

/**
 * Applies dynamic color and fabric overrides onto a base attire description.
 */
export function applyFabricAndColorOverrides(
  baseAttire: string,
  fabricKey?: string,
  colorKey?: string
): string {
  let result = baseAttire;

  if (colorKey && COLOR_SWAPS[colorKey]) {
    const newColor = COLOR_SWAPS[colorKey];
    result = `${result}, modified in ${newColor} color palette`;
  }

  if (fabricKey && TEXTILE_FABRICS[fabricKey]) {
    const newFabric = TEXTILE_FABRICS[fabricKey].prompt;
    result = `${result}, tailored in ${newFabric}`;
  }

  return result;
}

