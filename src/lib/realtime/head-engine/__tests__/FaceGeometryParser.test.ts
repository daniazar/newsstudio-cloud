/**
 * src/lib/realtime/head-engine/__tests__/FaceGeometryParser.test.ts
 *
 * Unit tests for FaceGeometryParser.
 * Verifies parsing of raw 468/478 MediaPipe landmarks into an immutable,
 * normalized FaceGeometry contract with zero hardcoded persona dependencies.
 */

import { describe, it, expect } from "vitest";
import { FaceGeometryParser, RawMediaPipeLandmark } from "../tracker/FaceGeometryParser";

// Helper to construct a synthetic 478-point MediaPipe face mesh
function createSyntheticMediaPipeLandmarks(): RawMediaPipeLandmark[] {
  const points: RawMediaPipeLandmark[] = [];
  for (let i = 0; i < 478; i++) {
    points.push({ x: 0.5, y: 0.5, z: 0.0 });
  }

  // Set known keypoints for testing
  // Nose tip & sellion
  points[1] = { x: 0.50, y: 0.52, z: -0.05 }; // nose tip
  points[168] = { x: 0.50, y: 0.38, z: -0.01 }; // sellion
  points[152] = { x: 0.50, y: 0.85, z: 0.02 }; // chin
  points[234] = { x: 0.25, y: 0.45, z: 0.08 }; // left tragus
  points[454] = { x: 0.75, y: 0.45, z: 0.08 }; // right tragus

  // Left eye
  points[133] = { x: 0.42, y: 0.40, z: 0.0 }; // inner corner
  points[33] = { x: 0.32, y: 0.40, z: 0.0 }; // outer corner
  points[159] = { x: 0.37, y: 0.38, z: 0.0 }; // upper lid
  points[145] = { x: 0.37, y: 0.42, z: 0.0 }; // lower lid
  points[468] = { x: 0.37, y: 0.40, z: -0.01 }; // iris

  // Right eye
  points[362] = { x: 0.58, y: 0.40, z: 0.0 }; // inner corner
  points[263] = { x: 0.68, y: 0.40, z: 0.0 }; // outer corner
  points[386] = { x: 0.63, y: 0.38, z: 0.0 }; // upper lid
  points[374] = { x: 0.63, y: 0.42, z: 0.0 }; // lower lid
  points[473] = { x: 0.63, y: 0.40, z: -0.01 }; // iris

  // Eyebrows
  points[107] = { x: 0.43, y: 0.34, z: 0.0 }; // left inner
  points[105] = { x: 0.37, y: 0.32, z: 0.0 }; // left arch
  points[70] = { x: 0.30, y: 0.35, z: 0.0 }; // left outer

  points[336] = { x: 0.57, y: 0.34, z: 0.0 }; // right inner
  points[334] = { x: 0.63, y: 0.32, z: 0.0 }; // right arch
  points[300] = { x: 0.70, y: 0.35, z: 0.0 }; // right outer

  // Mouth
  points[13] = { x: 0.50, y: 0.66, z: 0.0 }; // upper inner lip
  points[14] = { x: 0.50, y: 0.68, z: 0.0 }; // lower inner lip
  points[0] = { x: 0.50, y: 0.64, z: 0.0 }; // upper outer lip
  points[17] = { x: 0.50, y: 0.72, z: 0.0 }; // lower outer lip
  points[61] = { x: 0.42, y: 0.67, z: 0.0 }; // mouth left
  points[291] = { x: 0.58, y: 0.67, z: 0.0 }; // mouth right

  return points;
}

describe("FaceGeometryParser", () => {
  it("should return null if landmarks are missing or less than 468 points", () => {
    expect(FaceGeometryParser.parse([])).toBeNull();
    expect(FaceGeometryParser.parse(new Array(200).fill({ x: 0, y: 0 }))).toBeNull();
  });

  it("should accurately extract eye positions, apertures, and iris radii", () => {
    const rawLandmarks = createSyntheticMediaPipeLandmarks();
    const geo = FaceGeometryParser.parse(rawLandmarks, "test.png", 0.99);

    expect(geo).not.toBeNull();
    if (!geo) return;

    // Left eye center & aperture
    expect(geo.leftEye.center[0]).toBeCloseTo(0.37, 2);
    expect(geo.leftEye.center[1]).toBeCloseTo(0.40, 2);
    expect(geo.leftEye.aperture).toBeCloseTo(0.04, 2);
    expect(geo.leftEye.irisRadius).toBeGreaterThan(0.01);

    // Right eye center & aperture
    expect(geo.rightEye.center[0]).toBeCloseTo(0.63, 2);
    expect(geo.rightEye.center[1]).toBeCloseTo(0.40, 2);
    expect(geo.rightEye.aperture).toBeCloseTo(0.04, 2);
    expect(geo.rightEye.irisRadius).toBeGreaterThan(0.01);
  });

  it("should accurately extract mouth stomion center, aperture, and width", () => {
    const rawLandmarks = createSyntheticMediaPipeLandmarks();
    const geo = FaceGeometryParser.parse(rawLandmarks, "test.png", 0.99);

    expect(geo).not.toBeNull();
    if (!geo) return;

    // Stomion center: midpoint between upper inner (0.66) and lower inner (0.68) => 0.67
    expect(geo.mouth.stomion[0]).toBeCloseTo(0.50, 2);
    expect(geo.mouth.stomion[1]).toBeCloseTo(0.67, 2);

    // Mouth width: distance between left corner (0.42) and right corner (0.58) => 0.16
    expect(geo.mouth.width).toBeCloseTo(0.16, 2);

    // Aperture: distance between upper inner (0.66) and lower inner (0.68) => 0.02
    expect(geo.mouth.aperture).toBeCloseTo(0.02, 2);

    // Roll angle: horizontal mouth => ~0 degrees
    expect(Math.abs(geo.mouth.rollAngle)).toBeLessThan(1.0);
  });

  it("should accurately compute 3D head pose (yaw, pitch, roll)", () => {
    const rawLandmarks = createSyntheticMediaPipeLandmarks();
    const geo = FaceGeometryParser.parse(rawLandmarks, "test.png", 0.99);

    expect(geo).not.toBeNull();
    if (!geo) return;

    // Symmetric face => yaw ~ 0, roll ~ 0
    expect(Math.abs(geo.headPose.yawDeg)).toBeLessThan(2.0);
    expect(Math.abs(geo.headPose.rollDeg)).toBeLessThan(2.0);
  });

  it("should accurately calculate bounding box and head center", () => {
    const rawLandmarks = createSyntheticMediaPipeLandmarks();
    const geo = FaceGeometryParser.parse(rawLandmarks, "test.png", 0.99);

    expect(geo).not.toBeNull();
    if (!geo) return;

    expect(geo.box.minX).toBeLessThanOrEqual(0.25);
    expect(geo.box.maxX).toBeGreaterThanOrEqual(0.75);
    expect(geo.box.width).toBeGreaterThan(0.4);
    expect(geo.box.height).toBeGreaterThan(0.4);
    expect(geo.headCenter[0]).toBeCloseTo(0.5, 1);
  });
});
