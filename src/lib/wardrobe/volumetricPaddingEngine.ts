/**
 * src/lib/wardrobe/volumetricPaddingEngine.ts
 *
 * Volumetric Mask Padding & Studio Set Adaptability Engine (Phase 6).
 * Computes dynamic SAM 3.1 tracking bounding box expansion (+15% to +40%),
 * radial edge feathering, and uncrop boundary decay curves to prevent
 * silhouette clipping during neural video inpainting.
 *
 * Essential for:
 * 1. Volumetric hairstyles (afro coils, voluminous curls, bouffants, high updos)
 * 2. Volumetric garments (power shoulder blazers, wide shawl lapels, cape dresses, flared gowns)
 * 3. Studio set adaptability (virtual LED walls, newsroom backdrops, dark chroma despill)
 */

export type BoundaryDecayCurve = "linear" | "smoothstep" | "cosine";
export type VolumetricSilhouetteClass = "compact" | "medium" | "volumetric" | "dramatic";

export interface VolumetricPaddingConfig {
  paddingTopPercent: number; // 0 - 50%
  paddingBottomPercent: number; // 0 - 50%
  paddingLeftPercent: number; // 0 - 50%
  paddingRightPercent: number; // 0 - 50%
  featherRadiusPixels: number; // 0 - 64px
  boundaryDecay: BoundaryDecayCurve;
  autoVolumetricEnabled: boolean;
  silhouetteClass: VolumetricSilhouetteClass;
  adaptiveSetExpansion: boolean;
  horizontalPaddingTotal?: number;
  verticalPaddingTotal?: number;
  verticalPaddingCrown?: number;
  boundaryDecayCurve?: BoundaryDecayCurve;
  autoSilhouetteExpansion?: boolean;
}

export interface SilhouetteAnalysisInput {
  haircutId?: string;
  haircutName?: string;
  hairLength?: string;
  outfitId?: string;
  outfitName?: string;
  outfitCategory?: string;
  sourceLoopUrl?: string;
  isVirtualSet?: boolean;
}

export interface CompiledVolumetricDirectives {
  positiveClause: string;
  negativeClause: string;
  trackingExpansionTokens: string[];
  formulaBadge: string;
  horizontalPaddingTotal: number;
  verticalPaddingTotal: number;
}

/**
 * Baseline default volumetric padding configuration (neutral broadcast).
 */
export const DEFAULT_VOLUMETRIC_PADDING: VolumetricPaddingConfig = {
  paddingTopPercent: 10,
  paddingBottomPercent: 10,
  paddingLeftPercent: 12,
  paddingRightPercent: 12,
  featherRadiusPixels: 16,
  boundaryDecay: "smoothstep",
  autoVolumetricEnabled: true,
  silhouetteClass: "medium",
  adaptiveSetExpansion: false,
  horizontalPaddingTotal: 24,
  verticalPaddingTotal: 20,
};

/**
 * Analyzes hairstyle, attire silhouette, and environment backdrop to auto-calibrate
 * optimal bounding box expansion and edge feathering.
 */
