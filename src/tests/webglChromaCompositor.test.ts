import { describe, it, expect } from "vitest";
import {
  STUDIO_BACKGROUNDS,
  DEFAULT_STUDIO_BACKGROUND,
  getStudioBackgroundById,
  isTransparentBackground,
} from "@/lib/realtime/studioBackgrounds";
import {
  calculateChromaDistance,
  calculateDespillGain,
  applyDespillColorCorrection,
} from "@/remotion/layers/ChromaKeyPresenterLayer";

describe("Studio Backgrounds Catalog", () => {
  it("contains pre-registered studio environments", () => {
    expect(STUDIO_BACKGROUNDS.length).toBeGreaterThanOrEqual(6);

    const videowall = getStudioBackgroundById("panoramic_videowall");
    expect(videowall).toBeDefined();
    expect(videowall.name).toContain("Videowall");
    expect(videowall.imageUrl).toBe("/studio_environments/studio_master_01_panoramic_videowall.jpg");

    const financial = getStudioBackgroundById("futuristic_financial");
    expect(financial).toBeDefined();
    expect(financial.category).toBe("Financial");

    const redAlert = getStudioBackgroundById("breaking_red_alert");
    expect(redAlert).toBeDefined();
    expect(redAlert.lightingTone).toBe("red_alert");

    const custom = getStudioBackgroundById("https://example.com/custom-studio.jpg");
    expect(custom).toBeDefined();
    expect(custom.name).toContain("Custom");
    expect(custom.imageUrl).toBe("https://example.com/custom-studio.jpg");

    const transparent = getStudioBackgroundById("transparent_alpha");
    expect(transparent).toBeDefined();
    expect(transparent.category).toBe("Cyc");
    expect(transparent.imageUrl).toBe("transparent");
  });

  it("identifies transparent alpha backgrounds correctly", () => {
    expect(isTransparentBackground("transparent")).toBe(true);
    expect(isTransparentBackground("transparent_alpha")).toBe(true);
    expect(isTransparentBackground("custom_transparent_plate")).toBe(true);
    expect(isTransparentBackground("panoramic_videowall")).toBe(false);
    expect(isTransparentBackground(null)).toBe(false);
  });

  it("returns default background for invalid or null ID", () => {
    const fallback = getStudioBackgroundById("non_existent_id");
    expect(fallback).toBe(DEFAULT_STUDIO_BACKGROUND);

    const nullFallback = getStudioBackgroundById(null);
    expect(nullFallback).toBe(DEFAULT_STUDIO_BACKGROUND);
  });
});

describe("WebGL Real-Time Chroma Key & Despill Equations", () => {
  it("detects green chroma screen color values", () => {
    // Pure green screen
    const pureGreenDist = calculateChromaDistance(0, 255, 0, 0, 255, 0);
    expect(pureGreenDist).toBe(0);

    // Studio Green Screen with minor lighting variation: RGB(12, 178, 62) vs Key RGB(0, 180, 50)
    const studioGreenDist = calculateChromaDistance(12, 178, 62, 0, 180, 50);
    expect(studioGreenDist).toBeLessThan(20);
  });

  it("distinguishes presenter costume and skin from green screen", () => {
    // Ruby's Sapphire Blue Dress: R=20, G=45, B=185
    const blueDressDist = calculateChromaDistance(20, 45, 185, 0, 255, 0);
    expect(blueDressDist).toBeGreaterThan(200);

    // Anchor Skin Tone: R=220, G=170, B=145
    const skinDist = calculateChromaDistance(220, 170, 145, 0, 255, 0);
    expect(skinDist).toBeGreaterThan(160);

    // Auburn Hair: R=140, G=70, B=40
    const hairDist = calculateChromaDistance(140, 70, 40, 0, 255, 0);
    expect(hairDist).toBeGreaterThan(190);
  });

  it("applies despill correction to strip green reflection from anchor edges", () => {
    // Green spill on hair edge: R=130, G=175, B=95
    const despilled = applyDespillColorCorrection(130, 175, 95, 0.85);

    // Green channel is suppressed down towards max(R, B) = 130
    expect(despilled.g).toBeLessThan(175);
    expect(despilled.g).toBeLessThanOrEqual(137);

    // Red warmth is preserved / slightly compensated
    expect(despilled.r).toBeGreaterThanOrEqual(130);
  });
});
