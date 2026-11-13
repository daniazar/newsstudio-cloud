/**
 * src/lib/ecommerce/__tests__/productRelighter.test.ts
 *
 * Unit tests for AI Virtual Turntable & Studio Lighting Pedestal Engine.
 */

import { describe, it, expect } from "vitest";
import {
  getAvailablePedestals,
  getPedestalByKey,
  inferTurntableForProduct,
  computeTurntableRotation,
  generateAtmosphericParticles,
  generateStudioBackdrop,
  TURNTABLE_PEDESTALS,
} from "../productRelighter";
import { ProductSpec } from "@/lib/types/ecommerce";

const mockEarbuds: ProductSpec = {
  id: "prod-tech-1",
  sourceUrl: "https://store.example.com/products/aerobuds-pro",
  title: "AeroBuds Pro Active Noise Cancelling Earbuds",
  vendor: "Soniq Labs",
  description: "Next-gen true wireless bluetooth earbuds with 48dB active noise cancellation.",
  price: 79.99,
  currency: "USD",
  inStock: true,
  rating: 4.8,
  reviewCount: 420,
  typology: "discrete_object",
  brand: {
    name: "Soniq Labs",
    domain: "soniqlabs.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#3b82f6",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  },
  bulletPoints: ["Bluetooth 5.4 with LDAC", "Spatial 360 audio"],
  variants: [],
  assets: [],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const mockSerum: ProductSpec = {
  ...mockEarbuds,
  id: "prod-serum-1",
  title: "GlowHydra Botanical Vitamin C Radiance Serum",
  description: "Organic anti-aging facial skincare serum with pure hyaluronic acid.",
  typology: "sensory_consumable",
  bulletPoints: ["100% cold-pressed organic botanical extracts"],
};

const mockWatch: ProductSpec = {
  ...mockEarbuds,
  id: "prod-watch-1",
  title: "AeroChrono Chronograph Luxury Diamond Watch",
  description: "Handcrafted automatic stainless steel watch with diamond bezel jewelry accent.",
  bulletPoints: ["Swiss movement", "Scratch-proof sapphire crystal"],
};

const mockSneaker: ProductSpec = {
  ...mockEarbuds,
  id: "prod-shoe-1",
  title: "HyperPulse Cyber Cyberpunk Running Sneaker",
  description: "Ultra-responsive athletic running shoes with cyber aesthetic.",
  bulletPoints: ["Proprietary energy return foam"],
};

const mockTable: ProductSpec = {
  ...mockEarbuds,
  id: "prod-table-1",
  title: "Nordic Solid White Oak Coffee Table",
  description: "Minimalist handcrafted solid oak wood living room table.",
  typology: "bulky_furniture",
  bulletPoints: ["FSC certified European white oak"],
};

describe("AI Virtual Turntable & Studio Lighting Pedestal Engine", () => {
  it("provides 5 curated luxury studio pedestal profiles", () => {
    const pedestals = getAvailablePedestals();
    expect(pedestals.length).toBe(5);

    const keys = pedestals.map((p) => p.key);
    expect(keys).toContain("carrara_marble");
    expect(keys).toContain("matte_obsidian");
    expect(keys).toContain("scandinavian_oak");
    expect(keys).toContain("glass_mirror");
    expect(keys).toContain("neon_cyber");
  });

  it("retrieves pedestal by key and falls back safely on invalid key", () => {
    const marble = getPedestalByKey("carrara_marble");
    expect(marble.name).toContain("Carrara Marble");
    expect(marble.reflectionOpacity).toBeGreaterThan(0.4);

    const fallback = getPedestalByKey("unknown_pedestal" as any);
    expect(fallback.key).toBe("matte_obsidian");
  });

  describe("Pedestal Inference Matching", () => {
    it("infers carrara_marble for skincare, serum, and cosmetics", () => {
      const pedestal = inferTurntableForProduct(mockSerum);
      expect(pedestal).toBe("carrara_marble");
    });

    it("infers glass_mirror for luxury jewelry and watches", () => {
      const pedestal = inferTurntableForProduct(mockWatch);
      expect(pedestal).toBe("glass_mirror");
    });

    it("infers neon_cyber for athletic sneakers and gaming equipment", () => {
      const pedestal = inferTurntableForProduct(mockSneaker);
      expect(pedestal).toBe("neon_cyber");
    });

    it("infers scandinavian_oak for furniture, wood, and homeware", () => {
      const pedestal = inferTurntableForProduct(mockTable);
      expect(pedestal).toBe("scandinavian_oak");
    });

    it("infers matte_obsidian for tech, audio, and gadgets", () => {
      const pedestal = inferTurntableForProduct(mockEarbuds);
      expect(pedestal).toBe("matte_obsidian");
    });
  });

  describe("3D Rotation and Motion Physics", () => {
    it("computes continuous 360 rotation angle over time", () => {
      const rot0 = computeTurntableRotation(0, 30, { speedRpm: 6 });
      expect(rot0.yawDeg).toBe(0);

      // At 5 seconds (150 frames at 30fps), 6 RPM = 0.1 rev/sec = 180 degrees
      const rot5 = computeTurntableRotation(150, 30, { speedRpm: 6 });
      expect(Math.round(rot5.yawDeg)).toBe(180);

      // Pitch and levitation bob should be within expected ranges
      expect(rot5.pitchDeg).toBeGreaterThan(15);
      expect(rot5.pitchDeg).toBeLessThan(25);
      expect(Math.abs(rot5.bobYPx)).toBeLessThanOrEqual(6);
    });

    it("computes bounded oscillation mode", () => {
      const rot = computeTurntableRotation(45, 30, { mode: "oscillate", maxAngleDeg: 30 });
      expect(Math.abs(rot.yawDeg)).toBeLessThanOrEqual(30);
    });
  });

  describe("Atmospheric Particle Generator", () => {
    it("generates deterministic floating particles", () => {
      const p1 = generateAtmosphericParticles(15, 77);
      const p2 = generateAtmosphericParticles(15, 77);

      expect(p1.length).toBe(15);
      expect(p1[0].initialX).toBe(p2[0].initialX);
      expect(p1[0].initialY).toBe(p2[0].initialY);
      expect(p1[0].size).toBeGreaterThanOrEqual(2);
      expect(p1[0].opacity).toBeGreaterThan(0);
    });
  });

  describe("Studio Backdrop Generation", () => {
    it("generates cyclorama radial gradients with custom accent rim glow", () => {
      const pedestal = TURNTABLE_PEDESTALS.neon_cyber;
      const backdrop = generateStudioBackdrop(pedestal, "#00ffcc");

      expect(backdrop.background).toContain("radial-gradient");
      expect(backdrop.rimGlow).toContain("radial-gradient");
      expect(backdrop.rimGlow).toContain("#00ffcc");
    });
  });
});
