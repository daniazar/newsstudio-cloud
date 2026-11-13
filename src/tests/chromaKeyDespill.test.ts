import { describe, it, expect } from "vitest";
import {
  calculateChromaDistance,
  calculateDespillGain,
  applyDespillColorCorrection,
} from "@/remotion/layers/ChromaKeyPresenterLayer";

describe("ChromaKeyPresenterLayer & WebGL Despill Correction", () => {
  it("calculates Euclidean RGB distance accurately", () => {
    // Pure green screen
    const distPureGreen = calculateChromaDistance(0, 255, 0, 0, 255, 0);
    expect(distPureGreen).toBe(0);

    // Pure black distance from green
    const distBlack = calculateChromaDistance(0, 0, 0, 0, 255, 0);
    expect(distBlack).toBe(255);

    // Gray (128, 128, 128)
    const distGray = calculateChromaDistance(128, 128, 128, 0, 255, 0);
    expect(distGray).toBeGreaterThan(150);
  });

  it("calculates despill green channel suppression gain", () => {
    // Spill pixel: Red = 100, Green = 180, Blue = 90
    // Green is clearly dominant over red & blue (green spill)
    const despilledG = calculateDespillGain(180, 100, 90, 0.5);
    expect(despilledG).toBeLessThanOrEqual(100);

    // Normal skin pixel: Red = 210, Green = 170, Blue = 150
    // Green is naturally below Red, should not be suppressed
    const skinG = calculateDespillGain(170, 210, 150, 0.5);
    expect(skinG).toBe(170);
  });

  it("applies despill color correction to neutralize green spill fringes", () => {
    // Green edge spill pixel on auburn hair: R=120, G=190, B=90
    const corrected = applyDespillColorCorrection(120, 190, 90, 0.85);

    // Green should be suppressed significantly
    expect(corrected.g).toBeLessThan(190);
    expect(corrected.g).toBeLessThanOrEqual(135);

    // Red warmth should be maintained or slightly compensated
    expect(corrected.r).toBeGreaterThanOrEqual(120);

    // Normal neutral gray pixel (R=100, G=100, B=100) remains untouched
    const neutral = applyDespillColorCorrection(100, 100, 100, 0.85);
    expect(neutral.r).toBe(100);
    expect(neutral.g).toBe(100);
    expect(neutral.b).toBe(100);
  });
});
