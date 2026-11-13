import { describe, it, expect, beforeEach } from "vitest";
import { ProceduralLivePortraitDriver } from "../lib/realtime/proceduralLivePortraitDriver";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 11: P1 Dominant Brow Unilateral Micro-Asymmetry", () => {
  let driver: ProceduralLivePortraitDriver;

  beforeEach(() => {
    driver = new ProceduralLivePortraitDriver({
      isAutoAnimate: false,
      cameraEyeLock: false,
      motionIntensity: 1.0,
      dominantBrow: "right",
    });
  });

  describe("Resting Tonic Asymmetry", () => {
    it("should exhibit resting tonic elevation on the right brow by default", () => {
      // Warm up driver at resting neutral (0 eyebrow raise)
      let state = driver.update(1.0);
      for (let i = 1; i <= 15; i++) {
        state = driver.update(1.0 + i * 0.016);
      }

      // Dominant right brow should rest ~2-3% higher than non-dominant left brow
      expect(state.eyebrowRaiseRight).toBeGreaterThan(state.eyebrowRaiseLeft);
      expect(state.eyebrowAsymmetry).toBeGreaterThan(0.015);
    });

    it("should exhibit resting tonic elevation on the left brow when dominantBrow is left", () => {
      driver.setDominantBrow("left");
      let state = driver.update(1.0);
      for (let i = 1; i <= 15; i++) {
        state = driver.update(1.0 + i * 0.016);
      }

      expect(state.eyebrowRaiseLeft).toBeGreaterThan(state.eyebrowRaiseRight);
      expect(state.eyebrowAsymmetry).toBeLessThan(-0.015);
    });

    it("should produce symmetrical brows when dominantBrow is set to none", () => {
      driver.setDominantBrow("none");
      let state = driver.update(1.0);
      for (let i = 1; i <= 15; i++) {
        state = driver.update(1.0 + i * 0.016);
      }

      expect(Math.abs(state.eyebrowAsymmetry)).toBeLessThan(0.001);
      expect(state.eyebrowRaiseLeft).toBeCloseTo(state.eyebrowRaiseRight, 3);
    });
  });

  describe("Vocal Emphasis & Expressive Inflection Lead", () => {
    it("should amplify dominant brow elevation on manual or vocal brow raises", () => {
      driver.setDominantBrow("right");
      driver.setManualExpressions(0.15, 0.0, 0.0); // 15% brow raise

      let state = driver.update(1.0);
      for (let i = 1; i <= 15; i++) {
        state = driver.update(1.0 + i * 0.016);
      }

      // Dominant right brow must achieve significantly higher peak elevation
      expect(state.eyebrowRaiseRight).toBeGreaterThan(state.eyebrowRaiseLeft * 1.2);
    });
  });

  describe("Shader Integration", () => {
    it("should implement unilateral brow asymmetry in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("P1: Dominant Brow Unilateral Asymmetry");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float raiseL = u_eyebrowRaise - u_eyebrowAsymmetry * 0.5;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float raiseR = u_eyebrowRaise + u_eyebrowAsymmetry * 0.5;");
    });
  });
});
