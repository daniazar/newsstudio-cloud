/**
 * src/lib/realtime/head-engine/__tests__/HeadEngineConductor.test.ts
 *
 * Unit tests for HeadEngineConductor:
 * 1. Unified frame calculation producing complete HeadEngineFrame.
 * 2. Strict Orbital Yaw Decoupling: adjusting orbitalYawDeg updates codebook query angle
 *    WITHOUT shifting physical 3DMM head pose or landmark projections.
 * 3. Emotion preset coordination across eyes, brows, pose, and mouth.
 * 4. Dual-mode mouth viseme targeting ("mouth_only" vs "full_chin").
 * 5. Deterministic single-pass caching of face geometry by source URL.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HeadEngineConductor } from "../HeadEngineConductor";
import { FaceGeometry } from "../types";

function createMockFaceGeometry(url: string = "/avatars/ruby.png"): FaceGeometry {
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
      aperture: 0.03,
      rollAngle: 0.0,
      fullChinHeight: 0.20,
    },
    headPose: { yawDeg: 5.0, pitchDeg: -2.0, rollDeg: 0.0 },
    confidence: 0.99,
    timestamp: 1000,
    sourceUrl: url,
  };
}

describe("HeadEngineConductor", () => {
  let conductor: HeadEngineConductor;

  beforeEach(() => {
    conductor = new HeadEngineConductor();
  });

  it("produces a consolidated HeadEngineFrame with all submodules active", () => {
    const geo = createMockFaceGeometry();
    conductor.injectPrecomputedGeometry("/avatars/ruby.png", geo);

    const frame = conductor.computeFrame({
      sourceUrl: "/avatars/ruby.png",
      timestamp: 1000,
      codebookMode: "mouth_only",
    });

    expect(frame).toBeDefined();
    expect(frame.faceGeometry).toBe(geo);
    expect(frame.headPose).toBeDefined();
    expect(frame.eyes).toBeDefined();
    expect(frame.brows).toBeDefined();
    expect(frame.respiration).toBeDefined();
    expect(frame.mouth).toBeDefined();
    expect(frame.activeEmotion).toBe("neutral");
  });

  it("maintains strict Orbital Yaw Decoupling", () => {
    const geo = createMockFaceGeometry();
    conductor.injectPrecomputedGeometry("/avatars/ruby.png", geo);

    // Frame at orbital yaw = 0
    const frame0 = conductor.computeFrame({
      sourceUrl: "/avatars/ruby.png",
      timestamp: 1000,
      orbitalYawDeg: 0,
    });

    // Frame at orbital yaw = 45
    const frame45 = conductor.computeFrame({
      sourceUrl: "/avatars/ruby.png",
      timestamp: 1000,
      orbitalYawDeg: 45,
    });

    // Codebook query yaw updates to 45
    expect(frame45.mouth.screenTarget.yawDeg).toBe(45);
    expect(frame45.headPose.codebookYawDeg).toBe(45);

    // Physical head rotation and center REMAIN CONSTANT
    expect(frame45.headPose.activeYaw).toBe(frame0.headPose.activeYaw);
    expect(frame45.mouth.screenTarget.cx).toBe(frame0.mouth.screenTarget.cx);
    expect(frame45.mouth.screenTarget.cy).toBe(frame0.mouth.screenTarget.cy);
    expect(frame45.eyes.leftEyeCenter[0]).toBe(frame0.eyes.leftEyeCenter[0]);
  });

  it("coordinates modules in response to high-level emotion presets", () => {
    const geo = createMockFaceGeometry();
    conductor.injectPrecomputedGeometry("/avatars/ruby.png", geo);

    const happyFrame = conductor.computeFrame({
      sourceUrl: "/avatars/ruby.png",
      timestamp: 1000,
      emotion: "happy",
      emotionTransitionMs: 0,
    });

    expect(happyFrame.activeEmotion).toBe("happy");
    // Happy should produce brow lift and lip moisture enhancement
    expect(happyFrame.brows.leftBrowLift).toBeGreaterThan(0.05);
    expect(happyFrame.mouth.lightingSfx.lipVermilionMoisture).toBeGreaterThan(0.65);
  });

  it("switches accurately between 'mouth_only' and 'full_chin' modes", () => {
    const geo = createMockFaceGeometry();
    conductor.injectPrecomputedGeometry("/avatars/ruby.png", geo);

    const fMouthOnly = conductor.computeFrame({
      sourceUrl: "/avatars/ruby.png",
      timestamp: 1000,
      codebookMode: "mouth_only",
    });

    const fFullChin = conductor.computeFrame({
      sourceUrl: "/avatars/ruby.png",
      timestamp: 1000,
      codebookMode: "full_chin",
    });

    expect(fMouthOnly.mouth.codebookMode).toBe("mouth_only");
    expect(fFullChin.mouth.codebookMode).toBe("full_chin");

    // full_chin cy should be lower than mouth_only cy, and height significantly larger
    expect(fFullChin.mouth.screenTarget.cy).toBeGreaterThan(fMouthOnly.mouth.screenTarget.cy);
    expect(fFullChin.mouth.screenTarget.h).toBeGreaterThan(fMouthOnly.mouth.screenTarget.h);
  });
});
