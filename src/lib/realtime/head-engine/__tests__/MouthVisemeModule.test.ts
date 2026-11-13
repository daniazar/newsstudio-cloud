/**
 * src/lib/realtime/head-engine/__tests__/MouthVisemeModule.test.ts
 *
 * Unit tests for MouthVisemeModule:
 * 1. Supports "mouth_only" mode (tight stomion oval centered on lip meeting point).
 * 2. Supports "full_chin" mode (extended mandibular bounding box down to chinBase landmark 152).
 * 3. Exact dynamic coordinate tracking from FaceGeometry (NO fixed or hardcoded defaults).
 * 4. Surface lighting SFX calculation (saliva meniscus peak during subtle parting, enamel Fresnel, vermilion moisture).
 * 5. Cluster ID selection and blend factor interpolation.
 * 6. Decoupled codebook yaw propagation (orbital yaw is strictly passed to query codebook, not physical geometry).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MouthVisemeModule } from "../modules/MouthVisemeModule";
import { FaceGeometry } from "../types";

function createMockFaceGeometry(stomionY = 0.65, chinY = 0.85): FaceGeometry {
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
      stomion: [0.50, stomionY],
      leftCorner: [0.42, stomionY],
      rightCorner: [0.58, stomionY],
      upperLipCenter: [0.50, stomionY - 0.02],
      lowerLipCenter: [0.50, stomionY + 0.02],
      chinBase: [0.50, chinY],
      width: 0.16,
      aperture: 0.04,
      rollAngle: 0.0,
      fullChinHeight: chinY - stomionY,
    },
    headPose: { yawDeg: 0, pitchDeg: 0, rollDeg: 0 },
    confidence: 0.99,
    timestamp: 1000,
    sourceUrl: "/avatars/ruby.png",
  };
}

describe("MouthVisemeModule", () => {
  let testModule: MouthVisemeModule;

  beforeEach(() => {
    testModule = new MouthVisemeModule();
  });

  it("calculates 'mouth_only' target centered directly on stomion", () => {
    const geo = createMockFaceGeometry(0.65, 0.85);
    const state = testModule.update({
      geometry: geo,
      mode: "mouth_only",
      clusterA: 12,
      clusterB: 14,
      blendFactor: 0.5,
    });

    expect(state.codebookMode).toBe("mouth_only");
    // Target center must align with stomion
    expect(state.screenTarget.cx).toBeCloseTo(0.50, 3);
    expect(state.screenTarget.cy).toBeCloseTo(0.65, 3);
    // Mouth-only width and height are focused tightly on lips
    expect(state.screenTarget.w).toBeGreaterThan(geo.mouth.width);
    expect(state.screenTarget.h).toBeLessThan(geo.mouth.fullChinHeight * 1.5);
  });

  it("calculates 'full_chin' target extended to encompass chinBase (landmark 152)", () => {
    const geo = createMockFaceGeometry(0.65, 0.85);
    const state = testModule.update({
      geometry: geo,
      mode: "full_chin",
      clusterA: 5,
    });

    expect(state.codebookMode).toBe("full_chin");
    // Center must shift downwards towards chin base
    expect(state.screenTarget.cy).toBeGreaterThan(geo.mouth.stomion[1]);
    expect(state.screenTarget.cy).toBeLessThan(geo.mouth.chinBase[1]);
    // Target height must enclose full stomion-to-chin distance
    expect(state.screenTarget.h).toBeGreaterThan(geo.mouth.fullChinHeight * 1.2);
  });

  it("tracks dynamic coordinates faithfully across different avatars without hardcoded offsets", () => {
    // Avatar A: high stomion at 0.58, chin at 0.76
    const geoA = createMockFaceGeometry(0.58, 0.76);
    const stateA = testModule.update({ geometry: geoA, mode: "mouth_only" });

    // Avatar B: low stomion at 0.68, chin at 0.90
    const geoB = createMockFaceGeometry(0.68, 0.90);
    const stateB = testModule.update({ geometry: geoB, mode: "mouth_only" });

    expect(stateA.screenTarget.cy).toBeCloseTo(0.58, 3);
    expect(stateB.screenTarget.cy).toBeCloseTo(0.68, 3);
    expect(stateB.screenTarget.cy).not.toEqual(stateA.screenTarget.cy);
  });

  it("peaks saliva meniscus sheen during subtle lip parting (0.02 - 0.08 aperture)", () => {
    const geoClosed = createMockFaceGeometry();
    geoClosed.mouth.aperture = 0.001; // closed

    const geoParted = createMockFaceGeometry();
    geoParted.mouth.aperture = 0.045; // ideal saliva string parting

    const geoWide = createMockFaceGeometry();
    geoWide.mouth.aperture = 0.22; // wide open, saliva strings broken

    const sClosed = testModule.update({ geometry: geoClosed });
    const sParted = testModule.update({ geometry: geoParted });
    const sWide = testModule.update({ geometry: geoWide });

    expect(sParted.lightingSfx.salivaMeniscusSheen).toBeGreaterThan(sClosed.lightingSfx.salivaMeniscusSheen);
    expect(sParted.lightingSfx.salivaMeniscusSheen).toBeGreaterThan(sWide.lightingSfx.salivaMeniscusSheen);
  });

  it("calculates enamel Fresnel reflections when aperture exposes teeth", () => {
    const geoClosed = createMockFaceGeometry();
    geoClosed.mouth.aperture = 0.005;

    const geoOpen = createMockFaceGeometry();
    geoOpen.mouth.aperture = 0.08;

    const sClosed = testModule.update({ geometry: geoClosed });
    const sOpen = testModule.update({ geometry: geoOpen });

    expect(sOpen.lightingSfx.enamelFresnel).toBeGreaterThan(sClosed.lightingSfx.enamelFresnel);
  });

  it("carries cluster blending and presence weight accurately", () => {
    const geo = createMockFaceGeometry();
    const state = testModule.update({
      geometry: geo,
      clusterA: 21,
      clusterB: 22,
      blendFactor: 0.75,
      presenceWeight: 0.9,
      codebookYawDeg: 25.0,
    });

    expect(state.clusterIdA).toBe(21);
    expect(state.clusterIdB).toBe(22);
    expect(state.blendFactor).toBeCloseTo(0.75, 2);
    expect(state.presenceWeight).toBeCloseTo(0.9, 2);
    expect(state.screenTarget.yawDeg).toBe(25.0);
  });
});
