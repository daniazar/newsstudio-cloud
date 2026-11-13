import { describe, it, expect } from "vitest";
import { adaptAdScenesToTimeline } from "@/components/editor/shared/timeline/TimelineSceneAdapter";
import { COMMERCIAL_INTRO_SLOGANS } from "@/remotion/layers/ecommerce/CommercialIntroLayer";
import { COMMERCIAL_OUTRO_MESSAGES } from "@/remotion/layers/ecommerce/CommercialOutroLayer";
import { AdScene, AdIntroConfig, AdOutroConfig } from "@/lib/types/ecommerce";

describe("Commercial Intro & Outro Timeline Synchronization", () => {
  const mockScenes: AdScene[] = [
    {
      id: "scene_0",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 90,
      sceneType: "pattern_interrupt_hook",
      headline: "Stop Scrolling",
      voiceoverScript: "Look at this revolutionary flooring.",
      primaryMediaUrl: "/sample_product.png",
      visualActionPrompt: "Camera fast zooms on product with dramatic lighting",
    },
    {
      id: "scene_1",
      sceneIndex: 1,
      startFrame: 90,
      durationFrames: 120,
      sceneType: "product_turntable",
      headline: "360 Rotation",
      voiceoverScript: "100% waterproof and scratch resistant.",
      primaryMediaUrl: "/sample_product.png",
      visualActionPrompt: "Smooth 360 degree turntable rotation on marble pedestal",
    },
  ];

  it("prepends an Intro block and appends an Outro block when both are enabled", () => {
    const introConfig: AdIntroConfig = {
      enabled: true,
      durationFrames: 60, // 2.0s
      sloganId: "calidad-premium",
      customHeadline: "CALIDAD PREMIUM",
    };

    const outroConfig: AdOutroConfig = {
      enabled: true,
      durationFrames: 75, // 2.5s
      outroId: "pedi-muestras",
      promoCode: "PROMO10",
      discountPercentage: 10,
    };

    const items = adaptAdScenesToTimeline(
      mockScenes,
      30,
      undefined,
      introConfig,
      outroConfig,
      "/logo.png"
    );

    // Total items: 1 Intro + 2 Scenes + 1 Outro = 4 items
    expect(items.length).toBe(4);

    // 1. Intro Item
    const introItem = items[0];
    expect(introItem.id).toBe("intro_bumper");
    expect(introItem.index).toBe(-1);
    expect(introItem.startFrame).toBe(0);
    expect(introItem.durationFrames).toBe(60);
    expect(introItem.categoryTag).toBe("Intro Bumper");
    expect(introItem.title).toBe("CALIDAD PREMIUM");

    // 2. Scene 0 (shifted by 60 frames)
    const scene0 = items[1];
    expect(scene0.index).toBe(0);
    expect(scene0.startFrame).toBe(60);
    expect(scene0.durationFrames).toBe(90);

    // 3. Scene 1 (shifted by 60 frames: 90 + 60 = 150)
    const scene1 = items[2];
    expect(scene1.index).toBe(1);
    expect(scene1.startFrame).toBe(150);
    expect(scene1.durationFrames).toBe(120);

    // 4. Outro Item (starts after scene 1 ends: 150 + 120 = 270)
    const outroItem = items[3];
    expect(outroItem.id).toBe("outro_card");
    expect(outroItem.index).toBe(999);
    expect(outroItem.startFrame).toBe(270);
    expect(outroItem.durationFrames).toBe(75);
    expect(outroItem.categoryTag).toBe("Outro CTA");
    expect(outroItem.metadata?.promoCode).toBe("PROMO10");
  });

  it("handles disabled Intro and Outro without altering original scene timings", () => {
    const introConfig: AdIntroConfig = {
      enabled: false,
      durationFrames: 60,
    };

    const outroConfig: AdOutroConfig = {
      enabled: false,
      durationFrames: 75,
    };

    const items = adaptAdScenesToTimeline(
      mockScenes,
      30,
      undefined,
      introConfig,
      outroConfig
    );

    expect(items.length).toBe(2);
    expect(items[0].index).toBe(0);
    expect(items[0].startFrame).toBe(0);
    expect(items[0].durationFrames).toBe(90);

    expect(items[1].index).toBe(1);
    expect(items[1].startFrame).toBe(90);
    expect(items[1].durationFrames).toBe(120);
  });

  it("contains valid Spanish and English presets for both Intro slogans and Outro CTAs", () => {
    const spanishIntro = COMMERCIAL_INTRO_SLOGANS.find((s) => s.lang === "es");
    const englishIntro = COMMERCIAL_INTRO_SLOGANS.find((s) => s.lang === "en");

    expect(spanishIntro).toBeDefined();
    expect(spanishIntro?.text).toContain("Garantizada");
    expect(englishIntro).toBeDefined();
    expect(englishIntro?.text).toContain("Showcase");

    const spanishOutro = COMMERCIAL_OUTRO_MESSAGES.find((o) => o.lang === "es");
    const englishOutro = COMMERCIAL_OUTRO_MESSAGES.find((o) => o.lang === "en");

    expect(spanishOutro).toBeDefined();
    expect(spanishOutro?.cta).toContain("Pedí tus Muestras");
    expect(englishOutro).toBeDefined();
    expect(englishOutro?.cta).toContain("Shop Now");
  });
});
