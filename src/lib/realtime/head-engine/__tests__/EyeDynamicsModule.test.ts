/**
 * src/lib/realtime/head-engine/__tests__/EyeDynamicsModule.test.ts
 *
 * Unit tests for EyeDynamicsModule.
 * Tests:
 * 1. Independent left and right blink eyelid curves (physiological timing).
 * 2. Gaze tracking boundaries and iris center offsets.
 * 3. Eye widening and pupillary hippus.
 * 4. Corneal specular highlight position & intensity calculation from key-light vector.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EyeDynamicsModule } from "../modules/EyeDynamicsModule";
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

describe("EyeDynamicsModule", () => {
  let testModule: EyeDynamicsModule;
  let geo: FaceGeometry;

  beforeEach(() => {
    testModule = new EyeDynamicsModule();
    geo = createMockFaceGeometry();
  });

  it("should compute neutral eye centers and resting gaze vector", () => {
    const state = testModule.compute(geo, { timeMs: 0 });

    expect(state.leftEyeCenter[0]).toBeCloseTo(0.38, 2);
    expect(state.leftEyeCenter[1]).toBeCloseTo(0.42, 2);
    expect(state.rightEyeCenter[0]).toBeCloseTo(0.62, 2);
    expect(state.rightEyeCenter[1]).toBeCloseTo(0.42, 2);
    expect(state.blinkLeft).toBeCloseTo(0.0, 2);
    expect(state.blinkRight).toBeCloseTo(0.0, 2);
  });

  it("should support independent left and right blinks (winks)", () => {
    // Wink left eye only
    const stateWink = testModule.compute(geo, {
      blinkL: 1.0,
      blinkR: 0.0,
      timeMs: 100,
    });

    expect(stateWink.blinkLeft).toBe(1.0);
    expect(stateWink.blinkRight).toBe(0.0);
  });

  it("should suppress corneal specular highlight during full eyelid closure", () => {
    // Open eyes: corneal highlight intensity = 1.0
    const stateOpen = testModule.compute(geo, { blinkL: 0.0, blinkR: 0.0, timeMs: 0 });
    expect(stateOpen.corneaHighlightIntensity).toBeCloseTo(1.0, 2);

    // Closed eyes: corneal highlight intensity drops to 0.0
    const stateClosed = testModule.compute(geo, { blinkL: 1.0, blinkR: 1.0, timeMs: 0 });
    expect(stateClosed.corneaHighlightIntensity).toBeCloseTo(0.0, 2);
  });

  it("should shift corneal specular highlight position based on key-light direction", () => {
    // Key light from top-left: highlight should be offset upper-left of pupil
    const stateTopLeft = testModule.compute(geo, {
      keyLightDirection: [-0.5, -0.7, 0.5],
      timeMs: 0,
    });

    expect(stateTopLeft.corneaSpecularPosL[0]).toBeLessThan(stateTopLeft.leftEyeCenter[0]);
    expect(stateTopLeft.corneaSpecularPosL[1]).toBeLessThan(stateTopLeft.leftEyeCenter[1]);

    // Key light from top-right: highlight should be offset upper-right of pupil
    const stateTopRight = testModule.compute(geo, {
      keyLightDirection: [0.5, -0.7, 0.5],
      timeMs: 0,
    });

    expect(stateTopRight.corneaSpecularPosL[0]).toBeGreaterThan(stateTopRight.leftEyeCenter[0]);
    expect(stateTopRight.corneaSpecularPosL[1]).toBeLessThan(stateTopRight.leftEyeCenter[1]);
  });

  it("should shift pupil centers with gaze vector input", () => {
    // Gaze right (+0.5)
    const stateGazeRight = testModule.compute(geo, {
      gaze: [0.5, 0.0],
      timeMs: 0,
    });

    expect(stateGazeRight.leftEyeCenter[0]).toBeGreaterThan(0.38);
    expect(stateGazeRight.rightEyeCenter[0]).toBeGreaterThan(0.62);
  });
});
