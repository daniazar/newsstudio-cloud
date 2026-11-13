/**
 * src/lib/ecommerce/__tests__/preProductionStoryboard.test.ts
 *
 * Comprehensive tests for the Pre-Production AI Storyboard Synthesizer Control Room:
 * - Deterministic & LLM persona selection
 * - Recommended integral layout template matching
 * - Bespoke English Imagen 3 & Veo 8s prompt engineering
 * - Intelligent asset mapping to scene narrative
 */

import { describe, it, expect } from "vitest";
import { compileAdScript, getBespokeEnglishPhotoPrompt } from "../adCopywriter";
import { generateCreativeAdScriptWithLlm } from "../creativeDirectorLlm";
import { ProductSpec } from "@/lib/types/ecommerce";

const SAMPLE_TECH_GADGET: ProductSpec = {
  id: "prod_smart_gimbal_4k",
  sourceUrl: "https://store.example.com/products/ai-tracking-gimbal",
  title: "Aether Pro 3-Axis AI Tracking Smartphone Gimbal Stabilizer",
  vendor: "Aether Dynamics",
  description: "Magnetic wireless charging, 360-degree face tracking, OLED status screen, ultra-compact foldable aluminum.",
  bulletPoints: [
    "AI Vision Sensor with gesture control",
    "3-Axis active anti-shake stabilization",
    "18-hour continuous battery life",
  ],
  price: 149.99,
  compareAtPrice: 199.99,
  currency: "USD",
  inStock: true,
  rating: 4.8,
  reviewCount: 342,
  typology: "discrete_object",
  brand: {
    name: "Aether Dynamics",
    domain: "aetherdynamics.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#0ea5e9",
    secondaryColor: "#6366f1",
    surfaceColor: "#0f172a",
    toneOfVoice: "playful_hype",
    taglines: ["Stabilize Every Motion"],
  },
  assets: [
    {
      id: "asset_hero_0",
      url: "https://images.example.com/gimbal_hero_packshot.jpg",
      type: "hero_packshot",
      isPrimary: true,
    },
    {
      id: "asset_detail_1",
      url: "https://images.example.com/gimbal_macro_lens.jpg",
      type: "detail_macro",
      isPrimary: false,
    },
    {
      id: "asset_lifestyle_2",
      url: "https://images.example.com/gimbal_creator_vlog.jpg",
      type: "lifestyle_context",
      isPrimary: false,
    },
  ],
  topReviews: [
    {
      id: "rev_1",
      author: "Sarah K.",
      rating: 5,
      body: "The AI tracking never loses my face even during fast dance moves. Essential for TikTok.",
      verifiedBuyer: true,
    },
  ],
  variants: [],
  scrapedAt: new Date().toISOString(),
};

const SAMPLE_SURFACE_MATERIAL: ProductSpec = {
  id: "prod_marble_porcelain_tile",
  sourceUrl: "https://store.example.com/products/calacatta-gold-porcelain",
  title: "Calacatta Gold Polished Porcelain Tile 60x120cm",
  vendor: "Porcelanosa Elite",
  description: "Rectified edges, mirror polish, waterproof residential & commercial floor tile.",
  bulletPoints: [
    "Mirror polished finish with gold veining",
    "Rectified zero-grout edges",
    "Impervious to stains and moisture",
  ],
  price: 54.0,
  compareAtPrice: 72.0,
  currency: "USD",
  inStock: true,
  rating: 4.95,
  reviewCount: 88,
  typology: "surface_material",
  typologySpecifics: {
    surfaceMaterial: {
      thickness: "9.5mm",
      dimensions: "60x120cm",
      rectified: "Standard Rectified",
      scratchResistant: true,
      usageClass: "Heavy Commercial",
      yieldPerBox: "1.44 m²",
    },
  },
  brand: {
    name: "Porcelanosa Elite",
    domain: "porcelanosa-elite.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#d97706",
    secondaryColor: "#059669",
    surfaceColor: "#1c1917",
    toneOfVoice: "authoritative_clinical",
    taglines: ["Architectural Excellence"],
  },
  assets: [
    {
      id: "tile_hero",
      url: "https://images.example.com/calacatta_hero.jpg",
      type: "hero_packshot",
      isPrimary: true,
    },
    {
      id: "tile_living_room",
      url: "https://images.example.com/calacatta_living_room.jpg",
      type: "lifestyle_context",
      isPrimary: false,
    },
  ],
  topReviews: [],
  variants: [],
  scrapedAt: new Date().toISOString(),
};