export function analyzeVolumetricSilhouette(
  input?: SilhouetteAnalysisInput
): VolumetricPaddingConfig {
  if (!input) {
    return { ...DEFAULT_VOLUMETRIC_PADDING };
  }

  const hair = `${input.haircutId || ""} ${input.haircutName || ""} ${input.hairLength || ""}`.toLowerCase();
  const outfit = `${input.outfitId || ""} ${input.outfitName || ""} ${input.outfitCategory || ""}`.toLowerCase();
  const loop = (input.sourceLoopUrl || "").toLowerCase();

  let paddingTop = 10;
  let paddingBottom = 10;
  let paddingLeft = 12;
  let paddingRight = 12;
  let featherRadius = 16;
  let boundaryDecay: BoundaryDecayCurve = "smoothstep";
  let silhouetteClass: VolumetricSilhouetteClass = "medium";
  let adaptiveSet = false;

  // 1. Hair Silhouette Classification
  const isAfroOrCoils = hair.includes("afro") || hair.includes("coil") || hair.includes("kinky") || hair.includes("texture");
  const isShortCropOrFade = hair.includes("fade") || hair.includes("buzz") || hair.includes("pixie") || hair.includes("taper") || hair.includes("crew");
  const isVolumetricCurls = hair.includes("curl") || hair.includes("wave") || hair.includes("hollywood") || hair.includes("wolf") || hair.includes("shag");
  const isUpdoOrPonytail = hair.includes("updo") || hair.includes("ponytail") || hair.includes("bun") || hair.includes("bouffant") || hair.includes("topknot");

  if (isAfroOrCoils) {
    paddingTop = Math.max(paddingTop, 30);
    paddingLeft = Math.max(paddingLeft, 35);
    paddingRight = Math.max(paddingRight, 35);
    featherRadius = Math.max(featherRadius, 28);
    silhouetteClass = "dramatic";
  } else if (isShortCropOrFade) {
    paddingTop = 8;
    paddingLeft = 8;
    paddingRight = 8;
    featherRadius = 12;
    silhouetteClass = "compact";
  } else if (isVolumetricCurls) {
    paddingTop = Math.max(paddingTop, 20);
    paddingLeft = Math.max(paddingLeft, 25);
    paddingRight = Math.max(paddingRight, 25);
    featherRadius = Math.max(featherRadius, 22);
    silhouetteClass = "volumetric";
  } else if (isUpdoOrPonytail) {
    paddingTop = Math.max(paddingTop, 32);
    paddingLeft = Math.max(paddingLeft, 16);
    paddingRight = Math.max(paddingRight, 16);
    featherRadius = Math.max(featherRadius, 20);
    if (silhouetteClass === "medium") silhouetteClass = "volumetric";
  }

  // 2. Attire Silhouette Classification
  const isPowerShoulders = outfit.includes("blazer") || outfit.includes("suit") || outfit.includes("tuxedo") || outfit.includes("shoulder") || outfit.includes("cape");
  const isFlaredGown = outfit.includes("gown") || outfit.includes("dress") || outfit.includes("sheath") || outfit.includes("flare");

  if (isPowerShoulders) {
    paddingLeft = Math.max(paddingLeft, 22);
    paddingRight = Math.max(paddingRight, 22);
    paddingTop = Math.max(paddingTop, 15);
    if (silhouetteClass === "compact") silhouetteClass = "medium";
    if (silhouetteClass === "medium") silhouetteClass = "volumetric";
  }

  if (isFlaredGown) {
    paddingBottom = Math.max(paddingBottom, 25);
    paddingLeft = Math.max(paddingLeft, 24);
    paddingRight = Math.max(paddingRight, 24);
    if (silhouetteClass === "medium") silhouetteClass = "volumetric";
  }

  // 3. Studio Set & Non-Green Chroma Adaptability
  const isVirtualSet =
    Boolean(input.isVirtualSet) ||
    loop.includes("led") ||
    loop.includes("virtual") ||
    loop.includes("studio_plate") ||
    loop.includes("newsroom") ||
    loop.includes("desk");

  if (isVirtualSet) {
    adaptiveSet = true;
    featherRadius = Math.max(featherRadius, 24);
    boundaryDecay = "cosine";
    paddingLeft = Math.min(50, paddingLeft + 5);
    paddingRight = Math.min(50, paddingRight + 5);
    paddingTop = Math.min(50, paddingTop + 5);
    paddingBottom = Math.min(50, paddingBottom + 5);
  }

  return {
    paddingTopPercent: Math.min(50, Math.max(0, paddingTop)),
    paddingBottomPercent: Math.min(50, Math.max(0, paddingBottom)),
    paddingLeftPercent: Math.min(50, Math.max(0, paddingLeft)),
    paddingRightPercent: Math.min(50, Math.max(0, paddingRight)),
    featherRadiusPixels: Math.min(64, Math.max(0, featherRadius)),
    boundaryDecay,
    autoVolumetricEnabled: true,
    silhouetteClass,
    adaptiveSetExpansion: adaptiveSet,
    horizontalPaddingTotal: Math.min(50, Math.max(0, paddingLeft)) + Math.min(50, Math.max(0, paddingRight)),
    verticalPaddingTotal: Math.min(50, Math.max(0, paddingTop)) + Math.min(50, Math.max(0, paddingBottom)),
  };
}

/**
 * Resolves volumetric padding from preset overrides or custom user adjustments.
 */
