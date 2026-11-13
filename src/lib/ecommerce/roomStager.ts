/**
 * src/lib/ecommerce/roomStager.ts
 *
 * Sprint E4.6 / E5 Extension: Contextual Room Visualizer Staging Engine.
 * Provides curated 3D architectural room environments, perspective plane geometry,
 * texture warping math, and lighting matrices for staging physical products
 * (Surface Materials, Bulky Furniture, Appliances, Decor).
 */

import { ProductSpec } from "@/lib/types/ecommerce";

export type StagingEnvironmentKey =
  | "living_room_modern"
  | "kitchen_minimalist"
  | "loft_industrial"
  | "bedroom_master"
  | "studio_office";

export type SurfacePlaneType = "floor" | "wall_main" | "wall_accent" | "countertop";

export interface SurfacePlane {
  type: SurfacePlaneType;
  label: string;
  // Normalized 4-point polygon vertices in percentages [x, y] (0 to 100)
  polygon: [number, number][];
  perspectivePx: number;
  rotateXDeg: number;
  rotateYDeg: number;
  rotateZDeg: number;
  scale: number;
  textureRepeat: "repeat" | "repeat-x" | "repeat-y" | "no-repeat" | "cover";
  textureScalePercent: number;
  blendMode: "normal" | "multiply" | "overlay" | "soft-light" | "hard-light";
  opacity: number;
}

export interface StagingLighting {
  ambientColor: string;
  ambientIntensity: number; // 0.0 to 1.0
  lightAngleDeg: number; // e.g. 45 degrees
  lightElevationDeg: number; // e.g. 60 degrees
  shadowSoftnessPx: number;
  shadowIntensity: number; // 0.0 to 1.0
  specularSheen: number; // 0.0 (ultra-matte) to 1.0 (high gloss)
  vignetteStrength: number; // 0.0 to 1.0
}

export interface StagingEnvironment {
  key: StagingEnvironmentKey;
  name: string;
  category: "living" | "kitchen" | "bedroom" | "office" | "commercial";
  description: string;
  defaultBackgroundUrl: string;
  planes: SurfacePlane[];
  lighting: StagingLighting;
  cameraMotion: {
    startScale: number;
    endScale: number;
    panYPixels: number;
    rotationDeg: number;
  };
}

export interface StagedRoomConfig {
  environment: StagingEnvironment;
  activePlane: SurfacePlane;
  textureUrl: string | null;
  lightingCss: {
    backgroundOverlay: string;
    vignette: string;
    contactShadow: string;
  };
  planeTransformCss: {
    transform: string;
    clipPath: string;
    filter: string;
  };
}

export interface StagingOptions {
  customTextureUrl?: string;
  planeType?: SurfacePlaneType;
  environmentKey?: StagingEnvironmentKey;
}

/**
 * Built-in Architectural Staging Environments
 */
