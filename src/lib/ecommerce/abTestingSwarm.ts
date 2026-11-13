/**
 * src/lib/ecommerce/abTestingSwarm.ts
 *
 * Automated A/B Creative Testing Swarm.
 * Generates 3 distinct, high-converting commercial script variations across
 * orthogonal psychological angles (Pain Point, Curiosity Secret, Price Drop).
 */

import { ProductSpec, AdScript, VideoArchetype, AdAspectRatio } from "@/lib/types/ecommerce";
import { compileAdScript } from "./adCopywriter";

export interface SwarmAngleConfig {
  angleId: "pain_point" | "curiosity_transformation" | "urgency_price_drop";
  angleTitle: string;
  targetArchetype: VideoArchetype;
  recommendedVoicePersona: string;
  customHook: string;
}

export interface AdVariationSwarmItem {
  angle: SwarmAngleConfig;
  script: AdScript;
}

export const SWARM_ANGLES: SwarmAngleConfig[] = [
  {
    angleId: "pain_point",
    angleTitle: "Pain Point & Problem Agitation",
    targetArchetype: "viral_ugc",
    recommendedVoicePersona: "ryan",
    customHook: "Stop Settling For Cheap Alternatives That Don't Last",
  },
  {
    angleId: "curiosity_transformation",
    angleTitle: "Curiosity & Secret Transformation",
    targetArchetype: "us_vs_them",
    recommendedVoicePersona: "amy",
    customHook: "The Secret Pros Don't Want You To Know",
  },
  {
    angleId: "urgency_price_drop",
    angleTitle: "Direct Price Slash & Scarcity",
    targetArchetype: "flash_sale",
    recommendedVoicePersona: "bryce",
    customHook: "FLASH SALE LIVE: Limited Stock Remaining",
  },
];

export interface GenerateSwarmOptions {
  productSpec: ProductSpec;
  aspectRatio?: AdAspectRatio;
  durationSeconds?: number;
  promoCode?: string;
}

/**
 * Generates a 3-way creative testing swarm for a product.
 */
export function generateCreativeSwarm(options: GenerateSwarmOptions): AdVariationSwarmItem[] {
  const { productSpec, aspectRatio = "9:16", durationSeconds = 20, promoCode = "SWARM20" } = options;

  return SWARM_ANGLES.map((angle) => {
    const script = compileAdScript({
      productSpec,
      archetype: angle.targetArchetype,
      targetChannel: "tiktok_shop",
      aspectRatio,
      durationSeconds,
      promoCode,
      customHook: angle.customHook,
    });

    return {
      angle,
      script,
    };
  });
}