export function resolveVolumetricPadding(
  configOrOverrides?: Partial<VolumetricPaddingConfig> | null,
  baseline?: SilhouetteAnalysisInput
): VolumetricPaddingConfig {
  const base = baseline
    ? analyzeVolumetricSilhouette(baseline)
    : { ...DEFAULT_VOLUMETRIC_PADDING };

  if (!configOrOverrides) {
    return base;
  }

  return {
    ...base,
    paddingTopPercent:
      configOrOverrides.paddingTopPercent !== undefined
        ? Math.min(50, Math.max(0, configOrOverrides.paddingTopPercent))
        : base.paddingTopPercent,
    paddingBottomPercent:
      configOrOverrides.paddingBottomPercent !== undefined
        ? Math.min(50, Math.max(0, configOrOverrides.paddingBottomPercent))
        : base.paddingBottomPercent,
    paddingLeftPercent:
      configOrOverrides.paddingLeftPercent !== undefined
        ? Math.min(50, Math.max(0, configOrOverrides.paddingLeftPercent))
        : base.paddingLeftPercent,
    paddingRightPercent:
      configOrOverrides.paddingRightPercent !== undefined
        ? Math.min(50, Math.max(0, configOrOverrides.paddingRightPercent))
        : base.paddingRightPercent,
    featherRadiusPixels:
      configOrOverrides.featherRadiusPixels !== undefined
        ? Math.min(64, Math.max(0, configOrOverrides.featherRadiusPixels))
        : base.featherRadiusPixels,
    boundaryDecay: configOrOverrides.boundaryDecay || base.boundaryDecay,
    autoVolumetricEnabled:
      configOrOverrides.autoVolumetricEnabled !== undefined
        ? configOrOverrides.autoVolumetricEnabled
        : base.autoVolumetricEnabled,
    silhouetteClass: configOrOverrides.silhouetteClass || base.silhouetteClass,
    adaptiveSetExpansion:
      configOrOverrides.adaptiveSetExpansion !== undefined
        ? configOrOverrides.adaptiveSetExpansion
        : base.adaptiveSetExpansion,
    horizontalPaddingTotal:
      configOrOverrides.horizontalPaddingTotal !== undefined
        ? configOrOverrides.horizontalPaddingTotal
        : (configOrOverrides.paddingLeftPercent ?? base.paddingLeftPercent) + (configOrOverrides.paddingRightPercent ?? base.paddingRightPercent),
    verticalPaddingTotal:
      configOrOverrides.verticalPaddingTotal !== undefined
        ? configOrOverrides.verticalPaddingTotal
        : (configOrOverrides.paddingTopPercent ?? base.paddingTopPercent) + (configOrOverrides.paddingBottomPercent ?? base.paddingBottomPercent),
  };
}

/**
 * Compiles volumetric padding parameters into actionable MiniMax H3 / SAM 3.1
 * diffusion prompt clauses and negative clipping guards.
 */
export function compileVolumetricPromptDirectives(
  config: VolumetricPaddingConfig
): CompiledVolumetricDirectives {
  const hTotal = config.paddingLeftPercent + config.paddingRightPercent;
  const vTotal = config.paddingTopPercent + config.paddingBottomPercent;

  const trackingTokens: string[] = [
    "expanded_boundary",
    "uncropped_silhouette",
    "extended_bounding_box",
    `feather_${config.featherRadiusPixels}px`,
  ];

  if (hTotal >= 40) {
    trackingTokens.push("wide_lateral_crop", "full_shoulder_wingspan");
  }
  if (vTotal >= 40) {
    trackingTokens.push("tall_vertical_crop", "full_crown_headroom");
  }

  const positiveClauses: string[] = [
    `volumetric boundary expansion (+${config.paddingLeftPercent}% left, +${config.paddingRightPercent}% right, +${config.paddingTopPercent}% crown)`,
    `feathered edge transition (${config.featherRadiusPixels}px ${config.boundaryDecay} boundary decay)`,
    "uncropped natural outer perimeter with generous breathing room",
    "full natural hair fiber dispersion and natural garment shoulder silhouette",
  ];

  if (config.adaptiveSetExpansion) {
    positiveClauses.push("adaptive virtual set uncrop blending with zero compositing halos");
  }

  const negativeClauses: string[] = [
    "clipped hair edges",
    "truncated afro volume",
    "cut-off shoulder lapels",
    "flattened crown boundary",
    "harsh unblended mask border",
    "cardboard cutout boundary seam",
    "clamped bounding box edges",
    "tight mask clipping artifacts",
  ];

  const formulaBadge = `Padding: +${Math.round(hTotal / 2)}% Width, +${Math.round(vTotal / 2)}% Height (${config.featherRadiusPixels}px ${config.boundaryDecay})`;

  return {
    positiveClause: positiveClauses.join(", "),
    negativeClause: negativeClauses.join(", "),
    trackingExpansionTokens: trackingTokens,
    formulaBadge,
    horizontalPaddingTotal: hTotal,
    verticalPaddingTotal: vTotal,
  };
}

/**
 * Returns a concise, user-facing summary badge of the active volumetric padding formula.
 */
export function compileVolumetricFormulaBadge(config: VolumetricPaddingConfig): string {
  return compileVolumetricPromptDirectives(config).formulaBadge;
}

