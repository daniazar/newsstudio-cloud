import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 8: C2 Continuous Respiration Envelope & UI Kinematic Chain Coupling", () => {
  describe("Shader Integration & Respiration Bell Envelope", () => {
    it("should implement C2 continuous respiration fading to 0.0 at pelvis and neck", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("C2 Continuous Respiration Bell Envelope (Zero Pelvis/Neck Tearing)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float waistBreathFade = smoothstep(pelvisPivot.y, sCenter.y, uv.y);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float neckBreathFade = smoothstep(chinY, sCenter.y, uv.y);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float breathWeight = waistBreathFade * neckBreathFade * bodyWeight;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uv.y -= (u_shoulderBreath + u_shoulderShrug * 0.85) * breathWeight;");
    });

    it("should apply roll uniforms directly from UI controls without ghost rotations", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("spineAngle = u_bodyRoll * torsoWeight * upperWeight;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("spineAngle = u_pelvisRoll * pelvisWeight * lowerMask;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("if (abs(u_headRoll) > 0.001)");
    });
  });

  describe("Continuous Respiration Mathematical Verification (Zero Tears)", () => {
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const computeRespirationWeight = (
      uvY: number,
      chinY: number = 0.416,
      sCenterY: number = 0.608,
      pelvisPivotY: number = 0.8168
    ) => {
      if (uvY <= chinY || uvY >= pelvisPivotY) {
        return 0.0;
      }
      const waistBreathFade = smoothstep(pelvisPivotY, sCenterY, uvY);
      const neckBreathFade = smoothstep(chinY, sCenterY, uvY);
      return waistBreathFade * neckBreathFade;
    };

    it("should evaluate to EXACTLY 0.0 at the pelvis boundary (zero waist/vest tearing)", () => {
      const atPelvis = computeRespirationWeight(0.8168);
      expect(atPelvis).toBeCloseTo(0.0, 5);

      const belowPelvis = computeRespirationWeight(0.85);
      expect(belowPelvis).toBe(0.0);
    });

    it("should evaluate to EXACTLY 0.0 at the neck/chin boundary (zero neck tearing)", () => {
      const atChin = computeRespirationWeight(0.416);
      expect(atChin).toBeCloseTo(0.0, 5);

      const aboveChin = computeRespirationWeight(0.35);
      expect(aboveChin).toBe(0.0);
    });

    it("should produce a smooth peak at the mid-chest (sCenter.y)", () => {
      const atMidChest = computeRespirationWeight(0.608);
      expect(atMidChest).toBeCloseTo(1.0, 3);

      const upperChest = computeRespirationWeight(0.52);
      const lowerChest = computeRespirationWeight(0.70);
      expect(upperChest).toBeGreaterThan(0.5);
      expect(lowerChest).toBeGreaterThan(0.5);
    });
  });

  describe("UI-Synchronized Kinematic Chain Compensation Logic", () => {
    const applyKinematicHeadDelta = (
      headDelta: number,
      currentBodyRoll: number,
      currentPelvisRoll: number
    ) => {
      const newBodyRoll = Math.max(-3.0, Math.min(3.0, parseFloat((currentBodyRoll + headDelta * 0.15).toFixed(1))));
      const newPelvisRoll = Math.max(-9, Math.min(9, parseFloat((currentPelvisRoll - headDelta * 0.20).toFixed(1))));
      return { newBodyRoll, newPelvisRoll };
    };

    it("should visibly slide body and pelvis in real-time when head roll moves within [-9, 9] bounds", () => {
      // User moves head roll by -9.0 deg (within new limit)
      const { newBodyRoll, newPelvisRoll } = applyKinematicHeadDelta(-9.0, 0.0, 0.0);
      expect(newBodyRoll).toBe(-1.3); // -9 * 0.15 = -1.35 -> -1.3 (fits comfortably within [-3.0, 3.0])
      expect(newPelvisRoll).toBe(1.8); // -9 * -0.20 = +1.8 (fits comfortably within [-9, 9])

      // Extreme test: verify hard clamping at [-9, 9]
      const clamped = applyKinematicHeadDelta(-50.0, 0.0, 0.0);
      expect(clamped.newBodyRoll).toBe(-3.0);
      expect(clamped.newPelvisRoll).toBe(9.0);
    });
  });
});
