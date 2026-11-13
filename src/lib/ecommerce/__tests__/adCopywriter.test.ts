/**
 * src/lib/ecommerce/__tests__/adCopywriter.test.ts
 *
 * Unit tests for AI Creative Director & Commercial Copywriting Engine.
 */

import { describe, it, expect } from "vitest";
import { compileAdScript } from "../adCopywriter";
import { ProductSpec } from "@/lib/types/ecommerce";

const SAMPLE_EARBUDS_SPEC: ProductSpec = {
  id: "prod_earbuds",
  sourceUrl: "https://sonictech.com/products/aerobuds",
  title: "AeroBuds Pro Active Noise Cancelling Wireless Earbuds",
  vendor: "SonicTech",
  description: "Experience pure audio clarity with titanium drivers.",
  bulletPoints: [
    "Active Noise Cancellation up to 42dB",
    "36 Hours Battery Life with case",
    "IPX7 Submersible Waterproof",
  ],
  price: 49.99,
  compareAtPrice: 99.99,
  currency: "USD",
  inStock: true,
  rating: 4.8,
  reviewCount: 320,
  typology: "discrete_object",
  brand: {
    name: "SonicTech",
    domain: "sonictech.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  },
  variants: [],
  assets: [
    {
      id: "a1",
      url: "https://cdn.example.com/earbuds_hero.png",
      type: "hero_packshot",
      isPrimary: true,
    },
  ],
  topReviews: [
    {
      id: "r1",
      author: "Alex K.",
      rating: 5,
      body: "Better than $250 alternatives. Battery lasted all week!",
      verifiedBuyer: true,
    },
  ],
  scrapedAt: new Date().toISOString(),
};

const SAMPLE_FLOORING_SPEC: ProductSpec = {
  ...SAMPLE_EARBUDS_SPEC,
  id: "prod_flooring",
  title: "European White Oak Hardwood Flooring",
  vendor: "LuxeFloor",
  typology: "surface_material",
  bulletPoints: [
    "100% Waterproof with 72-hr barrier",
    "Uniclic® DIY Interlocking with zero glue",
  ],
};

describe("AI Creative Director & Script Engine", () => {
  it("compiles viral_ugc script with 5 scenes and calculates 50% discount", () => {
    const script = compileAdScript({
      productSpec: SAMPLE_EARBUDS_SPEC,
      archetype: "viral_ugc",
      targetChannel: "tiktok_shop",
      durationSeconds: 20,
    });

    expect(script.archetype).toBe("viral_ugc");
    expect(script.targetChannel).toBe("tiktok_shop");
    expect(script.durationSeconds).toBe(20);
    expect(script.totalFrames).toBe(600);
    expect(script.fps).toBe(30);
    expect(script.discountPercentage).toBe(50);
    expect(script.scenes.length).toBe(5);

    // Verify SFX tags are frame-synchronized
    expect(script.scenes[0].sfxTag).toBe("[sfx:whoosh]");
    expect(script.scenes[1].sfxTag).toBe("[sfx:pop]");
    expect(script.scenes[2].sfxTag).toBe("[sfx:ding]");
    expect(script.scenes[4].sfxTag).toBe("[sfx:cash_register]");

    // Verify Scene 5 Outro has discount badge
    expect(script.scenes[4].featureBadgeText).toBe("50% OFF");
  });

  it("adapts scene types for surface_material (flooring/paint)", () => {
    const script = compileAdScript({
      productSpec: SAMPLE_FLOORING_SPEC,
      archetype: "pdp_showcase",
      targetChannel: "shopify_pdp",
      durationSeconds: 20,
    });

    // Scene 1 should be before_after_wipe
    expect(script.scenes[0].sceneType).toBe("before_after_wipe");
    expect(script.scenes[0].headline).toContain("Tired of Outdated, Scuffed Floors?");

    // Scene 3 should be torture_stress_test
    expect(script.scenes[2].sceneType).toBe("torture_stress_test");
    expect(script.scenes[2].headline).toContain("100% Waterproof");

    // Call to action for PDP
    expect(script.callToAction).toContain("ADD TO CART");
  });

  it("adapts script for amazon_listing channel with Prime CTA and clean narrative", () => {
    const script = compileAdScript({
      productSpec: SAMPLE_EARBUDS_SPEC,
      archetype: "amazon_compliant",
      targetChannel: "amazon_listing",
      durationSeconds: 20,
    });

    expect(script.callToAction).toContain("AVAILABLE ON AMAZON PRIME");
    // Voiceover in Scene 1 should introduce product smoothly
    expect(script.scenes[0].voiceoverScript).toContain("Introducing the AeroBuds Pro");
  });

  it("generates 100% authentic Argentine Spanish copy for Storehaus/Argentine products", () => {
    const ARGENTINE_PORCELAIN_SPEC: ProductSpec = {
      id: "prod_storehaus_1",
      sourceUrl: "https://www.storehaus.com.ar/productos/porcelanato-san-pietro",
      title: "Porcelanato Simil Madera San Pietro 20x120",
      vendor: "San Pietro",
      description: "Porcelanato rectificado de primera calidad para pisos y paredes.",
      bulletPoints: [
        "Espesor 10mm rectificado",
        "Apto para alto tránsito e impermeable",
      ],
      price: 18500,
      compareAtPrice: 24000,
      currency: "ARS",
      inStock: true,
      rating: 4.9,
      reviewCount: 45,
      typology: "surface_material",
      typologySpecifics: {
        surfaceMaterial: {
          thickness: "10mm",
          dimensions: "20x120",
          rectified: "Incorporado",
          scratchResistant: true,
          usageClass: "Alto Tránsito",
          yieldPerBox: "1.44m²",
        },
      },
      topReviews: [
        {
          id: "rev1",
          author: "Martín P.",
          rating: 5,
          body: "Quedó impecable en el living. Terminación milimétrica.",
          verifiedBuyer: true,
        },
      ],
      brand: {
        name: "San Pietro",
        domain: "storehaus.com.ar",
        logoUrl: null,
        faviconUrl: null,
        appleTouchIconUrl: null,
        primaryColor: "#06b6d4",
        secondaryColor: "#f43f5e",
        surfaceColor: "#09090b",
        toneOfVoice: "authoritative_clinical",
        taglines: [],
      },
      variants: [],
      assets: [],
      scrapedAt: new Date().toISOString(),
    };

    const script = compileAdScript({
      productSpec: ARGENTINE_PORCELAIN_SPEC,
      archetype: "pdp_showcase",
      targetChannel: "tiktok_shop",
      durationSeconds: 20,
    });

    // Check all scenes are in Spanish with Argentine voseo
    expect(script.callToAction).toBe("COMPRÁ AHORA • TOCÁ ACÁ");
    expect(script.scenes[0].headline).toContain("¿Buscás transformar tus espacios");
    expect(script.scenes[0].subheadline).toContain("Mirá la renovación");
    expect(script.scenes[0].voiceoverScript).toContain("Mirá cómo esto transforma todo por completo");
    expect(script.scenes[1].subheadline).toContain("Porcelanato rectificado con terminación milimétrica");
    expect(script.scenes[2].headline).toContain("Alto Tránsito");
    expect(script.scenes[3].headline).toContain("5.0 Estrellas • Comprador Verificado");
    expect(script.scenes[3].voiceoverScript).toContain("Los compradores confirman:");
    expect(script.scenes[4].subheadline).toContain("¡Usá el código TIKTOK15 y ahorrá más!");
    expect(script.scenes[4].voiceoverScript).toContain("¡Pedilo hoy y ahorrá un 23 por ciento!");
    expect(script.scenes[4].headline).toContain("$18.500");
  });
});