export const STAGING_ENVIRONMENTS: Record<StagingEnvironmentKey, StagingEnvironment> = {
  living_room_modern: {
    key: "living_room_modern",
    name: "Scandinavian Living Room",
    category: "living",
    description: "Bright airy living room with floor-to-ceiling windows, natural oak elements, and neutral sofa.",
    defaultBackgroundUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1920&q=80",
    planes: [
      {
        type: "floor",
        label: "Hardwood Floor Plate",
        polygon: [
          [0, 58],
          [100, 58],
          [100, 100],
          [0, 100],
        ],
        perspectivePx: 800,
        rotateXDeg: 55,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.15,
        textureRepeat: "repeat",
        textureScalePercent: 40,
        blendMode: "multiply",
        opacity: 0.92,
      },
      {
        type: "wall_main",
        label: "Main Feature Wall",
        polygon: [
          [15, 0],
          [85, 0],
          [85, 58],
          [15, 58],
        ],
        perspectivePx: 1000,
        rotateXDeg: 0,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.0,
        textureRepeat: "cover",
        textureScalePercent: 100,
        blendMode: "overlay",
        opacity: 0.85,
      },
    ],
    lighting: {
      ambientColor: "#fff8f0",
      ambientIntensity: 0.85,
      lightAngleDeg: 45,
      lightElevationDeg: 50,
      shadowSoftnessPx: 18,
      shadowIntensity: 0.45,
      specularSheen: 0.25,
      vignetteStrength: 0.5,
    },
    cameraMotion: {
      startScale: 1.0,
      endScale: 1.06,
      panYPixels: -15,
      rotationDeg: 0,
    },
  },

  kitchen_minimalist: {
    key: "kitchen_minimalist",
    name: "European Minimalist Kitchen",
    category: "kitchen",
    description: "Sleek contemporary kitchen featuring large island, recessed warm lighting, and matte cabinetry.",
    defaultBackgroundUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1920&q=80",
    planes: [
      {
        type: "floor",
        label: "Kitchen Tile / Wood Flooring",
        polygon: [
          [0, 62],
          [100, 62],
          [100, 100],
          [0, 100],
        ],
        perspectivePx: 750,
        rotateXDeg: 58,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.2,
        textureRepeat: "repeat",
        textureScalePercent: 35,
        blendMode: "multiply",
        opacity: 0.9,
      },
      {
        type: "countertop",
        label: "Island Countertop Surface",
        polygon: [
          [20, 52],
          [80, 52],
          [90, 68],
          [10, 68],
        ],
        perspectivePx: 600,
        rotateXDeg: 65,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.0,
        textureRepeat: "repeat",
        textureScalePercent: 50,
        blendMode: "soft-light",
        opacity: 0.88,
      },
    ],
    lighting: {
      ambientColor: "#fcf8ee",
      ambientIntensity: 0.9,
      lightAngleDeg: 60,
      lightElevationDeg: 65,
      shadowSoftnessPx: 14,
      shadowIntensity: 0.55,
      specularSheen: 0.6,
      vignetteStrength: 0.4,
    },
    cameraMotion: {
      startScale: 1.0,
      endScale: 1.05,
      panYPixels: -12,
      rotationDeg: 0.5,
    },
  },

  loft_industrial: {
    key: "loft_industrial",
    name: "Urban Industrial Loft",
    category: "commercial",
    description: "Exposed brick accent wall, high ceilings, steel-framed mullion windows, and wide plank flooring.",
    defaultBackgroundUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80",
    planes: [
      {
        type: "floor",
        label: "Distressed Plank / Concrete Floor",
        polygon: [
          [0, 55],
          [100, 55],
          [100, 100],
          [0, 100],
        ],
        perspectivePx: 850,
        rotateXDeg: 52,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.18,
        textureRepeat: "repeat",
        textureScalePercent: 45,
        blendMode: "multiply",
        opacity: 0.95,
      },
      {
        type: "wall_accent",
        label: "Brick / Feature Accent Wall",
        polygon: [
          [60, 0],
          [100, 0],
          [100, 60],
          [60, 60],
        ],
        perspectivePx: 900,
        rotateXDeg: 0,
        rotateYDeg: -15,
        rotateZDeg: 0,
        scale: 1.05,
        textureRepeat: "repeat",
        textureScalePercent: 60,
        blendMode: "overlay",
        opacity: 0.82,
      },
    ],
    lighting: {
      ambientColor: "#eeddc5",
      ambientIntensity: 0.75,
      lightAngleDeg: 30,
      lightElevationDeg: 40,
      shadowSoftnessPx: 22,
      shadowIntensity: 0.65,
      specularSheen: 0.15,
      vignetteStrength: 0.65,
    },
    cameraMotion: {
      startScale: 1.02,
      endScale: 1.08,
      panYPixels: -18,
      rotationDeg: -0.5,
    },
  },

  bedroom_master: {
    key: "bedroom_master",
    name: "Warm Master Bedroom Suite",
    category: "bedroom",
    description: "Cozy master bedroom with plush upholstered bed, soft lighting, and warm hardwood floors.",
    defaultBackgroundUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1920&q=80",
    planes: [
      {
        type: "floor",
        label: "Hardwood Floor Around Bed",
        polygon: [
          [0, 65],
          [100, 65],
          [100, 100],
          [0, 100],
        ],
        perspectivePx: 700,
        rotateXDeg: 62,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.15,
        textureRepeat: "repeat",
        textureScalePercent: 38,
        blendMode: "multiply",
        opacity: 0.88,
      },
      {
        type: "wall_main",
        label: "Headboard Feature Wall",
        polygon: [
          [10, 0],
          [90, 0],
          [90, 55],
          [10, 55],
        ],
        perspectivePx: 950,
        rotateXDeg: 0,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.0,
        textureRepeat: "cover",
        textureScalePercent: 100,
        blendMode: "soft-light",
        opacity: 0.8,
      },
    ],
    lighting: {
      ambientColor: "#ffe9d6",
      ambientIntensity: 0.8,
      lightAngleDeg: 75,
      lightElevationDeg: 35,
      shadowSoftnessPx: 25,
      shadowIntensity: 0.4,
      specularSheen: 0.2,
      vignetteStrength: 0.55,
    },
    cameraMotion: {
      startScale: 1.0,
      endScale: 1.05,
      panYPixels: -10,
      rotationDeg: 0,
    },
  },

  studio_office: {
    key: "studio_office",
    name: "Architectural Studio & Office",
    category: "office",
    description: "Clean modern home office with standing desk, acoustic paneling, and herringbone floor.",
    defaultBackgroundUrl: "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=1920&q=80",
    planes: [
      {
        type: "floor",
        label: "Office Floor Surface",
        polygon: [
          [0, 60],
          [100, 60],
          [100, 100],
          [0, 100],
        ],
        perspectivePx: 800,
        rotateXDeg: 56,
        rotateYDeg: 0,
        rotateZDeg: 0,
        scale: 1.16,
        textureRepeat: "repeat",
        textureScalePercent: 42,
        blendMode: "multiply",
        opacity: 0.9,
      },
    ],
    lighting: {
      ambientColor: "#f0f4f8",
      ambientIntensity: 0.88,
      lightAngleDeg: 50,
      lightElevationDeg: 55,
      shadowSoftnessPx: 16,
      shadowIntensity: 0.5,
      specularSheen: 0.35,
      vignetteStrength: 0.45,
    },
    cameraMotion: {
      startScale: 1.0,
      endScale: 1.07,
      panYPixels: -14,
      rotationDeg: 0.2,
    },
  },
};

