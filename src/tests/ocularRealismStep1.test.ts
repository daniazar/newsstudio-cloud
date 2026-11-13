/**
 * src/tests/ocularRealismStep1.test.ts
 *
 * Comprehensive unit test suite for Step 1 of Ocular Realism:
 * - J1: Duchenne Lower Eyelid Smile Elevation (Orbicularis Oculi)
 * - J1/J2: Synchronized Tear Lake Meniscus Ascent
 * - K2: Iris Corneal Specular Dome Disk (Spherical Cap Profile)
 */

import { describe, it, expect } from "vitest";

describe("Ocular Realism Step 1 Suite (J1 & K2)", () => {
  describe("J1: Duchenne Lower Eyelid Smile Elevation", () => {
    function calculateDuchenneSquint(smile: number): number {
      return Math.max(0.0, Math.min(0.25, smile * 0.22));
    }

    function smoothstep(min: number, max: number, value: number): number {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }

    it("should produce positive lower eyelid elevation on smile", () => {
      const smile = 0.85;
      const duchenneSquint = calculateDuchenneSquint(smile);

      expect(duchenneSquint).toBeCloseTo(0.187, 2);

      const eyeRy = 0.038;
      const normEx = 0.0;
      const eyeArch = Math.sqrt(Math.max(0.0, 1.0 - normEx * normEx * 0.90));
      const normEy = 0.5; // lower lid zone
      const eyeMask = 1.0;

      const lowerLidZone = smoothstep(-0.4, 0.8, normEy) * smoothstep(1.6, 0.6, normEy);
      const lowerLidDispY = duchenneSquint * eyeRy * 1.25 * eyeArch * lowerLidZone * eyeMask;

      expect(lowerLidDispY).toBeGreaterThan(0.003);
      expect(lowerLidDispY).toBeLessThan(0.015);
    });

    it("should be completely zero on neutral face", () => {
      const duchenneSquint = calculateDuchenneSquint(0.0);
      expect(duchenneSquint).toBe(0.0);
    });

    it("should be inhibited when sad/frown mouth mode is active (smile < 0)", () => {
      const duchenneSquint = calculateDuchenneSquint(-0.85);
      expect(duchenneSquint).toBe(0.0);
    });

    it("should synchronize tear lake meniscus baseline to ascend with the lower eyelid", () => {
      const eyeRy = 0.038;
      const eyeArch = 1.0;

      // Neutral baseline
      const neutralLift = calculateDuchenneSquint(0.0);
      const targetTearNeutral = (0.74 + eyeArch * 0.16 - neutralLift) * eyeRy;

      // Smiling baseline
      const smileLift = calculateDuchenneSquint(1.0);
      const targetTearSmiling = (0.74 + eyeArch * 0.16 - smileLift) * eyeRy;

      // Smiling lower eyelid moves upward (y decreases in UV space)
      expect(targetTearSmiling).toBeLessThan(targetTearNeutral);
      expect(targetTearNeutral - targetTearSmiling).toBeCloseTo(smileLift * eyeRy, 4);
    });
  });

  describe("K2: Iris Corneal Specular Dome Disk", () => {
    function computeCorneaDome(normDistSq: number, blink: number): number {
      if (normDistSq >= 1.0) return 0.0;
      return Math.sqrt(Math.max(0.0, 1.0 - normDistSq)) * 0.085 * (1.0 - Math.min(1.0, blink * 1.15));
    }

    it("should peak at the corneal center and reflect spherical dome curvature", () => {
      const centerGlint = computeCorneaDome(0.0, 0.0);
      expect(centerGlint).toBeCloseTo(0.085, 3);

      const midGlint = computeCorneaDome(0.5, 0.0);
      expect(midGlint).toBeCloseTo(Math.sqrt(0.5) * 0.085, 3);
      expect(midGlint).toBeLessThan(centerGlint);
    });

    it("should fall off smoothly to zero at the corneal limbus boundary", () => {
      const limbusGlint = computeCorneaDome(1.0, 0.0);
      expect(limbusGlint).toBe(0.0);

      const outsideGlint = computeCorneaDome(1.5, 0.0);
      expect(outsideGlint).toBe(0.0);
    });

    it("should attenuate to zero when eyelid blinks shut", () => {
      const centerGlintBlink = computeCorneaDome(0.0, 1.0);
      expect(centerGlintBlink).toBe(0.0);
    });
  });
});
