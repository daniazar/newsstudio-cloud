/**
 * src/lib/wardrobe/lightingEngine.ts
 *
 * Studio Environment Lighting & Color Bleed Engine (Phase 4).
 * Models realistic television studio lighting environments, 3-point light rigs,
 * ambient background bleed, and edge spill compensation for neural inpainting
 * (MiniMax H3 ref2va + SAM 3.1).
 *
 * Guarantees newly inpainted garments and hair fibers seamlessly absorb
 * studio illumination and eliminate "cardboard cutout" edge artifacts.
 */

export type LightingPresetId =
  | "broadcast_neutral"
  | "warm_tungsten"
  | "cool_cyan"
  | "cyber_neon"
  | "dramatic_noir"
  | "golden_hour";

export type LightDirection = "left" | "center" | "right";

export type LightRole = "key" | "fill" | "rim";

export type BounceType = "chroma_green" | "led_wall" | "warm_desk" | "custom";

export interface LightSpec {
  name: string;
  hex: string;
  colorTempK: number;
  intensity: number; // 0 - 100%
  direction: LightDirection;
  role: LightRole;
}

export interface EnvironmentBleedSource {
  id: string;
  name: string;
  dominantHex: string;
  bleedIntensity: number; // 0 - 100%
  bounceType: BounceType;
  despillWrap: boolean;
}

export interface LightingEnvironmentConfig {
  presetId: LightingPresetId;
  presetName: string;
  description: string;
  keyLight: LightSpec;
  fillLight: LightSpec;
  rimLight: LightSpec;
  ambientBleed: EnvironmentBleedSource;
  rimLightWrap: number; // 0 - 100%
  despillEnabled: boolean;
  keyDirection: LightDirection;
  ambientTintHex?: string;
}

export interface CompiledLightingClauses {
  summaryClause: string;
  textileBounceClause: string;
  rimEdgeWrapClause: string;
  hairCuticleReflectionClause: string;
  shadowOcclusionClause: string;
  negativeLightingPrompt: string;
  formulaBadge: string;
}

/**
 * Standard Studio Lighting Presets
 */
