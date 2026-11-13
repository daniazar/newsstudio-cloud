import { describe, it, expect } from "vitest";
import { ProceduralLivePortraitDriver } from "../lib/realtime/proceduralLivePortraitDriver";
import { OcularLifeEngine } from "../lib/realtime/ocularLifeEngine";
import { LingualDynamicsEngine } from "../lib/realtime/lingualDynamicsEngine";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 1: Neurological Reflexes & Anatomical Fine Detail", () => {
  describe("P2: Head Snap Protective Blink Reflex", () => {
    it("should trigger an involuntary reflex blink during rapid angular head turns (>24 deg/s)", () => {
      const driver = new ProceduralLivePortraitDriver({ blinkRate: 1.0 });

      // Establish baseline at t = 1.0s
      driver.update(1.0);

      // Apply a sharp, sudden pitch/yaw whip at t = 1.05s (delta 2.5 deg over 0.05s = 50 deg/s)
      driver.setManualPose(3.0, 3.5, 0);
      const poseRapid = driver.update(1.05);

      // Should have triggered an involuntary reflex blink
      expect(driver.getAngularSpeed()).toBeGreaterThan(24.0);
      expect(poseRapid.blinkLeft).toBeGreaterThan(0.0);
      expect(poseRapid.blinkRight).toBeGreaterThan(0.0);
    });

    it("should not trigger reflex blinks during slow, smooth head movements", () => {
      const driver = new ProceduralLivePortraitDriver({ blinkRate: 0.0, motionIntensity: 0.0 });

      driver.update(1.0);
      // Gentle movement: 0.1 deg over 0.1s = 1 deg/s
      driver.setManualPose(0.1, 0.1, 0);
      const poseSlow = driver.update(1.1);

      expect(driver.getAngularSpeed()).toBeLessThan(20.0);
      expect(poseSlow.blinkLeft).toBe(0.0);
      expect(poseSlow.blinkRight).toBe(0.0);
    });
  });

  describe("P1: Dominant Brow Unilateral Asymmetry", () => {
    it("should elevate the dominant right brow with ~30% higher amplitude than left brow", () => {
      const driver = new ProceduralLivePortraitDriver({ dominantBrow: "right" });
      driver.setManualExpressions(0.35, 0, 0); // 0.35 brow raise

      // Run a few steps to let critical damping settle
      let pose = driver.update(0.1);
      for (let t = 0.2; t <= 0.6; t += 0.1) {
        pose = driver.update(t);
      }

      expect(pose.eyebrowRaiseRight).toBeGreaterThan(pose.eyebrowRaiseLeft);
      expect(pose.eyebrowAsymmetry).toBeGreaterThan(0.05);
      // Right brow should exceed left brow by at least 20%
      expect(pose.eyebrowRaiseRight / pose.eyebrowRaiseLeft).toBeGreaterThan(1.20);
    });

    it("should switch dominant hemisphere when dominantBrow is set to left", () => {
      const driver = new ProceduralLivePortraitDriver({ dominantBrow: "left" });
      driver.setManualExpressions(0.35, 0, 0);

      let pose = driver.update(0.1);
      for (let t = 0.2; t <= 0.6; t += 0.1) {
        pose = driver.update(t);
      }

      expect(pose.eyebrowRaiseLeft).toBeGreaterThan(pose.eyebrowRaiseRight);
      expect(pose.eyebrowAsymmetry).toBeLessThan(-0.05);
    });
  });

  describe("P3: Vergence Fatigue & Micro-Refixation Saccadic Drift", () => {
    it("should accumulate fixation duration during sustained forward gaze and produce vergence fatigue", () => {
      const ocular = new OcularLifeEngine();

      // Step up to 3.0s (first call initializes lastTime)
      ocular.update(0.0, 0.0, 0.0);
      for (let t = 0.1; t <= 3.0; t += 0.1) {
        ocular.update(t, 0.0, 0.0);
      }
      expect(ocular.getFixationDuration()).toBeGreaterThan(2.8);
      expect(ocular.getFixationDuration()).toBeLessThanOrEqual(3.1);
      expect(ocular.getVergenceFatigue()).toBe(0.0);

      // Step past 3.5s: vergence fatigue offset becomes active
      let state38 = ocular.update(3.1, 0.0, 0.0);
      for (let t = 3.2; t <= 3.8; t += 0.1) {
        state38 = ocular.update(t, 0.0, 0.0);
      }
      expect(ocular.getFixationDuration()).toBeGreaterThan(3.5);
      expect(state38.vergenceFatigue).not.toBe(0.0);
      expect(Math.abs(state38.vergenceFatigue)).toBeLessThan(0.03);
    });

    it("should fire a refixation saccade and reset fatigue at >4.5s of sustained gaze", () => {
      const ocular = new OcularLifeEngine();

      ocular.update(0.0, 0.0, 0.0);
      for (let t = 0.1; t <= 4.4; t += 0.1) {
        ocular.update(t, 0.0, 0.0);
      }
      expect(ocular.getFixationDuration()).toBeGreaterThan(4.0);

      // Step past 4.6s (exceeds 4.5s threshold)
      ocular.update(4.6, 0.0, 0.0);
      // Fixation duration and fatigue offset reset after micro-saccade snap
      expect(ocular.getFixationDuration()).toBeLessThan(0.5);
      expect(ocular.getVergenceFatigue()).toBe(0.0);
    });

    it("should reset fixation duration immediately when gaze shifts away from forward camera", () => {
      const ocular = new OcularLifeEngine();
      ocular.update(0.0, 0.0, 0.0);
      for (let t = 0.1; t <= 2.5; t += 0.1) {
        ocular.update(t, 0.0, 0.0);
      }
      expect(ocular.getFixationDuration()).toBeGreaterThan(2.0);

      // Looking sideways (|gazeX| >= 0.20)
      ocular.update(2.6, 0.35, 0.0);
      expect(ocular.getFixationDuration()).toBe(0.0);
      expect(ocular.getVergenceFatigue()).toBe(0.0);
    });
  });

  describe("L1: Lingual Lateral Spread", () => {
    it("should expand tongue blade laterally on open vowels (/aa, oh/)", () => {
      const lingual = new LingualDynamicsEngine();

      // Open vowel /aa/
      let state = lingual.update(0.1, {
        visemeWeights: { aa: 0.90, oh: 0.40 } as any,
      });
      for (let t = 0.2; t <= 0.6; t += 0.1) {
        state = lingual.update(t, {
          visemeWeights: { aa: 0.90, oh: 0.40 } as any,
        });
      }

      expect(state.tongueSpread).toBeGreaterThan(0.40);
      expect(state.tongueSpread).toBeLessThanOrEqual(1.0);
    });

    it("should relax lateral tongue spread back to zero during silence", () => {
      const lingual = new LingualDynamicsEngine();

      // First open vowel
      lingual.update(0.1, { visemeWeights: { aa: 0.90 } as any });
      lingual.update(0.3, { visemeWeights: { aa: 0.90 } as any });

      // Then silence
      let state = lingual.update(0.4, null);
      for (let t = 0.5; t <= 1.2; t += 0.1) {
        state = lingual.update(t, null);
      }

      expect(state.tongueSpread).toBeLessThan(0.05);
    });
  });

  describe("K1 & L2: Shader Declarations & Anatomical Integration", () => {
    it("should declare u_eyebrowAsymmetry and u_tongueSpread uniforms in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_eyebrowAsymmetry;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_tongueSpread;");
    });

    it("should implement L2 tongue-teeth occlusal contact shadow in renderInterlabialAperture", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("L2: Intraoral Tongue-Teeth Occlusal Contact Shadow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("occlusalContact");
    });

    it("should implement K1 scleral micro-vascular network & canthal capillary injection", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("K1: Scleral Micro-Vascular Network");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("veinBranchL");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("veinBranchR");
    });
  });
});
