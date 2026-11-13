import { describe, it, expect } from "vitest";
import { CoarticulationEngine } from "../coarticulationEngine";
import { LabiodentalEngine } from "../labiodentalEngine";
import { LingualKinematics } from "../lingualKinematics";
import { SalivaFilamentEngine } from "../salivaFilamentEngine";
import { OpticalFlowWarper } from "../opticalFlowWarper";

describe("Biomechanical Realism Suite", () => {
  describe("1. CoarticulationEngine (2nd-Order Spring-Mass-Damper ODE)", () => {
    it("smoothly converges towards target aperture without step discontinuities", () => {
      const engine = new CoarticulationEngine();
      const targetAperture = 18.0;
      const targetWidth = 94.5;
      const dt = 1 / 60; // 60 FPS step

      // First step with targetAperture
      let current = engine.update(targetAperture, targetWidth, [], dt);
      expect(current.currentAperture).toBeGreaterThan(0);
      expect(current.currentAperture).toBeLessThan(targetAperture);

      // Simulate 15 frames (250ms) of convergence
      for (let i = 0; i < 15; i++) {
        current = engine.update(targetAperture, targetWidth, [], dt);
      }

      // Should converge closely to target
      expect(current.currentAperture).toBeGreaterThan(15.0);
      expect(current.currentAperture).toBeLessThanOrEqual(targetAperture * 1.05);
    });

    it("pre-shapes aperture when anticipatory phoneme lookahead is present", () => {
      const engine = new CoarticulationEngine();
      const lookahead = [{ phoneme: "aa", offsetMs: 80 }];
      const stepWithLookahead = engine.update(0, 94.5, lookahead, 1 / 60);

      const engineVanilla = new CoarticulationEngine();
      const stepVanilla = engineVanilla.update(0, 94.5, [], 1 / 60);

      // Anticipatory lookahead for "aa" should pre-open the mouth faster
      expect(stepWithLookahead.currentAperture).toBeGreaterThanOrEqual(stepVanilla.currentAperture);
    });
  });

  describe("2. LabiodentalEngine (Incisor Tuck & Plosive Pre-Bulge)", () => {
    it("engages labiodental tuck on /f/ and /v/ phonemes", () => {
      const engine = new LabiodentalEngine();
      const stateF = engine.update(4.0, "f", 33.3);
      expect(stateF.labiodentalTuck).toBeGreaterThan(0.2);

      const stateV = engine.update(4.0, "v", 33.3);
      expect(stateV.labiodentalTuck).toBeGreaterThan(0.2);

      // Let it decay on open vowel "aa" over several frames
      let stateNeutral = stateV;
      for (let i = 0; i < 6; i++) {
        stateNeutral = engine.update(4.0, "aa", 33.3);
      }
      expect(stateNeutral.labiodentalTuck).toBeLessThan(0.05);
    });

    it("generates plosive pre-burst lateral bulge and compression on /p/ and /b/", () => {
      const engine = new LabiodentalEngine();
      const stateP = engine.update(0.5, "p", 33.3);
      expect(stateP.plosiveCompression).toBeGreaterThan(0.3);
      expect(stateP.preBurstBulge).toBeGreaterThan(0.2);
    });
  });

  describe("3. LingualKinematics (Procedural 3D Tongue Apex & Blade)", () => {
    it("elevates tongue apex for alveolar consonants /t, d, l, n/", () => {
      const lingual = new LingualKinematics();
      // Step several frames to allow smooth rate convergence
      let stateT = lingual.resolveFromPhoneme("t", 10.0);
      for (let i = 0; i < 5; i++) {
        stateT = lingual.resolveFromPhoneme("t", 10.0);
      }
      expect(stateT.elevation).toBeGreaterThan(0.5);
      expect(stateT.visibility).toBeGreaterThan(0.4);
    });

    it("depresses tongue to oral floor for open vowels /a, aa/", () => {
      const lingual = new LingualKinematics();
      let stateAA = lingual.resolveFromPhoneme("aa", 25.0);
      for (let i = 0; i < 5; i++) {
        stateAA = lingual.resolveFromPhoneme("aa", 25.0);
      }
      expect(stateAA.elevation).toBeLessThan(0.0);
    });

    it("protrudes tongue for interdental /th/", () => {
      const lingual = new LingualKinematics();
      let stateTH = lingual.resolveFromPhoneme("th", 12.0);
      for (let i = 0; i < 5; i++) {
        stateTH = lingual.resolveFromPhoneme("th", 12.0);
      }
      expect(stateTH.protrusion).toBeGreaterThan(0.5);
      expect(stateTH.contactWithUpperIncisors).toBe(true);
    });
  });

  describe("4. SalivaFilamentEngine (Catenary Micro-Fluidics)", () => {
    it("spawns filaments when plosive lips part from closed to open aperture", () => {
      const engine = new SalivaFilamentEngine();
      const anchor = { cx: 200, cy: 300, w: 80, h: 40, angle: 0 };
      const t0 = 1000;

      // Closed mouth initially
      engine.update(0.5, anchor, t0);

      // Parting lips to 4.0px aperture
      const filaments = engine.update(4.0, anchor, t0 + 20);
      expect(filaments.length).toBeGreaterThan(0);
      expect(filaments[0].isSnapped).toBe(false);
      expect(filaments[0].alpha).toBeGreaterThan(0);
    });

    it("suppresses filaments when mouth is wide open", () => {
      const engine = new SalivaFilamentEngine();
      const anchor = { cx: 200, cy: 300, w: 80, h: 40, angle: 0 };
      const filaments = engine.update(35.0, anchor, 2000);
      expect(filaments.length).toBe(0);
    });
  });

  describe("5. OpticalFlowWarper (Dense Muscular Flow Fields)", () => {
    it("computes non-zero muscular displacement vectors between aperture transitions", () => {
      const stateA = { aperture: 2.0, width: 94.5 };
      const stateB = { aperture: 18.0, width: 94.5 };

      const flow = OpticalFlowWarper.computeFlow(0.5, 0.54, stateA, stateB);
      expect(typeof flow.vx).toBe("number");
      expect(typeof flow.vy).toBe("number");
      // Opening jaw pulls downward (positive Y displacement)
      expect(flow.vy).toBeGreaterThan(0);
    });
  });
});
