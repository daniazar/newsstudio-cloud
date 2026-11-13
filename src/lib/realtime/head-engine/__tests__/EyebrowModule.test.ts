/**
 * src/lib/realtime/head-engine/__tests__/EyebrowModule.test.ts
 *
 * Unit tests for EyebrowModule:
 * 1. Neutral baseline state.
 * 2. Symmetrical frontalis brow lift and depression.
 * 3. Asymmetrical brow expression (curious/analytical raised arch).
 * 4. Corrugator furrow and glabella crease tension curve.
 * 5. Bounded range invariants [-1.0, 1.0] and [0.0, 1.0].
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EyebrowModule } from "../modules/EyebrowModule";
import { FaceGeometry } from "../types";

function createMockFaceGeometry(): FaceGeometry {
  return {
    headCenter: [0.5, 0.45],
    box: { minX: 0.25, minY: 0.20, maxX: 0.75, maxY: 0.70, width: 0.5, height: 0.5, aspect: 1.0 },
    leftEye: {
      center: [0.38, 0.42],
      innerCorner: [0.42, 0.42],
      outerCorner: [0.32, 0.42],
      upperLid: [0.38, 0.40],
      lowerLid: [0.38, 0.44],
      aperture: 0.04,
      irisRadius: 0.025,
    },
    rightEye: {
      center: [0.62, 0.42],
      innerCorner: [0.58, 0.42],
      outerCorner: [0.68, 0.42],
      upperLid: [0.62, 0.40],
      lowerLid: [0.62, 0.44],
      aperture: 0.04,
      irisRadius: 0.025,
    },
    leftBrow: { inner: [0.43, 0.35], arch: [0.38, 0.33], outer: [0.30, 0.36], elevation: 0.07 },
    rightBrow: { inner: [0.57, 0.35], arch: [0.62, 0.33], outer: [0.70, 0.36], elevation: 0.07 },
    mouth: {
      stomion: [0.50, 0.65],
      leftCorner: [0.42, 0.65],
      rightCorner: [0.58, 0.65],
      upperLipCenter: [0.50, 0.63],
      lowerLipCenter: [0.50, 0.67],
      chinBase: [0.50, 0.85],
      width: 0.16,
      aperture: 0.02,
      rollAngle: 0.0,
      fullChinHeight: 0.20,
    },
    headPose: { yawDeg: 0, pitchDeg: 0, rollDeg: 0 },
    confidence: 0.99,
    timestamp: 1000,
    sourceUrl: "/avatars/ruby.png",
  };
}

describe("EyebrowModule", () => {
  let testModule: EyebrowModule;
  let mockGeometry: FaceGeometry;

  beforeEach(() => {
    testModule = new EyebrowModule();
    mockGeometry = createMockFaceGeometry();
  });

  it("produces neutral baseline when no expression signals are applied", () => {
    const state = testModule.update({
      geometry: mockGeometry,
      timestamp: 1000,
    });

    expect(state.leftBrowLift).toBeCloseTo(0.0, 2);
    expect(state.rightBrowLift).toBeCloseTo(0.0, 2);
    expect(state.corrugatorFurrow).toBeCloseTo(0.0, 2);
    expect(state.glabellaCreaseIntensity).toBeCloseTo(0.0, 2);
  });

  it("raises both brows symmetrically when browLift is positive", () => {
    const state = testModule.update({
      geometry: mockGeometry,
      timestamp: 1000,
      browLift: 0.6,
    });

    expect(state.leftBrowLift).toBeGreaterThan(0.5);
    expect(state.rightBrowLift).toBeGreaterThan(0.5);
    expect(state.leftBrowLift).toBeCloseTo(state.rightBrowLift, 2);
    expect(state.corrugatorFurrow).toBe(0.0);
  });

  it("handles asymmetrical brow raises correctly", () => {
    // Right brow raised, left brow slightly depressed or neutral
    const state = testModule.update({
      geometry: mockGeometry,
      timestamp: 1000,
      browLift: 0.2,
      asymmetry: 0.5, // Positive asymmetry elevates right brow relative to left
    });

    expect(state.rightBrowLift).toBeGreaterThan(state.leftBrowLift);
    expect(state.rightBrowLift).toBeGreaterThan(0.3);
  });

  it("computes corrugator furrow and glabella crease intensity", () => {
    const furrowed = testModule.update({
      geometry: mockGeometry,
      timestamp: 1000,
      browFurrow: 0.8,
    });

    expect(furrowed.corrugatorFurrow).toBeCloseTo(0.8, 2);
    // Brow lift should be pulled downward by corrugator contraction
    expect(furrowed.leftBrowLift).toBeLessThan(0.0);
    expect(furrowed.rightBrowLift).toBeLessThan(0.0);
    // Glabella crease tension should be prominent
    expect(furrowed.glabellaCreaseIntensity).toBeGreaterThan(0.6);
  });

  it("clamps all parameters strictly within defined bounds", () => {
    const extremeState = testModule.update({
      geometry: mockGeometry,
      timestamp: 1000,
      browLift: 5.0,
      browFurrow: 3.0,
      asymmetry: 2.0,
    });

    expect(extremeState.leftBrowLift).toBeLessThanOrEqual(1.0);
    expect(extremeState.leftBrowLift).toBeGreaterThanOrEqual(-1.0);
    expect(extremeState.rightBrowLift).toBeLessThanOrEqual(1.0);
    expect(extremeState.rightBrowLift).toBeGreaterThanOrEqual(-1.0);
    expect(extremeState.corrugatorFurrow).toBeLessThanOrEqual(1.0);
    expect(extremeState.corrugatorFurrow).toBeGreaterThanOrEqual(0.0);
    expect(extremeState.glabellaCreaseIntensity).toBeLessThanOrEqual(1.0);
    expect(extremeState.glabellaCreaseIntensity).toBeGreaterThanOrEqual(0.0);
  });
});
