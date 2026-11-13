/**
 * src/lib/ecommerce/productRelighter.ts
 *
 * AI Virtual Turntable & Studio Lighting Pedestal Engine.
 * Stages 2D product packshots onto 3D animated pedestals with 360° rotation,
 * specular sheen sweeps, real-time ground reflections, and studio lighting.
 */

import {
  ProductSpec,
  TurntablePedestalKey,
  TurntablePedestal,
} from "@/lib/types/ecommerce";

/**
 * 5 Curated Luxury Studio Pedestal Profiles
 */
export const TURNTABLE_PEDESTALS: Record<TurntablePedestalKey, TurntablePedestal> = {
  carrara_marble: {
    key: "carrara_marble",
    name: "Italian Carrara Marble",
    description: "Polished white marble cylinder with subtle grey veining and soft diffuse studio illumination.",
    surfaceColor: "#f5f6f8",
    bevelColor: "#d8dce2",
    cylinderGradient: "linear-gradient(90deg, #b8bec8 0%, #e8ebf0 35%, #ffffff 60%, #b8bec8 100%)",
    reflectionOpacity: 0.55,
    reflectionBlurPx: 1.5,
    lighting: {
      spotlightColor: "rgba(255, 255, 255, 0.85)",
      ambientIntensity: 0.88,
      rimLightColor: "#e0e7ff",
      rimLightIntensity: 0.4,
      shadowSoftness: 18,
      specularShininess: 0.6,
      particlesColor: "rgba(255, 255, 255, 0.4)",
    },
  },

  matte_obsidian: {
    key: "matte_obsidian",
    name: "Dark Matte Obsidian",
    description: "Deep volcanic matte graphite pedestal with dramatic rim lighting for tech gadgets.",
    surfaceColor: "#141518",
    bevelColor: "#282a30",
    cylinderGradient: "linear-gradient(90deg, #0d0e10 0%, #1e2025 35%, #2a2d34 60%, #0d0e10 100%)",
    reflectionOpacity: 0.4,
    reflectionBlurPx: 2.0,
    lighting: {
      spotlightColor: "rgba(6, 182, 212, 0.7)", // Cyan accent glow
      ambientIntensity: 0.72,
      rimLightColor: "#a855f7", // Purple rim
      rimLightIntensity: 0.65,
      shadowSoftness: 24,
      specularShininess: 0.8,
      particlesColor: "rgba(6, 182, 212, 0.35)",
    },
  },

  scandinavian_oak: {
    key: "scandinavian_oak",
    name: "Scandinavian White Oak",
    description: "Natural solid white oak plinth with warm sunlight sweeps and organic grain depth.",
    surfaceColor: "#d8be9f",
    bevelColor: "#bfa07d",
    cylinderGradient: "linear-gradient(90deg, #967858 0%, #c8ad8c 35%, #dfc8ab 60%, #967858 100%)",
    reflectionOpacity: 0.35,
    reflectionBlurPx: 3.0,
    lighting: {
      spotlightColor: "rgba(255, 245, 225, 0.9)",
      ambientIntensity: 0.85,
      rimLightColor: "#f59e0b",
      rimLightIntensity: 0.35,
      shadowSoftness: 16,
      specularShininess: 0.3,
      particlesColor: "rgba(251, 191, 36, 0.3)",
    },
  },

  glass_mirror: {
    key: "glass_mirror",
    name: "High-Gloss Mirror Glass",
    description: "Specular chrome mirror turntable with crisp reflections and floating light sparkles.",
    surfaceColor: "#e2e8f0",
    bevelColor: "#94a3b8",
    cylinderGradient: "linear-gradient(90deg, #64748b 0%, #cbd5e1 35%, #f8fafc 60%, #64748b 100%)",
    reflectionOpacity: 0.75,
    reflectionBlurPx: 0.8,
    lighting: {
      spotlightColor: "rgba(255, 255, 255, 0.95)",
      ambientIntensity: 0.92,
      rimLightColor: "#38bdf8",
      rimLightIntensity: 0.7,
      shadowSoftness: 12,
      specularShininess: 0.95,
      particlesColor: "rgba(255, 255, 255, 0.7)",
    },
  },

  neon_cyber: {
    key: "neon_cyber",
    name: "Neon Cyber Pulse",
    description: "Dark futuristic platform with glowing under-glow LED ring for sneakers and gaming gear.",
    surfaceColor: "#090a0f",
    bevelColor: "#ff0055",
    cylinderGradient: "linear-gradient(90deg, #050508 0%, #151824 35%, #222638 60%, #050508 100%)",
    reflectionOpacity: 0.6,
    reflectionBlurPx: 1.2,
    lighting: {
      spotlightColor: "rgba(255, 0, 85, 0.8)",
      ambientIntensity: 0.75,
      rimLightColor: "#00f0ff",
      rimLightIntensity: 0.85,
      shadowSoftness: 20,
      specularShininess: 0.9,
      particlesColor: "rgba(255, 0, 85, 0.5)",
    },
  },
};