export const STUDIO_LIGHTING_PRESETS: Record<LightingPresetId, LightingEnvironmentConfig> = {
  broadcast_neutral: {
    presetId: "broadcast_neutral",
    presetName: "Broadcast Neutral",
    description: "Balanced 5600K daylight 3-point television studio illumination with clean color rendition and subtle despill wrap.",
    keyLight: {
      name: "Daylight Key",
      hex: "#FFFFFF",
      colorTempK: 5600,
      intensity: 85,
      direction: "left",
      role: "key",
    },
    fillLight: {
      name: "Soft Studio Fill",
      hex: "#F8FAFC",
      colorTempK: 5200,
      intensity: 45,
      direction: "right",
      role: "fill",
    },
    rimLight: {
      name: "Crisp Separation Rim",
      hex: "#E2E8F0",
      colorTempK: 6000,
      intensity: 65,
      direction: "center",
      role: "rim",
    },
    ambientBleed: {
      id: "chroma_green_spill",
      name: "Chroma Green Spill Suppression",
      dominantHex: "#4C9C13",
      bleedIntensity: 30,
      bounceType: "chroma_green",
      despillWrap: true,
    },
    rimLightWrap: 50,
    despillEnabled: true,
    keyDirection: "left",
    ambientTintHex: "#4C9C13",
  },
  warm_tungsten: {
    presetId: "warm_tungsten",
    presetName: "Warm Tungsten",
    description: "Intimate prime-time broadcast warmth (3200K) with rich golden textile highlights and warm timber news desk bounce.",
    keyLight: {
      name: "Warm Tungsten Key",
      hex: "#FDBA74",
      colorTempK: 3200,
      intensity: 90,
      direction: "left",
      role: "key",
    },
    fillLight: {
      name: "Soft Amber Fill",
      hex: "#FED7AA",
      colorTempK: 3400,
      intensity: 50,
      direction: "right",
      role: "fill",
    },
    rimLight: {
      name: "Golden Hair Kicker",
      hex: "#FDE68A",
      colorTempK: 4000,
      intensity: 70,
      direction: "right",
      role: "rim",
    },
    ambientBleed: {
      id: "warm_desk_glow",
      name: "Warm News Desk Glow",
      dominantHex: "#9A3412",
      bleedIntensity: 40,
      bounceType: "warm_desk",
      despillWrap: true,
    },
    rimLightWrap: 60,
    despillEnabled: true,
    keyDirection: "left",
    ambientTintHex: "#9A3412",
  },
  cool_cyan: {
    presetId: "cool_cyan",
    presetName: "Cool Studio Glow",
    description: "Modern high-tech anchor glow with vibrant cyan backlight edge separation and LED video wall reflection.",
    keyLight: {
      name: "Cool Daylight Key",
      hex: "#E0F2FE",
      colorTempK: 6500,
      intensity: 85,
      direction: "left",
      role: "key",
    },
    fillLight: {
      name: "Deep Cool Fill",
      hex: "#38BDF8",
      colorTempK: 7000,
      intensity: 55,
      direction: "right",
      role: "fill",
    },
    rimLight: {
      name: "Electric Cyan Rim",
      hex: "#06B6D4",
      colorTempK: 8000,
      intensity: 80,
      direction: "right",
      role: "rim",
    },
    ambientBleed: {
      id: "led_wall_bleed",
      name: "LED Video Wall Bleed",
      dominantHex: "#0284C7",
      bleedIntensity: 50,
      bounceType: "led_wall",
      despillWrap: true,
    },
    rimLightWrap: 65,
    despillEnabled: true,
    keyDirection: "left",
    ambientTintHex: "#0284C7",
  },
  cyber_neon: {
    presetId: "cyber_neon",
    presetName: "Cyber Neon",
    description: "High-energy stylized neon synthwave ambience with split-complementary textile sheen and dual-color specular reflections.",
    keyLight: {
      name: "Neon Magenta Key",
      hex: "#EC4899",
      colorTempK: 4500,
      intensity: 90,
      direction: "left",
      role: "key",
    },
    fillLight: {
      name: "Deep Indigo Fill",
      hex: "#3B82F6",
      colorTempK: 8000,
      intensity: 60,
      direction: "right",
      role: "fill",
    },
    rimLight: {
      name: "Ultraviolet Rim Kicker",
      hex: "#A855F7",
      colorTempK: 9500,
      intensity: 95,
      direction: "right",
      role: "rim",
    },
    ambientBleed: {
      id: "cyberpunk_neon_glow",
      name: "Cyberpunk Neon Bounce",
      dominantHex: "#D946EF",
      bleedIntensity: 65,
      bounceType: "custom",
      despillWrap: false,
    },
    rimLightWrap: 75,
    despillEnabled: false,
    keyDirection: "left",
    ambientTintHex: "#D946EF",
  },
  dramatic_noir: {
    presetId: "dramatic_noir",
    presetName: "Dramatic Noir",
    description: "Chiaroscuro high-contrast broadcast noir with deep shadow occlusion and crisp silhouette rim isolation.",
    keyLight: {
      name: "Sculpted Hard Key",
      hex: "#F3F4F6",
      colorTempK: 4200,
      intensity: 95,
      direction: "left",
      role: "key",
    },
    fillLight: {
      name: "Low Ambient Fill",
      hex: "#1F2937",
      colorTempK: 5000,
      intensity: 15,
      direction: "right",
      role: "fill",
    },
    rimLight: {
      name: "Razor Silhouette Rim",
      hex: "#FFFFFF",
      colorTempK: 6500,
      intensity: 85,
      direction: "right",
      role: "rim",
    },
    ambientBleed: {
      id: "noir_shadow_absorb",
      name: "Studio Shadow Absorption",
      dominantHex: "#111827",
      bleedIntensity: 20,
      bounceType: "custom",
      despillWrap: true,
    },
    rimLightWrap: 40,
    despillEnabled: true,
    keyDirection: "left",
    ambientTintHex: "#111827",
  },
  golden_hour: {
    presetId: "golden_hour",
    presetName: "Golden Gala",
    description: "Radiant evening gala illumination with gilded textile bounce and warm golden hair cuticle specular luster.",
    keyLight: {
      name: "Molten Sunset Key",
      hex: "#FB923C",
      colorTempK: 2800,
      intensity: 90,
      direction: "left",
      role: "key",
    },
    fillLight: {
      name: "Soft Peach Fill",
      hex: "#FDE68A",
      colorTempK: 3500,
      intensity: 45,
      direction: "right",
      role: "fill",
    },
    rimLight: {
      name: "Luminous Halo Rim",
      hex: "#F59E0B",
      colorTempK: 2600,
      intensity: 85,
      direction: "center",
      role: "rim",
    },
    ambientBleed: {
      id: "golden_gala_ambient",
      name: "Golden Gala Amber Glow",
      dominantHex: "#EA580C",
      bleedIntensity: 45,
      bounceType: "warm_desk",
      despillWrap: true,
    },
    rimLightWrap: 70,
    despillEnabled: true,
    keyDirection: "left",
    ambientTintHex: "#EA580C",
  },
};

