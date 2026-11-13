import { describe, it, expect } from "vitest";
import { getWatermarkCoordinates } from "@/remotion/layers/ecommerce/BrandWatermarkLayer";
import { BrandWatermarkConfig, AdAspectRatio } from "@/lib/types/ecommerce";

describe("BrandWatermarkLayer Unit Tests", () => {
  it("calculates correct coordinates for 9:16 vertical orientation", () => {
    const topRight = getWatermarkCoordinates("top_right", "9:16");
    expect(topRight).toEqual({ top: 44, right: 28 });

    const topLeft = getWatermarkCoordinates("top_left", "9:16");
    expect(topLeft).toEqual({ top: 44, left: 28 });

    const bottomRight = getWatermarkCoordinates("bottom_right", "9:16");
    expect(bottomRight).toEqual({ bottom: 75, right: 28 });

    const bottomLeft = getWatermarkCoordinates("bottom_left", "9:16");
    expect(bottomLeft).toEqual({ bottom: 75, left: 28 });
  });

  it("calculates correct coordinates for 16:9 landscape orientation", () => {
    const topRight = getWatermarkCoordinates("top_right", "16:9");
    expect(topRight).toEqual({ top: 24, right: 28 });

    const bottomRight = getWatermarkCoordinates("bottom_right", "16:9");
    expect(bottomRight).toEqual({ bottom: 32, right: 28 });
  });

  it("defaults to top_right coordinates when position is undefined or fallback", () => {
    const coords = getWatermarkCoordinates(undefined as unknown as BrandWatermarkConfig["position"], "9:16");
    expect(coords).toEqual({ top: 44, right: 28 });
  });
});
