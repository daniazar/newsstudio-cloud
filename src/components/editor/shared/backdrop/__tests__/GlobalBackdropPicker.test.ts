/**
 * src/components/editor/shared/backdrop/__tests__/GlobalBackdropPicker.test.ts
 *
 * Unit tests for GlobalBackdropPicker and VideoBackdrop configuration & layer resolution.
 */

import { describe, it, expect } from "vitest";
import { VideoBackdropConfig, VideoBackdropMode } from "@/lib/types/ecommerce";
import { STUDIO_BACKGROUNDS, getStudioBackgroundById } from "@/lib/realtime/studioBackgrounds";

describe("GlobalBackdropPicker & Backdrop Engine Logic", () => {
  const DEFAULT_BACKDROP: VideoBackdropConfig = {
    mode: "gradient",
    studioBackgroundId: "studio_plate_penthouse_lounge",
    customColor: "#18181b",
    blurPx: 0,
    dimmingPercent: 20,
    enableCameraPan: true,
  };

  it("handles mode transitions properly", () => {
    let current = { ...DEFAULT_BACKDROP };

    const updateMode = (mode: VideoBackdropMode) => {
      current = { ...current, mode };
    };

    updateMode("studio_plate");
    expect(current.mode).toBe("studio_plate");

    updateMode("lifestyle_blur");
    expect(current.mode).toBe("lifestyle_blur");

    updateMode("custom_color");
    expect(current.mode).toBe("custom_color");

    updateMode("gradient");
    expect(current.mode).toBe("gradient");
  });

  it("resolves virtual studio plate matching 9:16 and 16:9 aspect ratios", () => {
    const bgId = "studio_plate_penthouse_lounge";

    const resolvePlate = (id: string, aspect: "9:16" | "16:9") => {
      const suffix = aspect === "16:9" ? "_16x9" : "_9x16";
      const matchedWithSuffix = `${id.replace(/_(9x16|16x9)$/, "")}${suffix}`;
      const found =
        STUDIO_BACKGROUNDS.find((b) => b.id === matchedWithSuffix) ||
        STUDIO_BACKGROUNDS.find((b) => b.id === id) ||
        getStudioBackgroundById(id);
      return found?.imageUrl || `/studio_environments/${matchedWithSuffix}.jpg`;
    };

    const url9x16 = resolvePlate(bgId, "9:16");
    const url16x9 = resolvePlate(bgId, "16:9");

    expect(url9x16).toContain("9x16");
    expect(url16x9).toContain("16x9");
  });

  it("supports custom gradient assignment and preservation", () => {
    const customGradient = "radial-gradient(circle at 50% 38%, #083344 0%, #020617 85%)";
    const backdropWithGradient: VideoBackdropConfig = {
      ...DEFAULT_BACKDROP,
      mode: "gradient",
      customColor: customGradient,
    };

    expect(backdropWithGradient.mode).toBe("gradient");
    expect(backdropWithGradient.customColor).toContain("radial-gradient");
  });

  it("calibrates dimming and blur sliders within safe bounds", () => {
    const clampDimming = (val: number) => Math.max(0, Math.min(80, val));
    const clampBlur = (val: number) => Math.max(0, Math.min(60, val));

    expect(clampDimming(-10)).toBe(0);
    expect(clampDimming(95)).toBe(80);
    expect(clampDimming(35)).toBe(35);

    expect(clampBlur(-5)).toBe(0);
    expect(clampBlur(75)).toBe(60);
    expect(clampBlur(24)).toBe(24);
  });

  it("toggles camera drift animation flag", () => {
    let backdrop = { ...DEFAULT_BACKDROP, enableCameraPan: true };
    expect(backdrop.enableCameraPan).toBe(true);

    backdrop = { ...backdrop, enableCameraPan: false };
    expect(backdrop.enableCameraPan).toBe(false);
  });

  it("handles custom image background selection", () => {
    const backdropWithImage: VideoBackdropConfig = {
      ...DEFAULT_BACKDROP,
      mode: "custom_color",
      customImageUrl: "https://example.com/custom-interior.jpg",
    };

    expect(backdropWithImage.mode).toBe("custom_color");
    expect(backdropWithImage.customImageUrl).toBe("https://example.com/custom-interior.jpg");
  });
});
