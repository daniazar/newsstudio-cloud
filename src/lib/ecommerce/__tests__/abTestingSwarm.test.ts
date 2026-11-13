/**
 * src/lib/ecommerce/__tests__/abTestingSwarm.test.ts
 *
 * Unit tests for Automated A/B Creative Testing Swarm.
 */

import { describe, it, expect } from "vitest";
import { generateCreativeSwarm } from "../abTestingSwarm";
import { ProductSpec } from "@/lib/types/ecommerce";

const MOCK_PRODUCT: ProductSpec = {
  id: "prod_floor",
  sourceUrl: "https://luxefloor.com/oak",
  title: "European White Oak Hardwood Flooring",
  vendor: "LuxeFloor",
  description: "Durable flooring.",
  bulletPoints: ["100% Waterproof", "Click-Lock DIY"],
  price: 79.99,
  compareAtPrice: 119.99,
  currency: "USD",
  inStock: true,
  typology: "surface_material",
  brand: {
    name: "LuxeFloor",
    domain: "luxefloor.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "minimalist_luxury",
    taglines: [],
  },
  variants: [],
  assets: [{ id: "a1", url: "https://luxefloor.com/hero.png", type: "hero_packshot", isPrimary: true }],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

describe("A/B Creative Testing Swarm Engine", () => {
  it("generates 3 orthogonal script variations in parallel", () => {
    const swarm = generateCreativeSwarm({
      productSpec: MOCK_PRODUCT,
      aspectRatio: "9:16",
    });

    expect(swarm.length).toBe(3);

    // Variation 1: Pain point
    expect(swarm[0].angle.angleId).toBe("pain_point");
    expect(swarm[0].script.archetype).toBe("viral_ugc");
    expect(swarm[0].script.hookHeadline).toContain("Stop Settling");

    // Variation 2: Curiosity & comparison
    expect(swarm[1].angle.angleId).toBe("curiosity_transformation");
    expect(swarm[1].script.archetype).toBe("us_vs_them");
    expect(swarm[1].script.hookHeadline).toContain("The Secret");

    // Variation 3: Urgency & price slash
    expect(swarm[2].angle.angleId).toBe("urgency_price_drop");
    expect(swarm[2].script.archetype).toBe("flash_sale");
    expect(swarm[2].script.hookHeadline).toContain("FLASH SALE LIVE");

    // All variations have 5 scenes with frame timings
    for (const item of swarm) {
      expect(item.script.scenes.length).toBe(5);
      expect(item.script.totalFrames).toBe(600);
      expect(item.script.fps).toBe(30);
    }
  });
});
