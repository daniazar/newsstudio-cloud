import { describe, it, expect } from "vitest";
import { autoDirectSceneAssetsAndModes } from "../sceneAutoDirector";
import { ProductSpec, AdScene } from "@/lib/types/ecommerce";

describe("sceneAutoDirector", () => {
  const mockSpec: ProductSpec = {
    id: "prod_floor_1",
    sourceUrl: "https://example.com/product",
    title: "Porcelanato Pulido 60x120 Calacatta Gold",
    description: "Porcelanato pulido rectificado de alta resistencia.",
    price: 18500,
    currency: "ARS",
    inStock: true,
    typology: "surface_material",
    vendor: "StoreHaus",
    bulletPoints: ["100% Impermeable", "Borde rectificado", "Alto tránsito"],
    assets: [
      { id: "a1", url: "https://example.com/hero.jpg", type: "hero_packshot", isPrimary: true },
      { id: "a2", url: "https://example.com/lifestyle.jpg", type: "lifestyle_context" },
      { id: "a3", url: "https://example.com/texture.jpg", type: "detail_macro" },
    ],
    variants: [],
    topReviews: [
      { id: "r1", author: "Mariana", rating: 5, body: "Quedó increíble en el living!", verifiedBuyer: true },
    ],
    scrapedAt: new Date().toISOString(),
    brand: {
      name: "StoreHaus",
      domain: "storehaus.com.ar",
      logoUrl: null,
      faviconUrl: null,
      appleTouchIconUrl: null,
      primaryColor: "#06b6d4",
      secondaryColor: "#f43f5e",
      surfaceColor: "#09090b",
      toneOfVoice: "minimalist_luxury",
      taglines: ["Elegancia pura"],
    },
  };

  const mockScenes: AdScene[] = [
    {
      id: "s1",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 90,
      sceneType: "room_staging", // initial generic
      headline: "¿Buscás renovar tus pisos?",
      visualActionPrompt: "Prompt 1",
      primaryMediaUrl: "https://example.com/hero.jpg",
    },
    {
      id: "s2",
      sceneIndex: 1,
      startFrame: 90,
      durationFrames: 90,
      sceneType: "room_staging",
      headline: "Por qué las cerámicas genéricas fallan vs nosotros",
      visualActionPrompt: "Prompt 2",
      primaryMediaUrl: "https://example.com/hero.jpg",
    },
    {
      id: "s3",
      sceneIndex: 2,
      startFrame: 180,
      durationFrames: 90,
      sceneType: "room_staging",
      headline: "Textura y terminación milimétrica",
      visualActionPrompt: "Prompt 3",
      primaryMediaUrl: "https://example.com/hero.jpg",
    },
    {
      id: "s4",
      sceneIndex: 3,
      startFrame: 270,
      durationFrames: 90,
      sceneType: "room_staging",
      headline: "5 Estrellas de clientes satisfechos",
      visualActionPrompt: "Prompt 4",
      primaryMediaUrl: "https://example.com/hero.jpg",
    },
    {
      id: "s5",
      sceneIndex: 4,
      startFrame: 360,
      durationFrames: 90,
      sceneType: "room_staging",
      headline: "Comprá hoy con envío gratis",
      visualActionPrompt: "Prompt 5",
      primaryMediaUrl: "https://example.com/hero.jpg",
    },
  ];

  it("assigns appropriate kinematic scene modes across all 5 scenes", () => {
    const result = autoDirectSceneAssetsAndModes(mockScenes, mockSpec);

    expect(result.matchedCount).toBe(5);
    expect(result.coveragePercent).toBe(100);

    // Scene 1: Pattern interrupt hook
    expect(result.updatedScenes[0].sceneType).toBe("pattern_interrupt_hook");
    // Scene 2: Before/after wipe (due to "vs" / "fallan")
    expect(result.updatedScenes[1].sceneType).toBe("before_after_wipe");
    // Scene 3: Macro texture zoom or room staging
    expect(["macro_texture_zoom", "room_staging"]).toContain(result.updatedScenes[2].sceneType);
    // Scene 4: Social proof review (reviews exist)
    expect(result.updatedScenes[3].sceneType).toBe("social_proof_review");
    // Scene 5: Price promo outro
    expect(result.updatedScenes[4].sceneType).toBe("price_promo_outro");
    expect(result.updatedScenes[4].removeWhiteBg).toBe(true);
  });

  it("distributes distinct product assets across scenes to avoid repetition", () => {
    const result = autoDirectSceneAssetsAndModes(mockScenes, mockSpec);

    // Check that not all scenes use the exact same primary media URL
    const urls = result.updatedScenes.map((s) => s.primaryMediaUrl);
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBeGreaterThan(1);
  });

  it("handles empty scenes gracefully", () => {
    const result = autoDirectSceneAssetsAndModes([], mockSpec);
    expect(result.updatedScenes).toEqual([]);
    expect(result.matchedCount).toBe(0);
    expect(result.coveragePercent).toBe(0);
  });

  it("automatically assigns default3dTurntableUrl when product_turntable scene mode is resolved", () => {
    // Spec without variants or reviews falls back to product_turntable on scene 4
    const specWithoutReviews: ProductSpec = {
      ...mockSpec,
      variants: [],
      topReviews: [],
    };
    const default3dUrl = "https://minio.example.com/renders/turntable.webm";
    const result = autoDirectSceneAssetsAndModes(mockScenes, specWithoutReviews, {
      default3dTurntableUrl: default3dUrl,
    });

    const turntableScene = result.updatedScenes.find((s) => s.sceneType === "product_turntable");
    expect(turntableScene).toBeDefined();
    expect(turntableScene?.turntable3dVideoUrl).toBe(default3dUrl);
  });
});