/**
 * Returns list of all available staging environments.
 */
export function getAvailableEnvironments(): StagingEnvironment[] {
  return Object.values(STAGING_ENVIRONMENTS);
}

/**
 * Returns a staging environment by key.
 */
export function getEnvironmentByKey(key: StagingEnvironmentKey): StagingEnvironment {
  return STAGING_ENVIRONMENTS[key] || STAGING_ENVIRONMENTS.living_room_modern;
}

/**
 * Infers the optimal room environment based on product title, description, and typology.
 */
export function inferEnvironmentForProduct(product: ProductSpec): StagingEnvironmentKey {
  const text = `${product.title} ${product.description} ${product.vendor} ${product.bulletPoints.join(" ")}`.toLowerCase();

  if (
    text.includes("kitchen") ||
    text.includes("countertop") ||
    text.includes("island") ||
    text.includes("cabinet") ||
    text.includes("backsplash") ||
    text.includes("culinary") ||
    text.includes("chef")
  ) {
    return "kitchen_minimalist";
  }

  if (
    text.includes("bedroom") ||
    text.includes("bed") ||
    text.includes("mattress") ||
    text.includes("duvet") ||
    text.includes("pillow") ||
    text.includes("nightstand") ||
    text.includes("headboard")
  ) {
    return "bedroom_master";
  }

  if (
    text.includes("desk") ||
    text.includes("office") ||
    text.includes("workstation") ||
    text.includes("chair") ||
    text.includes("studio") ||
    text.includes("monitor") ||
    text.includes("ergonomic")
  ) {
    return "studio_office";
  }

  if (
    text.includes("loft") ||
    text.includes("industrial") ||
    text.includes("concrete") ||
    text.includes("brick") ||
    text.includes("rustic") ||
    text.includes("weathered")
  ) {
    return "loft_industrial";
  }

  // Default for surface materials, flooring, and general living decor
  return "living_room_modern";
}