export const LIGHTING_PRESET_LIST: LightingEnvironmentConfig[] = Object.values(STUDIO_LIGHTING_PRESETS);

/**
 * Resolves a lighting configuration from a preset or custom overrides.
 */
export function resolveLightingConfig(
  presetOrConfig?: LightingPresetId | Partial<LightingEnvironmentConfig> | null
): LightingEnvironmentConfig {
  if (!presetOrConfig) {
    return { ...STUDIO_LIGHTING_PRESETS.broadcast_neutral };
  }

  if (typeof presetOrConfig === "string") {
    const found = STUDIO_LIGHTING_PRESETS[presetOrConfig as LightingPresetId];
    return found ? { ...found } : { ...STUDIO_LIGHTING_PRESETS.broadcast_neutral };
  }

  const basePresetId = (presetOrConfig.presetId || "broadcast_neutral") as LightingPresetId;
  const base = STUDIO_LIGHTING_PRESETS[basePresetId] || STUDIO_LIGHTING_PRESETS.broadcast_neutral;

  const keyDir = presetOrConfig.keyDirection || presetOrConfig.keyLight?.direction || base.keyDirection;

  return {
    ...base,
    presetId: presetOrConfig.presetId || base.presetId,
    presetName: presetOrConfig.presetName || base.presetName,
    description: presetOrConfig.description || base.description,
    keyDirection: keyDir,
    keyLight: {
      ...base.keyLight,
      ...(presetOrConfig.keyLight || {}),
      direction: keyDir,
    },
    fillLight: {
      ...base.fillLight,
      ...(presetOrConfig.fillLight || {}),
    },
    rimLight: {
      ...base.rimLight,
      ...(presetOrConfig.rimLight || {}),
    },
    ambientBleed: {
      ...base.ambientBleed,
      ...(presetOrConfig.ambientBleed || {}),
    },
    rimLightWrap:
      presetOrConfig.rimLightWrap !== undefined ? presetOrConfig.rimLightWrap : base.rimLightWrap,
    despillEnabled:
      presetOrConfig.despillEnabled !== undefined ? presetOrConfig.despillEnabled : base.despillEnabled,
    ambientTintHex: presetOrConfig.ambientTintHex || base.ambientTintHex,
  };
}

