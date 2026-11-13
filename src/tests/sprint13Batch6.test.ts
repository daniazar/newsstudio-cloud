import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 6: Pelvis-Centered Dual-Zone Spinal Kinematics (Zero-Kink Biomechanics)", () => {
  describe("Shader Integration & Uniform Declarations", () => {
    it("should declare u_pelvisRoll uniform in the fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_pelvisRoll;");
    });

    it("should define the anatomical pelvic pivot and dual-zone rotation in Stage 0", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec2 pelvisPivot = vec2(sCenter.x, sCenter.y + sRadius.y * 0.58);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("Zone 1: Above Pelvis (Torso, Ribcage, Shoulders)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("Zone 2: Below Pelvis (Hips, Skirt, Lower Body");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uv = pelvisPivot + rotSpine;");
    });
  });

  describe("Mathematical Zero-Kink Continuity at Pelvis Pivot", () => {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const hermite = (t: number) => t * t * (3.0 - 2.0 * t);

    const computeSpineKinematics = (
      uvY: number,
      bodyRollRad: number,
      pelvisRollRad: number,
      sCenterY: number = 0.608,
      sRadiusY: number = 0.360
    ) => {
      const pelvisPivotY = sCenterY + sRadiusY * 0.58; // ~0.8168

      let spineAngle = 0.0;
      if (uvY < pelvisPivotY) {
        const tTorso = clamp((pelvisPivotY - uvY) / (pelvisPivotY - sCenterY + 0.06), 0.0, 1.0);
        const torsoWeight = hermite(tTorso);
        spineAngle = bodyRollRad * torsoWeight;
      } else {
        const tPelvis = clamp((uvY - pelvisPivotY) / (sRadiusY * 0.85), 0.0, 1.0);
        const pelvisWeight = hermite(tPelvis);
        spineAngle = pelvisRollRad * pelvisWeight;
      }

      // Compute displacement relative to pivot
      const dY = uvY - pelvisPivotY;
      const cosS = Math.cos(spineAngle);
      const sinS = Math.sin(spineAngle);
      // y displacement: (dY * cosS) - dY
      const dispY = dY * cosS - dY;

      return { pelvisPivotY, spineAngle, dispY };
    };

    it("should guarantee EXACTLY 0.0 spineAngle and 0.0 displacement at the pelvis pivot", () => {
      const bodyRoll = (-15.0 * Math.PI) / 180;
      const pelvisRoll = (10.0 * Math.PI) / 180;

      // Exactly at pelvis pivot
      const atPivot = computeSpineKinematics(0.8168, bodyRoll, pelvisRoll);
      expect(atPivot.spineAngle).toBe(0.0);
      expect(atPivot.dispY).toBe(0.0);

      // 0.001 units above pivot
      const epsilonAbove = computeSpineKinematics(0.8168 - 0.001, bodyRoll, pelvisRoll);
      expect(Math.abs(epsilonAbove.spineAngle)).toBeLessThan(0.0001);

      // 0.001 units below pivot
      const epsilonBelow = computeSpineKinematics(0.8168 + 0.001, bodyRoll, pelvisRoll);
      expect(Math.abs(epsilonBelow.spineAngle)).toBeLessThan(0.0001);
    });

    it("should smoothly curve the upper ribcage and shoulders upward without kinks", () => {
      const bodyRoll = (-15.0 * Math.PI) / 180;
      const pelvisRoll = 0.0;

      const waist = computeSpineKinematics(0.75, bodyRoll, pelvisRoll);
      const midRib = computeSpineKinematics(0.68, bodyRoll, pelvisRoll);
      const shoulder = computeSpineKinematics(0.60, bodyRoll, pelvisRoll);

      // Monotonically increasing curvature from pelvis to shoulders
      expect(Math.abs(waist.spineAngle)).toBeGreaterThan(0.01);
      expect(Math.abs(midRib.spineAngle)).toBeGreaterThan(Math.abs(waist.spineAngle));
      expect(Math.abs(shoulder.spineAngle)).toBeGreaterThan(Math.abs(midRib.spineAngle));
    });

    it("should support independent lower-body contrapposto tilt below the pelvis", () => {
      const bodyRoll = (-15.0 * Math.PI) / 180;
      const pelvisRoll = (12.0 * Math.PI) / 180;

      // Above pelvis: curves in direction of bodyRoll (-15 deg)
      const upper = computeSpineKinematics(0.65, bodyRoll, pelvisRoll);
      expect(upper.spineAngle).toBeLessThan(0);

      // Below pelvis: curves in direction of pelvisRoll (+12 deg)
      const lower = computeSpineKinematics(0.95, bodyRoll, pelvisRoll);
      expect(lower.spineAngle).toBeGreaterThan(0);
    });
  });
});
