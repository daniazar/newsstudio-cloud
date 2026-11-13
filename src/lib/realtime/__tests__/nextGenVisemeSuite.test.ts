import { describe, it, expect } from "vitest";
import { SalivaFilamentEngine } from "../salivaFilamentEngine";
import { LingualKinematics } from "../lingualKinematics";
import { CoarticulationEngine } from "../coarticulationEngine";
import { AffectiveVisemeModulator } from "../affectiveVisemeModulator";
import { MicroAspirationEngine } from "../microAspirationEngine";
import { LandmarkTarget, AffineMouthCompositor } from "../affineMouthCompositor";

describe("Next-Generation Viseme Biomechanics Suite", () => {
  const baseLandmark: LandmarkTarget = {
    cx: 523.4,
    cy: 683.5,
    w: 94.5,
    h: 30.56,
    angle: 0.0,
  };

  // ── 1. SALIVA FILAMENT ENGINE (ITEM 2) ───────────────────────────────────
  describe("SalivaFilamentEngine", () => {
    it("detects bilabial detachment and spawns transient saliva threads", () => {
      const engine = new SalivaFilamentEngine();

      // Step 1: Closed stomion (bilabial contact /m/)
      const t0 = 1000;
      let filaments = engine.update(0.2, baseLandmark, t0);
      expect(filaments.length).toBe(0);

      // Step 2: Lips part to 3.5px aperture
      const t1 = t0 + 16.6;
      filaments = engine.update(3.5, baseLandmark, t1);
      expect(filaments.length).toBeGreaterThanOrEqual(1);
      expect(filaments[0].thickness).toBeGreaterThan(0.5);
      expect(filaments[0].isSnapped).toBe(false);

      // Step 3: Continued elongation causes thinning
      const t2 = t1 + 16.6;
      const thinnedFilaments = engine.update(6.0, baseLandmark, t2);
      expect(thinnedFilaments[0].thickness).toBeLessThan(filaments[0].thickness);

      // Step 4: After duration (>60ms), filaments snap and are cleaned up
      const t3 = t0 + 100;
      const finalFilaments = engine.update(12.0, baseLandmark, t3);
      expect(finalFilaments.length).toBe(0);
    });
  });

  // ── 2. LINGUAL KINEMATICS (ITEM 3) ───────────────────────────────────────
  describe("LingualKinematics", () => {
    it("maps interdental phonemes to forward tongue protrusion", () => {
      const lingual = new LingualKinematics();
      // Phoneme /th/ (as in "think")
      const state = lingual.resolveFromPhoneme("th", 4.0);
      expect(state.protrusion).toBeGreaterThan(0.2);
      expect(state.contactWithUpperIncisors).toBe(true);
      expect(state.visibility).toBeGreaterThan(0.3);
    });

    it("maps alveolar consonants to elevated palatal contact", () => {
      const lingual = new LingualKinematics();
      // Phoneme /l/ (as in "light")
      const state = lingual.resolveFromPhoneme("l", 5.0);
      expect(state.elevation).toBeGreaterThan(0.2);
      expect(state.contactWithUpperIncisors).toBe(true);
    });

    it("maps sibilants to central median groove", () => {
      const lingual = new LingualKinematics();
      // Phoneme /s/ (as in "signal")
      const state = lingual.resolveFromPhoneme("s", 3.0);
      expect(state.groove).toBeGreaterThan(0.2);
    });

    it("depresses tongue to floor of oral cavity on open back vowels", () => {
      const lingual = new LingualKinematics();
      // Phoneme /aa/ (as in "father")
      const state = lingual.resolveFromPhoneme("aa", 16.0);
      expect(state.elevation).toBeLessThan(0.0);
    });
  });

  // ── 3. COARTICULATION ENGINE (ITEM 4) ───────────────────────────────────
  describe("CoarticulationEngine", () => {
    it("anticipates upcoming rounded vowels and injects rounding bias", () => {
      const coart = new CoarticulationEngine();

      // Current phoneme is neutral /s/, but /uw/ ("soon") is 50ms away
      const state = coart.update(2.5, 94.5, [{ phoneme: "uw", offsetMs: 50 }], 0.0166);
      expect(state.roundingBias).toBeGreaterThan(0.3);
      // Anticipatory narrowing of mouth width
      expect(state.currentWidth).toBeLessThan(94.5);
    });

    it("anticipates bilabial plosives and initiates preclosure damping", () => {
      const coart = new CoarticulationEngine();
      // Open vowel decaying into /p/ ("hop")
      const state = coart.update(10.0, 94.5, [{ phoneme: "p", offsetMs: 40 }], 0.0166);
      expect(state.preclosureBias).toBeGreaterThan(0.4);
      expect(state.currentAperture).toBeLessThan(10.0);
    });

    it("executes smooth 2nd-order critically damped deceleration", () => {
      const coart = new CoarticulationEngine();
      coart.reset(14.0, 94.5);

      // Sudden jump to zero (abrupt silence)
      let prevAp = 14.0;
      for (let i = 0; i < 5; i++) {
        const state = coart.update(0.0, 94.5, [], 0.0166);
        // Does not teleport to 0 in 1 frame; smooth exponential decay
        expect(state.currentAperture).toBeLessThan(prevAp);
        expect(state.currentAperture).toBeGreaterThanOrEqual(0.0);
        prevAp = state.currentAperture;
      }
    });
  });

  // ── 4. AFFECTIVE VISEME MODULATOR (ITEM 5) ───────────────────────────────
  describe("AffectiveVisemeModulator", () => {
    it("elevates mouth corners and upper lip for joy sentiment", () => {
      const modulator = new AffectiveVisemeModulator();
      const res = modulator.modulate(baseLandmark, { emotion: "joy", intensity: 1.0 });

      expect(res.smileCurvature).toBeGreaterThan(0.0);
      expect(res.leftCornerOffset.y).toBeLessThan(0); // upward pull
      expect(res.rightCornerOffset.y).toBeLessThan(0); // upward pull
      expect(res.upperLipElevation).toBeGreaterThan(0.0);
    });

    it("depresses mouth corners and tightens lips for breaking news / solemn", () => {
      const modulator = new AffectiveVisemeModulator();
      const res = modulator.modulate(baseLandmark, { emotion: "solemn", intensity: 1.0 });

      expect(res.smileCurvature).toBeLessThan(0.0);
      expect(res.leftCornerOffset.y).toBeGreaterThan(0); // downward pull
      expect(res.rightCornerOffset.y).toBeGreaterThan(0); // downward pull
      expect(res.jawDescentMultiplier).toBeLessThanOrEqual(1.0);
    });

    it("applies unilateral asymmetry for skeptical sentiment", () => {
      const modulator = new AffectiveVisemeModulator();
      const res = modulator.modulate(baseLandmark, { emotion: "skeptical", intensity: 1.0 });

      // Left corner elevates, right corner depresses
      expect(res.leftCornerOffset.y).toBeLessThan(0);
      expect(res.rightCornerOffset.y).toBeGreaterThan(0);
      expect(res.modifiedLandmark.angle).not.toBe(baseLandmark.angle);
    });
  });

  // ── 5. SUBCONSCIOUS INHALATION ENGINE (ITEM 6) ───────────────────────────
  describe("MicroAspirationEngine", () => {
    it("triggers organic 4-phase inhalation cycle during speech pauses", () => {
      const aspiration = new MicroAspirationEngine();

      // Active speech (RMS > 0.05) -> Idle phase
      let state = aspiration.update(0.08, false, 100);
      expect(state.isInhaling).toBe(false);
      expect(state.phase).toBe("idle");

      // Pause begins (silence > 220ms) -> Triggers inhalation
      aspiration.update(0.005, false, 150);
      state = aspiration.update(0.005, false, 100);
      expect(state.isInhaling).toBe(true);
      expect(state.phase).toBe("inhalation");

      // Advance through inhalation ramp
      state = aspiration.update(0.005, false, 150);
      expect(state.lipPartingAperture).toBeGreaterThan(0.3);
      expect(state.alarDilationFactor).toBeGreaterThan(1.0); // nostrils flared
      expect(state.shoulderBreathOffset).toBeGreaterThan(0.0); // chest lift

      // Speech resumes -> Recovery transition back to idle
      state = aspiration.update(0.09, false, 30);
      expect(state.phase).toBe("recovery");
    });
  });

  // ── 6. COMPOSITOR INTEGRATION (ITEM 1, 2, 3, 5, 7) ───────────────────────
  describe("AffineMouthCompositor Extended Integration", () => {
    it("initializes without throwing and accepts next-gen options", () => {
      const compositor = new AffineMouthCompositor();
      expect(compositor).toBeDefined();

      const saliva = new SalivaFilamentEngine();
      const lingual = new LingualKinematics();
      const affectMod = new AffectiveVisemeModulator();

      const mockCtx: any = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        rect: () => {},
        clip: () => {},
        drawImage: () => {},
        stroke: () => {},
        fill: () => {},
        moveTo: () => {},
        lineTo: () => {},
        quadraticCurveTo: () => {},
        arc: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
      };

      // Verify that calling applyMandibularChinDescent does not crash with next-gen options
      expect(() => {
        compositor.applyMandibularChinDescent(
          mockCtx,
          {} as any,
          baseLandmark,
          10.0,
          {
            affect: { emotion: "joy", intensity: 0.8 },
            affectModulator: affectMod,
            salivaFilaments: true,
            salivaEngine: saliva,
            lingualState: lingual.resolveFromPhoneme("th", 8.0),
            lingualKinematics: lingual,
            nasolabialStress: true,
          }
        );
      }).not.toThrow();
    });
  });
});