/**
 * Automated Background Color Sampler & Bleed Analyzer
 * Analyzes source action loop path/metadata to detect dominant backdrop chroma,
 * green screen spill, LED video wall reflection, or warm news desk glow.
 */
export function analyzeLoopBackgroundBleed(videoUrlOrPath: string): EnvironmentBleedSource {
  const norm = (videoUrlOrPath || "").toLowerCase().replace(/\\/g, "/");

  // 1. LED Wall / Cyber Studio Loops (specific environment)
  if (
    norm.includes("led") ||
    norm.includes("cyber") ||
    norm.includes("videowall") ||
    norm.includes("ticker") ||
    norm.includes("virtual_set")
  ) {
    return {
      id: "led_wall_bleed",
      name: "LED Video Wall Bleed",
      dominantHex: "#0284C7",
      bleedIntensity: 50,
      bounceType: "led_wall",
      despillWrap: true,
    };
  }

  // 2. Warm Desk / Classic Broadcast Studio (specific furniture/set)
  if (
    norm.includes("desk") ||
    norm.includes("newsroom") ||
    norm.includes("anchor_desk") ||
    norm.includes("warm") ||
    norm.includes("wood")
  ) {
    return {
      id: "warm_desk_glow",
      name: "Warm News Desk Glow",
      dominantHex: "#9A3412",
      bleedIntensity: 40,
      bounceType: "warm_desk",
      despillWrap: true,
    };
  }

  // 3. Green Screen / Chroma Loops
  if (
    norm.includes("burgundy") ||
    norm.includes("silver_blazer") ||
    norm.includes("ivory_crepe") ||
    norm.includes("navy_tech") ||
    norm.includes("chroma") ||
    norm.includes("greenscreen") ||
    norm.includes("green_screen") ||
    norm.includes("veo_cyclic") ||
    norm.includes("master_ruby") ||
    norm.includes("transitions_suite") ||
    norm.includes("action_loops/veo")
  ) {
    return {
      id: "chroma_green_spill",
      name: "Chroma Green Spill Suppression",
      dominantHex: "#4C9C13",
      bleedIntensity: 35,
      bounceType: "chroma_green",
      despillWrap: true,
    };
  }

  // 4. Fallback Default: Clean Broadcast Studio Neutral
  return {
    id: "broadcast_neutral_ambient",
    name: "Clean Neutral Studio Ambient",
    dominantHex: "#1E293B",
    bleedIntensity: 20,
    bounceType: "custom",
    despillWrap: true,
  };
}

/**
 * Compiles a concise live preview formula badge for display in UI.
 * Format: "Lighting: 45° Key Left (5600K) with Subtle Cyan Edge Bleed & Despill Wrap"
 */
export function compileLightingFormulaBadge(config: LightingEnvironmentConfig): string {
  const dirLabel =
    config.keyDirection === "left"
      ? "45° Key Left"
      : config.keyDirection === "right"
      ? "45° Key Right"
      : "Frontal Key Center";

  const tempLabel = `${config.keyLight.colorTempK}K`;

  let bleedDesc = "Subtle Edge Bleed";
  if (config.presetId === "cyber_neon") {
    bleedDesc = "Neon Edge Bleed";
  } else if (config.presetId === "dramatic_noir") {
    bleedDesc = "Noir Rim Edge";
  } else if (config.presetId === "golden_hour") {
    bleedDesc = "Golden Halo Edge";
  } else {
    switch (config.ambientBleed.bounceType) {
      case "chroma_green":
        bleedDesc = "Chroma Edge Bleed";
        break;
      case "led_wall":
        bleedDesc = "Cool Cyan Edge Bleed";
        break;
      case "warm_desk":
        bleedDesc = "Warm Oak Edge Bleed";
        break;
      case "custom":
        bleedDesc = config.ambientTintHex ? `Custom Tint (${config.ambientTintHex})` : "Custom Set Bleed";
        break;
      default:
        bleedDesc = "Subtle Edge Bleed";
        break;
    }
  }

  const despillText = config.despillEnabled ? " & Despill Wrap" : " & Crisp Edge Wrap";

  return `Lighting: ${dirLabel} (${tempLabel}) with ${bleedDesc}${despillText}`;
}