/**
 * Returns all available pedestal configurations.
 */
export function getAvailablePedestals(): TurntablePedestal[] {
  return Object.values(TURNTABLE_PEDESTALS);
}

/**
 * Retrieves a pedestal by key with safe fallback.
 */
export function getPedestalByKey(key?: TurntablePedestalKey): TurntablePedestal {
  if (key && TURNTABLE_PEDESTALS[key]) {
    return TURNTABLE_PEDESTALS[key];
  }
  return TURNTABLE_PEDESTALS.matte_obsidian;
}

/**
 * Automatically infers the ideal pedestal profile for a product.
 */
export function inferTurntableForProduct(product: ProductSpec): TurntablePedestalKey {
  const text = `${product.title} ${product.description} ${product.vendor} ${product.bulletPoints.join(" ")}`.toLowerCase();

  // 1. Skincare / Cosmetics / Fragrance / Gourmet
  if (
    product.typology === "sensory_consumable" ||
    text.includes("serum") ||
    text.includes("cream") ||
    text.includes("perfume") ||
    text.includes("candle") ||
    text.includes("skincare") ||
    text.includes("botanical")
  ) {
    return "carrara_marble";
  }

  // 2. Jewelry / Watches / Eyewear
  if (
    text.includes("jewelry") ||
    text.includes("watch") ||
    text.includes("ring") ||
    text.includes("necklace") ||
    text.includes("sunglasses") ||
    text.includes("diamond") ||
    text.includes("gold")
  ) {
    return "glass_mirror";
  }

  // 3. Sneakers / Footwear / Gaming
  if (
    text.includes("sneaker") ||
    text.includes("shoes") ||
    text.includes("running") ||
    text.includes("gaming") ||
    text.includes("rgb") ||
    text.includes("cyber") ||
    text.includes("athletic")
  ) {
    return "neon_cyber";
  }

  // 4. Furniture / Home / Kitchenware / Wood
  if (
    product.typology === "bulky_furniture" ||
    product.typology === "surface_material" ||
    text.includes("wood") ||
    text.includes("oak") ||
    text.includes("table") ||
    text.includes("chair") ||
    text.includes("linen") ||
    text.includes("kitchen")
  ) {
    return "scandinavian_oak";
  }

  // 5. Default for Tech, Gadgets, Electronics, Discrete Objects
  return "matte_obsidian";
}

/**
 * Calculates continuous 3D rotation, pitch, and harmonic levitation.
 */
export function computeTurntableRotation(
  currentProgFrames: number,
  fps = 30,
  options?: {
    speedRpm?: number;
    mode?: "continuous" | "oscillate";
    maxAngleDeg?: number;
  }
) {
  const timeSec = currentProgFrames / fps;
  const speedRpm = options?.speedRpm ?? 6.0; // 6 rotations per minute = 36 deg/sec
  const mode = options?.mode ?? "continuous";

  let yawDeg = 0;
  if (mode === "continuous") {
    yawDeg = (timeSec * (speedRpm * 360)) / 60;
  } else {
    const maxAngle = options?.maxAngleDeg ?? 35;
    yawDeg = Math.sin((timeSec * Math.PI * 2 * speedRpm) / 60) * maxAngle;
  }

  // Floating levitation bob
  const bobYPx = Math.sin(timeSec * Math.PI * 1.5) * 6;

  // Viewing camera depression angle looking down onto pedestal
  const pitchDeg = 18 + Math.cos(timeSec * Math.PI * 0.5) * 2;

  return {
    yawDeg: yawDeg % 360,
    pitchDeg,
    bobYPx,
  };
}

/**
 * Generates deterministic atmospheric particles for cinematic studio depth.
 */
export function generateAtmosphericParticles(count = 20, seed = 42) {
  const particles: Array<{
    id: number;
    initialX: number;
    initialY: number;
    size: number;
    opacity: number;
    speed: number;
    drift: number;
  }> = [];

  let currentSeed = seed;
  const nextRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      initialX: Math.round(nextRandom() * 90 + 5), // 5% to 95%
      initialY: Math.round(nextRandom() * 70 + 10), // 10% to 80%
      size: Math.round(nextRandom() * 3 + 2), // 2px to 5px
      opacity: Number((nextRandom() * 0.45 + 0.15).toFixed(2)),
      speed: Number((nextRandom() * 0.8 + 0.3).toFixed(2)),
      drift: Number((nextRandom() * 20 - 10).toFixed(1)),
    });
  }

  return particles;
}

/**
 * Builds CSS studio cyclorama background and rim lighting gradients.
 */
export function generateStudioBackdrop(
  pedestal: TurntablePedestal,
  accentColor?: string
) {
  const rimColor = accentColor || pedestal.lighting.rimLightColor;

  const background = `radial-gradient(ellipse at 50% 35%, ${pedestal.surfaceColor}18 0%, #08090b 70%, #030305 100%)`;

  const rimGlow = `radial-gradient(circle at 50% 60%, ${rimColor}22 0%, transparent 65%)`;

  return {
    background,
    rimGlow,
  };
}
