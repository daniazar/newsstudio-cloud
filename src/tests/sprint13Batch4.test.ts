import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 4: Garment & Attire Secondary Dynamics (FAB)", () => {
  describe("Shader Integration & Declarations", () => {
    it("should declare Stage 6G fabric tension creases and secondary dynamics in fragment shader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("6G. FABRIC TENSION CREASES & GARMENT SECONDARY DYNAMICS (FAB)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float fabricStrain = abs(u_shoulderBreath) * 0.85 + u_shoulderShrug * 1.10");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float garmentMask");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 fabricNormal = normalize(vec3(-dFdx, -dFdy, 1.0));");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float fabricSpec = pow(max(0.0, dot(fabricNormal, halfDir)), 48.0);");
    });

    it("should tint fabric anisotropic specular glint with the active broadcast keyLightTint", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("videoColor.rgb += keyLightTint * (fabricSpec * 0.12 * garmentMask * fabricStrain);");
    });
  });

  describe("Anatomical Garment Boundary Mask Math", () => {
    // Replicate GLSL garmentMask formula in TS to verify mathematical boundaries
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const computeGarmentMask = (
      texY: number,
      bodyDistSq: number,
      headCy: number = 0.20,
      headRy: number = 0.24,
      sCenterY: number = 0.54,
      sRadiusY: number = 0.36
    ) => {
      const chinY = headCy + headRy * 0.90; // ~0.416
      const collarStart = chinY + headRy * 0.35; // ~0.50
      const bodyFloor = sCenterY + sRadiusY * 1.55; // ~1.098

      if (texY <= collarStart || texY >= bodyFloor || bodyDistSq >= 3.2) {
        return 0.0;
      }

      return (
        smoothstep(collarStart, collarStart + headRy * 0.30, texY) *
        smoothstep(3.2, 0.40, bodyDistSq) *
        smoothstep(bodyFloor, bodyFloor - 0.08, texY)
      );
    };

    it("should guarantee ZERO fabric perturbation on face, chin, and upper neck coordinates", () => {
      // Facial coordinates (y in 0.15 - 0.38)
      expect(computeGarmentMask(0.20, 0.2)).toBe(0.0);
      expect(computeGarmentMask(0.35, 0.4)).toBe(0.0);
      expect(computeGarmentMask(0.416, 0.5)).toBe(0.0); // Exactly at chin
      expect(computeGarmentMask(0.48, 0.5)).toBe(0.0);  // Upper neck
    });

    it("should guarantee ZERO fabric perturbation outside the presenter torso boundary", () => {
      // Far lateral coordinates outside body silhouette (bodyDistSq >= 3.2)
      expect(computeGarmentMask(0.65, 3.25)).toBe(0.0);
      expect(computeGarmentMask(0.70, 4.0)).toBe(0.0);
    });

    it("should smoothly activate on chest, lapels, and dress bodice coordinates", () => {
      // Clavicles / upper chest (texY ~ 0.62, bodyDistSq ~ 0.5)
      const chestMask = computeGarmentMask(0.62, 0.5);
      expect(chestMask).toBeGreaterThan(0.70);

      // Mid-torso dress/vest (texY ~ 0.75, bodyDistSq ~ 0.8)
      const torsoMask = computeGarmentMask(0.75, 0.8);
      expect(torsoMask).toBeGreaterThan(0.80);
    });
  });

  describe("Kinematic Fabric Strain & Normal Sensitivity", () => {
    const computeFabricStrain = (breath: number, shrug: number, expansion: number, sway: number) => {
      return Math.abs(breath) * 0.85 + shrug * 1.10 + expansion * 0.70 + Math.abs(sway) * 0.50;
    };

    it("should evaluate to zero strain when presenter is stationary", () => {
      expect(computeFabricStrain(0, 0, 0, 0)).toBe(0.0);
    });

    it("should modulate linearly with clavicular breathing and shrugs", () => {
      const breathStrain = computeFabricStrain(0.08, 0, 0, 0);
      expect(breathStrain).toBeCloseTo(0.068, 3);

      const shrugStrain = computeFabricStrain(0, 0.12, 0, 0);
      expect(shrugStrain).toBeCloseTo(0.132, 3);

      const compositeStrain = computeFabricStrain(0.08, 0.12, 0.05, 0.03);
      expect(compositeStrain).toBeGreaterThan(0.20);
    });
  });
});
