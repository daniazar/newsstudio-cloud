/**
 * src/lib/ecommerce/__tests__/creativeDirectorLlm.test.ts
 *
 * Unit tests for Unified AI SDK Gateway Creative Director & Storyboard Engine.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCreativeAdScriptWithLlm,
  CreativeDirectionSchema,
} from "../creativeDirectorLlm";
import { ProductSpec } from "@/lib/types/ecommerce";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

const SAMPLE_ARGENTINE_PRODUCT: ProductSpec = {
  id: "prod_revestimiento_1",
  sourceUrl: "https://www.storehaus.com.ar/productos/revestimiento-eps-roble",
  title: "Revestimiento Pared EPS Roble Miel y Negro 12x290cm",
  vendor: "Max Core",
  description: "Revestimiento de poliestireno extruido de alta densidad, impermeable para interiores.",
  bulletPoints: [
    "100% impermeable apto para baños y cocinas",
    "Aislación termoacústica de alto rendimiento",
    "Instalación limpia sin obra húmeda",
  ],
  price: 24500,
  compareAtPrice: 32000,
  currency: "ARS",
  inStock: true,
  rating: 4.9,
  reviewCount: 58,
  typology: "surface_material",
  typologySpecifics: {
    surfaceMaterial: {
      thickness: "12mm",
      dimensions: "12x290cm",
      scratchResistant: true,
      usageClass: "Uso Interior Residencial y Comercial",
      yieldPerBox: "2.5m²",
    },
  },
  brand: {
    name: "StoreHaus",
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
  assets: [
    {
      id: "a1",
      url: "https://dcdn-us.mitiendanube.com/stores/006/100/594/products/sample.webp",
      type: "hero_packshot",
      isPrimary: true,
    },
  ],
  topReviews: [
    {
      id: "r1",
      author: "Gonzalo F.",
      rating: 5,
      body: "Excelente terminación. Cambió el living en un fin de semana.",
      verifiedBuyer: true,
    },
  ],
  variants: [],
  scrapedAt: new Date().toISOString(),
};

describe("Unified AI Creative Director", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates authentic Argentine Spanish ad copy with deterministic fallback when no API key", async () => {
    // Calling with empty apiKey forces deterministic fallback
    const result = await generateCreativeAdScriptWithLlm({
      productSpec: SAMPLE_ARGENTINE_PRODUCT,
      archetype: "pdp_showcase",
      targetChannel: "tiktok_shop",
      durationSeconds: 15,
      apiKey: "", // empty forces fallback
    });

    expect(result.generatedBy).toBe("fallback_deterministic");
    expect(result.langInfo.isSpanish).toBe(true);
    expect(result.langInfo.isArgentine).toBe(true);
    expect(result.script.scenes.length).toBe(5);
    expect(result.script.callToAction).toBe("COMPRÁ AHORA • TOCÁ ACÁ");

    // Check Argentine voseo throughout
    expect(result.script.scenes[0].headline).toContain("¿Buscás transformar");
    expect(result.script.scenes[0].voiceoverScript).toContain("Mirá cómo esto transforma");
    expect(result.script.scenes[3].voiceoverScript).toContain("Los compradores confirman:");
    expect(result.script.scenes[4].subheadline).toContain("¡Usá el código");
  });

  it("assigns frame-synchronized timecodes and SFX triggers across all scenes", async () => {
    const result = await generateCreativeAdScriptWithLlm({
      productSpec: SAMPLE_ARGENTINE_PRODUCT,
      archetype: "viral_ugc",
      durationSeconds: 20,
      apiKey: "",
    });

    expect(result.script.fps).toBe(30);
    expect(result.script.totalFrames).toBe(600);

    const scenes = result.script.scenes;
    expect(scenes[0].startFrame).toBe(0);
    expect(scenes[0].sfxTag).toBe("[sfx:whoosh]");
    expect(scenes[scenes.length - 1].sfxTag).toBe("[sfx:cash_register]");
  });

  it("plans bespoke custom Google Veo prompts and camera cues for custom product scenes", async () => {
    const result = await generateCreativeAdScriptWithLlm({
      productSpec: SAMPLE_ARGENTINE_PRODUCT,
      archetype: "pdp_showcase",
      durationSeconds: 15,
      apiKey: "",
    });

    const scenes = result.script.scenes;
    expect(scenes.length).toBeGreaterThan(0);
    for (const scene of scenes) {
      expect(scene.customVeoPrompt).toBeDefined();
      expect(typeof scene.customVeoPrompt).toBe("string");
      expect(scene.customVeoPrompt!.length).toBeGreaterThan(20);
      expect(scene.cameraCue).toBeDefined();
    }
    expect(scenes[0].customVeoPrompt).toContain("luxury living room");
    expect(scenes[0].customVeoPrompt).toContain(SAMPLE_ARGENTINE_PRODUCT.title);
    expect(scenes[0].cameraCue).toBe("drone_flyover");
  });

  it("generates bespoke storyboard via generateLlmObject with Zod schema validation", async () => {
    const mockStoryboard = {
      selectedPersona: {
        personaId: "ruby_vance",
        reasoning: "Perfect prestige tone for luxury surface materials",
      },
      recommendedTemplate: {
        templateId: "product_dominant",
        reasoning: "Large-scale surface material visual dominance",
      },
      bespokePrompts: {
        photoPrompt: "A hyper-photorealistic modern penthouse wall paneling photo",
        videoPrompt: "8k drone flyover of luxurious living room wall panels",
      },
      hookHeadline: "¿CANSADO DE PAREDES ABURRIDAS?",
      callToAction: "COMPRÁ ONLINE • ENVÍO GRATIS",
      scenes: [
        {
          sceneType: "pattern_interrupt_hook",
          assignedAssetIndex: 0,
          headline: "TRANSFORMÁ TU LIVING EN UN DÍA",
          subheadline: "Sin obra húmeda, sin polvo y 100% impermeable",
          visualActionPrompt: "Presenter demonstrates snap-fit EPS paneling",
          customVeoPrompt: "Ruby Vance in luxury modern living room presenting wall panels",
          cameraCue: "drone_flyover",
          voiceoverScript: "Mirá cómo podés renovar tu living en solo una tarde.",
          spokenVoiceoverScript: "Mirá cómo podés renovar tu living en solo una tarde.",
          featureBadgeText: "100% IMPERMEABLE",
          sfxTag: "[sfx:whoosh]",
        },
        {
          sceneType: "3d_exploded_blueprint",
          assignedAssetIndex: 0,
          headline: "TECNOLOGÍA EPS ULTRA RESISTENTE",
          subheadline: "Aislación termoacústica de máxima densidad",
          visualActionPrompt: "Exploded 3D view of internal core structure",
          customVeoPrompt: "Macro close-up camera move over EPS panel texture",
          cameraCue: "dolly_in_slow",
          voiceoverScript: "Poliestireno extruido de alta resistencia.",
          spokenVoiceoverScript: "Poliestireno extruido de alta resistencia.",
          featureBadgeText: "12MM ESPESOR",
          sfxTag: "[sfx:pop]",
        },
        {
          sceneType: "price_promo_outro",
          assignedAssetIndex: 0,
          headline: "APROVECHÁ HOY 23% OFF",
          subheadline: "Cuotas sin interés y envío inmediato",
          visualActionPrompt: "Promo badge animated overlay with button",
          customVeoPrompt: "Studio camera pull back revealing full transformed room",
          cameraCue: "dolly_out_reveal",
          voiceoverScript: "Pedí el tuyo hoy con descuento exclusivo.",
          spokenVoiceoverScript: "Pedí el tuyo hoy con descuento exclusivo.",
          featureBadgeText: "23% OFF",
          sfxTag: "[sfx:cash_register]",
        },
      ],
    };

    generateLlmObjectMock.mockResolvedValueOnce({
      object: mockStoryboard,
      providerUsed: "ollama",
      modelUsed: "qwen2.5:3b",
    });

    const result = await generateCreativeAdScriptWithLlm({
      productSpec: SAMPLE_ARGENTINE_PRODUCT,
      apiKey: "test-valid-key",
      durationSeconds: 15,
    });

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.schemaName).toBe("CreativeDirection");
    expect(callArgs.schema).toBe(CreativeDirectionSchema);

    expect(result.generatedBy).toBe("ollama");
    expect(result.script.scenes.length).toBe(3);
    expect(result.script.selectedPersonaId).toBe("ruby_vance");
    expect(result.script.recommendedTemplateId).toBe("product_dominant");
    expect(result.script.hookHeadline).toBe("¿CANSADO DE PAREDES ABURRIDAS?");
  });

  it("allows automatic LLM routing even when apiKey option is undefined", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: {
        hookHeadline: "Bespoke Headline",
        callToAction: "COMPRÁ YA",
        scenes: [
          { sceneType: "hook", headline: "H1", visualActionPrompt: "A1", voiceoverScript: "V1" },
          { sceneType: "benefit", headline: "H2", visualActionPrompt: "A2", voiceoverScript: "V2" },
          { sceneType: "cta", headline: "H3", visualActionPrompt: "A3", voiceoverScript: "V3" },
        ],
      },
      providerUsed: "ollama",
      modelUsed: "qwen3.5:9b",
    });

    const result = await generateCreativeAdScriptWithLlm({
      productSpec: SAMPLE_ARGENTINE_PRODUCT,
      durationSeconds: 15,
      // no apiKey passed
    });

    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    expect(result.generatedBy).toBe("ollama");
    expect(result.script.scenes.length).toBe(3);
  });

  it("handles schema validation anomalies gracefully via .catch()", () => {
    // Malformed selectedPersona as string instead of object, invalid scenes shape
    const parsed = CreativeDirectionSchema.parse({
      selectedPersona: "invalid-string",
      scenes: "invalid-non-array",
    });

    expect(parsed.selectedPersona).toBeUndefined();
    expect(parsed.scenes).toEqual([]);
  });

  it("falls back to deterministic compiler if LLM generation throws", async () => {
    generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM rate limit"));

    const result = await generateCreativeAdScriptWithLlm({
      productSpec: SAMPLE_ARGENTINE_PRODUCT,
      apiKey: "test-valid-key",
      durationSeconds: 15,
    });

    expect(result.generatedBy).toBe("fallback_deterministic");
    expect(result.script.scenes.length).toBe(5);
  });
});
