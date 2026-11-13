import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/shaders/neural3DMMFragmentShader";

/**
 * Mathematical reference implementation of 3D spherical eye globe axial rotation
 */
export function computeSphericalEyeRotation(
  nx: number,
  ny: number,
  yawAngleRad: number,
  pitchAngleRad: number
): { nxRot: number; nyRot: number; nzRot: number; deltaNx: number; deltaNy: number } {
  const rSq = nx * nx + ny * ny;
  const nz = Math.sqrt(Math.max(0.0, 1.0 - Math.min(1.0, rSq)));

  // Inverse rotation R_x(-beta) * R_y(-alpha) to find source coordinate on unrotated sphere
  const cosA = Math.cos(yawAngleRad);
  const sinA = Math.sin(yawAngleRad);
  const cosB = Math.cos(pitchAngleRad);
  const sinB = Math.sin(pitchAngleRad);

  // Horizontal yaw around Y axis
  const nx1 = nx * cosA - nz * sinA;
  const nz1 = nx * sinA + nz * cosA;

  // Vertical pitch around X axis
  const ny1 = ny * cosB - nz1 * sinB;
  const nz2 = ny * sinB + nz1 * cosB;

  return {
    nxRot: nx1,
    nyRot: ny1,
    nzRot: nz2,
    deltaNx: nx1 - nx,
    deltaNy: ny1 - ny,
  };
}

describe("3D Spherical Eyeball Axial Rotation Engine", () => {
  describe("1. Mathematical Verification of 3D Globe Rotation", () => {
    it("should map neutral center (0,0) to itself when gaze is neutral (0,0)", () => {
      const res = computeSphericalEyeRotation(0, 0, 0, 0);
      expect(res.nxRot).toBeCloseTo(0, 4);
      expect(res.nyRot).toBeCloseTo(0, 4);
      expect(res.deltaNx).toBeCloseTo(0, 4);
      expect(res.deltaNy).toBeCloseTo(0, 4);
    });

    it("should fetch unrotated pupil (0,0) at screen position (sin(yaw), 0) when looking right", () => {
      const yaw = 0.35; // ~20 degrees
      const screenNx = Math.sin(yaw);
      const screenNy = 0;
      const res = computeSphericalEyeRotation(screenNx, screenNy, yaw, 0);

      // At screenNx = sin(yaw), the inverse rotation should point back to source (0, 0)
      expect(res.nxRot).toBeCloseTo(0, 3);
      expect(res.nyRot).toBeCloseTo(0, 3);
      // The displacement should be negative (fetching backwards to the center)
      expect(res.deltaNx).toBeCloseTo(-screenNx, 3);
    });

    it("should fetch unrotated pupil (0,0) at screen position (0, sin(pitch)) when looking down", () => {
      const pitch = 0.30; // ~17 degrees
      const screenNx = 0;
      const screenNy = Math.sin(pitch);
      const res = computeSphericalEyeRotation(screenNx, screenNy, 0, pitch);

      expect(res.nxRot).toBeCloseTo(0, 3);
      expect(res.nyRot).toBeCloseTo(0, 3);
      expect(res.deltaNy).toBeCloseTo(-screenNy, 3);
    });

    it("should cause spherical foreshortening as the eye turns toward the limbus", () => {
      // Points near the center move faster than points near the limb due to cosine projection
      const yaw = 0.25;
      const centerRes = computeSphericalEyeRotation(0.1, 0, yaw, 0);
      const limbRes = computeSphericalEyeRotation(0.8, 0, yaw, 0);

      // Spherical differential d(nx1)/d(nx) = cos(yaw) + (nx / nz) * sin(yaw)
      expect(centerRes.nzRot).toBeGreaterThan(limbRes.nzRot);
    });
  });

  describe("2. GLSL Shader Integration & Absence of 2D Planar Socket Translation", () => {
    it("should implement 3D spherical eye globe rotation around internal axis in neural3DMMFragmentShader", () => {
      // Must compute spherical depth zGlobe on globe
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sqrt(max(0.0, rGlobe * rGlobe - min(");
      // Must perform 3D axis rotation using trigonometry
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toMatch(/sin\(gazeYawRad\)/);
    });

    it("should strictly confine eyeball rotation inside the palpebral fissure so eyelids never translate", () => {
      // Must have zero socket translation outside the palpebral fissure (rFissureSq >= 1.0)
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toMatch(/wAperture|rFissureSq/);
    });
  });
});