describe("Pre-Production Storyboard Engine", () => {
  describe("compileAdScript Deterministic Defaults", () => {
    it("assigns typology-matched persona and layout template for discrete objects", () => {
      const script = compileAdScript({
        productSpec: SAMPLE_TECH_GADGET,
        archetype: "pdp_showcase",
        targetChannel: "tiktok_shop",
        aspectRatio: "9:16",
        durationSeconds: 20,
      });

      expect(script.selectedPersonaId).toBe("diego");
      expect(script.personaReasoning).toContain("discrete object");
      expect(script.recommendedTemplateId).toBe("top_subtitles");
      expect(script.templateReasoning).toBeDefined();
    });

    it("assigns luxury anchor Ruby Vance for surface materials", () => {
      const script = compileAdScript({
        productSpec: SAMPLE_SURFACE_MATERIAL,
        archetype: "pdp_showcase",
        targetChannel: "shopify_pdp",
        aspectRatio: "9:16",
        durationSeconds: 20,
      });

      expect(script.selectedPersonaId).toBe("ruby_vance");
      expect(script.personaReasoning).toContain("surface material");
      expect(script.recommendedTemplateId).toBe("product_dominant");
    });

    it("engineers bespoke English Imagen 3 and Veo 8s prompts", () => {
      const script = compileAdScript({
        productSpec: SAMPLE_TECH_GADGET,
        archetype: "pdp_showcase",
      });

      expect(script.bespokePhotoPrompt).toBeDefined();
      expect(script.bespokePhotoPrompt).toContain("Clean minimalist studio photography");
      expect(script.bespokePhotoPrompt).toContain("Aether Pro 3-Axis AI Tracking Smartphone Gimbal Stabilizer");
      expect(script.bespokePhotoPrompt).toContain("8k");

      expect(script.bespokeVeoPrompt).toBeDefined();
      expect(script.bespokeVeoPrompt).toContain("Smooth floating aerial glide");
      expect(script.bespokeVeoPrompt).toContain("Aether Pro 3-Axis AI Tracking Smartphone Gimbal Stabilizer");
      expect(script.bespokeVeoPrompt).toContain("8k photorealistic commercial quality");
    });

    it("maps harvested assets to scenes with primaryMediaUrl", () => {
      const script = compileAdScript({
        productSpec: SAMPLE_TECH_GADGET,
        archetype: "pdp_showcase",
      });

      expect(script.scenes.length).toBeGreaterThan(0);
      expect(script.scenes[0].primaryMediaUrl).toBe("https://images.example.com/gimbal_hero_packshot.jpg");
    });
  });

  describe("getBespokeEnglishPhotoPrompt standalone generator", () => {
    it("incorporates technical dimensions and thickness for architectural surfaces", () => {
      const prompt = getBespokeEnglishPhotoPrompt(SAMPLE_SURFACE_MATERIAL);

      expect(prompt).toContain("Calacatta Gold Polished Porcelain Tile 60x120cm");
      expect(prompt).toContain("modern luxury living room");
      expect(prompt).toContain("Hasselblad medium format");
    });
  });

  describe("generateCreativeAdScriptWithLlm Pre-Production Synthesis", () => {
    it("returns complete storyboard package with persona, template, prompts, and scene breakdown", async () => {
      const result = await generateCreativeAdScriptWithLlm({
        productSpec: SAMPLE_TECH_GADGET,
        archetype: "viral_ugc",
        targetChannel: "tiktok_shop",
        aspectRatio: "9:16",
        durationSeconds: 20,
        userCreativeDirection: "Focus on solo content creators needing automated tracking",
        apiKey: "", // empty forces deterministic fallback
      });

      expect(result.script).toBeDefined();
      expect(result.script.scenes.length).toBe(5);
      expect(result.script.selectedPersonaId).toBe("diego");
      expect(result.script.recommendedTemplateId).toBe("top_subtitles");
      expect(result.script.bespokePhotoPrompt).toContain("studio photography");
      expect(result.script.bespokeVeoPrompt).toContain("Smooth floating aerial glide");

      // Verify each scene has duration, startFrame, and valid primaryMediaUrl
      result.script.scenes.forEach((scene, idx) => {
        expect(scene.sceneIndex).toBe(idx);
        expect(scene.durationFrames).toBeGreaterThan(0);
        expect(scene.startFrame).toBeGreaterThanOrEqual(0);
        expect(scene.primaryMediaUrl).toBeDefined();
        expect(scene.voiceoverScript).toBeDefined();
        expect(scene.headline).toBeDefined();
      });
    });
  });
});