/**
 * Computes a CSS `polygon()` string from normalized 4-point vertex coordinates.
 */
export function computePlaneClipPath(polygon: [number, number][]): string {
  if (!polygon || polygon.length === 0) return "none";
  const points = polygon.map(([x, y]) => `${x}% ${y}%`).join(", ");
  return `polygon(${points})`;
}

/**
 * Computes a CSS 3D `transform` string for projecting planar surface textures.
 */
export function compute3DTransform(plane: SurfacePlane): string {
  return [
    `perspective(${plane.perspectivePx}px)`,
    `rotateX(${plane.rotateXDeg}deg)`,
    `rotateY(${plane.rotateYDeg}deg)`,
    `rotateZ(${plane.rotateZDeg}deg)`,
    `scale(${plane.scale})`,
  ].join(" ");
}

/**
 * Generates lighting and shadow overlay gradients.
 */
export function generateLightingGradients(lighting: StagingLighting) {
  const rad = (lighting.lightAngleDeg * Math.PI) / 180;
  const xOffset = Math.round(Math.cos(rad) * 40);
  const yOffset = Math.round(Math.sin(rad) * 40);

  // Directional sun / spotlight overlay
  const backgroundOverlay = `linear-gradient(${lighting.lightAngleDeg}deg, rgba(255,255,255,${(lighting.ambientIntensity * 0.15).toFixed(2)}) 0%, transparent 60%)`;

  // Radial vignette darkening edges
  const vignette = `radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(0,0,0,${lighting.vignetteStrength.toFixed(2)}) 100%)`;

  // Contact shadow gradient for grounding furniture or baseboards
  const contactShadow = `radial-gradient(ellipse at ${50 + xOffset}% ${80 + yOffset}%, rgba(0,0,0,${lighting.shadowIntensity.toFixed(2)}) 0%, transparent 70%)`;

  return {
    backgroundOverlay,
    vignette,
    contactShadow,
  };
}

/**
 * Main staging engine entry point:
 * Combines product metadata, architectural plate, perspective geometry, and lighting.
 */
export function stageProductInRoom(
  product: ProductSpec,
  environmentKey?: StagingEnvironmentKey,
  options?: StagingOptions
): StagedRoomConfig {
  const chosenKey = environmentKey || options?.environmentKey || inferEnvironmentForProduct(product);
  const environment = getEnvironmentByKey(chosenKey);

  // Pick target surface plane (default to first plane, typically floor)
  const planeType = options?.planeType || "floor";
  const activePlane =
    environment.planes.find((p) => p.type === planeType) || environment.planes[0];

  // Resolve texture URL (from option, hero asset, or null)
  const textureUrl =
    options?.customTextureUrl ||
    product.assets.find((a) => a.type === "hero_packshot" || a.type === "detail_macro")?.url ||
    product.assets[0]?.url ||
    null;

  const lightingCss = generateLightingGradients(environment.lighting);

  const planeTransformCss = {
    transform: compute3DTransform(activePlane),
    clipPath: computePlaneClipPath(activePlane.polygon),
    filter: `brightness(${(environment.lighting.ambientIntensity * 100).toFixed(0)}%) contrast(105%)`,
  };

  return {
    environment,
    activePlane,
    textureUrl,
    lightingCss,
    planeTransformCss,
  };
}