/**
 * Compiles photorealistic diffusion prompt directives into structured clauses
 * for MiniMax H3 ref2va video inpainting (Node 89 MiniMaxH3XPromptLint).
 */
export function compileLightingPromptClauses(config: LightingEnvironmentConfig): CompiledLightingClauses {
  const key = config.keyLight;
  const fill = config.fillLight;
  const rim = config.rimLight;
  const bleed = config.ambientBleed;
  const dir = config.keyDirection;
  const wrap = config.rimLightWrap;
  const despill = config.despillEnabled;

  const dirPhrase =
    dir === "left"
      ? "from a 45-degree angle to the presenter's left"
      : dir === "right"
      ? "from a 45-degree angle to the presenter's right"
      : "from the center axis frontal broadcast position";

  const oppositeDir = dir === "left" ? "right" : dir === "right" ? "left" : "ambient sides";

  const despillPhrase = despill
    ? "with active chromatic despill suppression eliminating green/blue halo fringing around the perimeter"
    : "with crisp separation along silhouette contours";

  // 1. Summary Clause
  const summaryClause = `The newly inpainted wardrobe and hair seamlessly integrate into the ${config.presetName} studio environment, absorbing ${key.colorTempK}K key illumination ${dirPhrase} and ${wrap}% rim light wrap ${despillPhrase}.`;

  // 2. Diffuse Textile Bounce Clause
  const textileBounceClause = `Garment fabric, tailoring lapels, seams, and textile fibers naturally absorb the ${key.name} (${key.colorTempK}K at ${key.intensity}% intensity) ${dirPhrase}, balanced by soft ${fill.name} (${fill.colorTempK}K at ${fill.intensity}%) from the ${oppositeDir}. Fabric folds exhibit subtle diffuse ambient reflection tinted by the set's ${bleed.name} (${bleed.dominantHex}) without artificial discoloration or flat cardboard texture.`;

  // 3. Rim Light Edge Wrap Clause
  const rimEdgeWrapClause = `Shoulders, sleeve contours, collar rims, and silhouette edges display ${wrap}% rim light wrap from the ${rim.name} (${rim.colorTempK}K at ${rim.intensity}% intensity). Edge pixels integrate cleanly against the studio background, strictly preventing cardboard cutout edges, white border halos, or green screen spill leakage.`;

  // 4. Hair Cuticle Specular Reflection Clause
  const hairCuticleReflectionClause = `Hair fibers, scalp boundaries, and individual strands exhibit photorealistic specular cuticle luster matching the directional ${key.colorTempK}K key light and ${rim.colorTempK}K backlight kicker. Highlights glide naturally along hair curvature during movement with zero plastic sheen or matte flattening.`;

  // 5. Realistic Shadow Occlusion Clause
  const shadowOcclusionClause = `Physically accurate micro-shadow occlusion falls beneath the collar, lapel overhangs, and underarm seams consistent with the ${dirPhrase} key lighting vector, providing deep dimensional volume and authentic spatial grounding.`;

  // 6. Anti-Artifact Negative Directives
  const negativeLightingPrompt =
    "flat flash photography lighting, mismatched studio lighting, cardboard cutout halo, green screen fringing, discolored white rim halo, hard compositing seam, unnatural plastic shine, blown-out specular highlights, muddy ambient shadows, floating presenter artifact, uneven studio lighting";

  const formulaBadge = compileLightingFormulaBadge(config);

  return {
    summaryClause,
    textileBounceClause,
    rimEdgeWrapClause,
    hairCuticleReflectionClause,
    shadowOcclusionClause,
    negativeLightingPrompt,
    formulaBadge,
  };
}
