/**
 * src/lib/realtime/head-engine/__tests__/HeadPoseModule.test.ts
 *
 * Unit tests for HeadPoseModule.
 * Strictly verifies that:
 * 1. Physical 3D head rotation and camera pan/zoom compute accurately.
 * 2. Orbital yaw (-90° to +90°) is DECOUPLED from physical screen coordinates:
 *    adjusting orbital yaw slider updates codebookYawDeg without moving screenCenter or activeYaw!
 */

import { describe, it, expect } from "vitest";
import { HeadPoseModule } from "../modules/HeadPoseModule";
import { FaceGeometry } from "../types";

function createMockFaceGeometry(yaw: number = 0, pitch: number = 0, roll: number = 0): FaceGeometry {
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
    headPose: { yawDeg: yaw, pitchDeg: pitch, rollDeg: roll },
    confidence: 0.99,
    timestamp: 1000,
    sourceUrl: "/avatars/ruby.png",
  };
}

describe("HeadPoseModule", () => {
  it("should compute default neutral head pose and screen center", () => {
    const geo = createMockFaceGeometry(0, 0, 0);
    const pose = HeadPoseModule.compute(geo, {
      camera: { zoom: 1.0, pan: [0, 0] },
      kinematics: { pitchDeg: 0, yawDeg: 0, rollDeg: 0, leanZ: 0, shiftX: 0, shiftY: 0 },
      orbitalYawDeg: 0,
    });

    expect(pose.activeYaw).toBeCloseTo(0, 2);
    expect(pose.activePitch).toBeCloseTo(0, 2);
    expect(pose.activeRoll).toBeCloseTo(0, 2);
    expect(pose.codebookYawDeg).toBeCloseTo(0, 2);
    expect(pose.screenCenter[0]).toBeCloseTo(0.5, 2);
    expect(pose.screenCenter[1]).toBeCloseTo(0.45, 2);
  });

  it("should apply camera zoom and pan to screenCenter without distorting rotation", () => {
    const geo = createMockFaceGeometry(0, 0, 0);
    const pose = HeadPoseModule.compute(geo, {
      camera: { zoom: 1.2, pan: [0.05, -0.02] },
      kinematics: { pitchDeg: 0, yawDeg: 0, rollDeg: 0, leanZ: 0, shiftX: 0, shiftY: 0 },
      orbitalYawDeg: 0,
    });

    expect(pose.screenScale).toBeCloseTo(1.2, 2);
    // Screen center with pan and zoom: (0.5 + (0.5 - 0.5 + 0.05) * 1.2) = 0.5 + 0.06 = 0.56
    expect(pose.screenCenter[0]).toBeCloseTo(0.56, 2);
    // Y: (0.5 + (0.45 - 0.5 - 0.02) * 1.2) = 0.5 + (-0.07 * 1.2) = 0.5 - 0.084 = 0.416
    expect(pose.screenCenter[1]).toBeCloseTo(0.416, 2);
  });

  it("CRITICAL: Orbital yaw must change codebookYawDeg WITHOUT moving physical screen center", () => {
    const geo = createMockFaceGeometry(2.0, 1.0, 0.0);
    
    // Base pose at 0 orbital yaw
    const pose0 = HeadPoseModule.compute(geo, {
      camera: { zoom: 1.0, pan: [0, 0] },
      kinematics: { pitchDeg: 1.0, yawDeg: 0, rollDeg: 0, leanZ: 0, shiftX: 0, shiftY: 0 },
      orbitalYawDeg: 0,
    });

    // Slider adjusted to +45° orbital yaw
    const pose45 = HeadPoseModule.compute(geo, {
      camera: { zoom: 1.0, pan: [0, 0] },
      kinematics: { pitchDeg: 1.0, yawDeg: 0, rollDeg: 0, leanZ: 0, shiftX: 0, shiftY: 0 },
      orbitalYawDeg: 45,
    });

    // Codebook yaw must reflect the slider for texture atlas lookup
    expect(pose0.codebookYawDeg).toBeCloseTo(2.0, 1);
    expect(pose45.codebookYawDeg).toBe(45);

    // Physical active yaw and screen coordinates must remain rock-solid identical!
    expect(pose45.activeYaw).toBe(pose0.activeYaw);
    expect(pose45.screenCenter[0]).toBeCloseTo(pose0.screenCenter[0], 4);
    expect(pose45.screenCenter[1]).toBeCloseTo(pose0.screenCenter[1], 4);
  });
});
