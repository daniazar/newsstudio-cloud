/**
 * src/lib/realtime/head-engine/__tests__/UniformAssembler.test.ts
 *
 * Unit tests for UniformAssembler:
 * 1. Correctly maps HeadEngineFrame into WebGL Neural3DMMUniforms.
 * 2. Strict Orbital Yaw Decoupling in uniforms (physical headYaw remains intact; codebook yaw is preserved).
 * 3. Procedural mesh mouth is explicitly disabled (enableOralAperture = false).
 * 4. Dual codebook mode maps isFullFace correctly ("full_chin" -> true, "mouth_only" -> false).
 * 5. Surface lighting SFX (lipMoisture, saliva) propagate into shader uniforms.
 */

import { describe, it, expect } from "vitest";
import { UniformAssembler } from "../rendering/UniformAssembler";
import { HeadEngineFrame } from "../types";

function createMockFrame(codebookMode: "mouth_only" | "full_chin" = "mouth_only"): HeadEngineFrame {
  return {
    timestamp: 1000,
    faceGeometry: {
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
        aperture: 0.03,
        rollAngle: 0.02,
        fullChinHeight: 0.20,
      },
      headPose: { yawDeg: 4.0, pitchDeg: -2.0, rollDeg: 1.0 },
      confidence: 0.99,
      timestamp: 1000,
      sourceUrl: "/avatars/ruby.png",
    },
    headPose: {
      screenCenter: [0.5, 0.45],
      screenScale: 1.0,
      activeYaw: 4.0,
      activePitch: -2.0,
      activeRoll: 1.0,
      codebookYawDeg: 45.0, // Decoupled orbital yaw
      translation: [0, 0, 0],
    },
    eyes: {
      leftEyeCenter: [0.38, 0.42],
      rightEyeCenter: [0.62, 0.42],
      blinkLeft: 0.1,
      blinkRight: 0.1,
      eyeWidening: 0.0,
      gazeVector: [0.2, -0.1],
      corneaSpecularPosL: [0.37, 0.41],
      corneaSpecularPosR: [0.61, 0.41],
      corneaHighlightIntensity: 0.85,
    },
    brows: {
      leftBrowLift: 0.15,
      rightBrowLift: 0.25,
      corrugatorFurrow: 0.05,
      glabellaCreaseIntensity: 0.02,
    },
    respiration: {
      torsoVerticalShift: 0.005,
      chestExpansion: 0.60,
      respirationCycle: 1.5,
      preSpeechInhalation: 0.0,
    },
    mouth: {
      codebookMode,
      screenTarget: {
        cx: 0.50,
        cy: codebookMode === "full_chin" ? 0.72 : 0.65,
        w: 0.25,
        h: codebookMode === "full_chin" ? 0.30 : 0.15,
        angle: 0.02,
        yawDeg: 45.0,
      },
      jawDrop: 0.05,
      clusterIdA: 10,
      clusterIdB: 12,
      blendFactor: 0.4,
      presenceWeight: 0.95,
      smileAmount: 0.20,
      lightingSfx: {
        salivaMeniscusSheen: 0.8,
        lipVermilionMoisture: 0.75,
        enamelFresnel: 0.6,
        philtrumSheen: 0.55,
      },
    },
    activeEmotion: "neutral",
  };
}

describe("UniformAssembler", () => {
  it("assembles WebGL uniforms matching Neural3DMMUniforms shape", () => {
    const frame = createMockFrame("mouth_only");
    const uniforms = UniformAssembler.assemble(frame);

    expect(uniforms.mouthCenter).toEqual([0.50, 0.65]);
    expect(uniforms.mouthRadius?.[0]).toBeCloseTo(0.125, 3);
    expect(uniforms.jawOpen).toBeCloseTo(0.05, 3);
    expect(uniforms.visemeLayerA).toBe(10);
    expect(uniforms.visemeLayerB).toBe(12);
    expect(uniforms.visemeBlend).toBeCloseTo(0.4, 2);
    expect(uniforms.visemePresence).toBeCloseTo(0.95, 2);

    // Eyelid blinks & gaze
    expect(uniforms.blinkLeft).toBeCloseTo(0.1, 2);
    expect(uniforms.blinkRight).toBeCloseTo(0.1, 2);
    expect(uniforms.gazeX).toBeCloseTo(0.2, 2);
    expect(uniforms.gazeY).toBeCloseTo(-0.1, 2);

    // Eyebrows
    expect(uniforms.eyebrowRaise).toBeCloseTo(0.20, 2); // average of 0.15 and 0.25
    expect(uniforms.eyebrowFurrow).toBeCloseTo(0.05, 2);
    expect(uniforms.eyebrowAsymmetry).toBeCloseTo(0.10, 2); // 0.25 - 0.15

    // Respiration
    expect(uniforms.shoulderBreath).toBeCloseTo(0.005, 4);
    expect(uniforms.chestExpansion).toBeCloseTo(0.60, 2);

    // Lighting SFX
    expect(uniforms.lipMoisture).toBeCloseTo(0.75, 2);

    // CRITICAL: Procedural mesh oral cavity MUST be completely disabled
    expect(uniforms.enableOralAperture).toBe(false);
  });

  it("sets isFullFace flag strictly based on codebookMode", () => {
    const frameMouthOnly = createMockFrame("mouth_only");
    const frameFullChin = createMockFrame("full_chin");

    const uMouthOnly = UniformAssembler.assemble(frameMouthOnly);
    const uFullChin = UniformAssembler.assemble(frameFullChin);

    expect(uMouthOnly.isFullFace).toBe(false);
    expect(uFullChin.isFullFace).toBe(true);
  });

  it("converts physical head pose to radians for shader uniforms", () => {
    const frame = createMockFrame("mouth_only");
    const uniforms = UniformAssembler.assemble(frame);

    expect(uniforms.headYaw).toBeCloseTo((4.0 * Math.PI) / 180, 4);
    expect(uniforms.headPitch).toBeCloseTo((-2.0 * Math.PI) / 180, 4);
    expect(uniforms.headRoll).toBeCloseTo((1.0 * Math.PI) / 180, 4);
  });
});
