/**
 * src/tests/periorbitalAndSilenceStep2.test.ts
 *
 * Comprehensive unit test suite for Step 2 of Ocular & Behavioral Realism:
 * - J3: Dynamic Crow's-Feet Wrinkle Fan (Stage 6D normal perturbation)
 * - O3: Attentive Listening Silence Motion Dampening
 */

import { describe, it, expect } from "vitest";
import { ProceduralLivePortraitDriver } from "../lib/realtime/proceduralLivePortraitDriver";

describe("Periorbital & Silence Step 2 Suite (J3 & O3)", () => {
  describe("J3: Dynamic Crow's-Feet Wrinkle Fan Formula", () => {
    function computeCrowsIntensity(smile: number, eyeWidening: number): number {
      return Math.max(
        0.0,
        Math.min(
          1.0,
          smile * 0.65 + Math.max(0.0, 1.0 - eyeWidening) * 0.50
        )
      );
    }

    function smoothstep(min: number, max: number, value: number): number {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }

    it("should activate crow's-feet intensity on warm smile", () => {
      const smile = 0.90;
      const widening = 1.0;
      const intensity = computeCrowsIntensity(smile, widening);

      expect(intensity).toBeCloseTo(0.585, 2);
    });

    it("should activate on squinting (eyeWidening < 1.0)", () => {
      const smile = 0.0;
      const widening = 0.60;
      const intensity = computeCrowsIntensity(smile, widening);

      expect(intensity).toBeCloseTo(0.20, 2);
    });

    it("should be zero on neutral face", () => {
      const intensity = computeCrowsIntensity(0.0, 1.0);
      expect(intensity).toBe(0.0);
    });

    it("should be inhibited on sad mouth expression (smile < 0)", () => {
      const intensity = computeCrowsIntensity(-0.85, 1.0);
      expect(intensity).toBe(0.0);
    });

    it("should produce radial wave folds within lateral canthus fan zone", () => {
      const intensity = computeCrowsIntensity(0.85, 1.0);

      // Point in lateral canthus fan zone (temple side)
      const dCanthusX = -0.015;
      const dCanthusY = 0.005;
      const distSq = (dCanthusX * dCanthusX) / 0.0018 + (dCanthusY * dCanthusY) / 0.0012;
      expect(distSq).toBeLessThan(1.0);

      const r = Math.sqrt(dCanthusX * dCanthusX + dCanthusY * dCanthusY);
      const angle = Math.atan2(dCanthusY, -dCanthusX);
      const foldPhase = angle * 3.5;
      const falloff = Math.exp(-distSq * 2.2) * smoothstep(0.002, 0.010, r) * intensity;
      const dH = Math.cos(foldPhase + r * 30.0) * 3.5 * falloff * 0.40;

      expect(falloff).toBeGreaterThan(0.05);
      expect(Math.abs(dH)).toBeGreaterThan(0.01);
    });
  });

  describe("O3: Attentive Listening Silence Motion Dampening", () => {
    it("should maintain 100% motion intensity during speech or short pauses (<1.2s)", () => {
      const driver = new ProceduralLivePortraitDriver({ isAutoAnimate: true, motionIntensity: 1.0 });

      // Anchor speaking
      driver.setAudioProsody(0.65, true, 180);
      driver.update(1.0);
      expect(driver.getSilenceDuration()).toBe(0.0);
      expect(driver.getSilenceDampening()).toBe(1.0);

      // Short pause between words (0.5s)
      driver.setAudioProsody(0.0, false);
      driver.update(1.0 + 0.5);
      expect(driver.getSilenceDuration()).toBeCloseTo(0.5, 1);
      expect(driver.getSilenceDampening()).toBe(1.0);
    });

    it("should smoothly dampen motion down to 60% after 2.0s of continuous silence", () => {
      const driver = new ProceduralLivePortraitDriver({ isAutoAnimate: true, motionIntensity: 1.0 });

      driver.setAudioProsody(0.0, false);

      // Advance through silence: 1.2s -> onset of dampening
      driver.update(0.0);
      driver.update(1.2);
      expect(driver.getSilenceDuration()).toBeCloseTo(1.2, 1);
      expect(driver.getSilenceDampening()).toBe(1.0);

      // Mid-dampening at 1.6s
      driver.update(1.6);
      expect(driver.getSilenceDampening()).toBeLessThan(1.0);
      expect(driver.getSilenceDampening()).toBeGreaterThan(0.60);

      // Full dampening reached at 2.0s (1.2s + 0.8s)
      driver.update(2.0);
      expect(driver.getSilenceDuration()).toBeCloseTo(2.0, 1);
      expect(driver.getSilenceDampening()).toBeCloseTo(0.60, 2);
    });

    it("should instantly restore 100% active motion intensity when speech resumes", () => {
      const driver = new ProceduralLivePortraitDriver({ isAutoAnimate: true, motionIntensity: 1.0 });

      // Silence for 3 seconds
      driver.setAudioProsody(0.0, false);
      driver.update(0.0);
      driver.update(3.0);
      expect(driver.getSilenceDampening()).toBeCloseTo(0.60, 2);

      // Anchor speaks again!
      driver.setAudioProsody(0.70, true, 200);
      driver.update(3.05);

      expect(driver.getSilenceDuration()).toBe(0.0);
      expect(driver.getSilenceDampening()).toBe(1.0);
    });
  });
});
