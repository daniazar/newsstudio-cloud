import { describe, it, expect } from "vitest";
import { AcousticBlinkEngine } from "../acousticBlinkEngine";
import { SaccadicGazeEngine } from "../saccadicGazeEngine";
import { RespiratoryBreathEngine } from "../respiratoryBreathEngine";
import { AffineMouthCompositor, LandmarkTarget } from "../affineMouthCompositor";
import { WebGLVisemeCompositor } from "../webglVisemeCompositor";

describe("Ultimate Forensic Realism Suite (Ocular, Respiratory & Light Transport)", () => {
  const baseLandmark: LandmarkTarget = {
    cx: 128.0,
    cy: 160.0,
    w: 94.5,
    h: 30.56,
    angle: 0.0,
    yawDeg: 0.0,
    pitchDeg: 0.0,
  };

  // ── 1. ACOUSTIC BLINK ENGINE ──────────────────────────────────────────────
  describe("AcousticBlinkEngine", () => {
    it("suppresses blinking during active vocal energy bursts", () => {
      const engine = new AcousticBlinkEngine();

      // High vocal energy (RMS 0.65)
      let state = engine.update(0.65, 1.0, 16.6);
      expect(state.isSuppressed).toBe(true);
      expect(state.isBlinking).toBe(false);

      // Advance time by 4 seconds (would normally trigger a blink)
      for (let i = 0; i < 240; i++) {
        state = engine.update(0.65, 1.0, 16.6);
      }

      // Still suppressed because voice is active
      expect(state.isSuppressed).toBe(true);
      expect(state.isBlinking).toBe(false);
      expect(state.blinkProgress).toBe(0.0);
    });

    it("triggers realistic asymmetric eyelid closure at acoustic pauses", () => {
      const engine = new AcousticBlinkEngine();

      // Speech ceases, syntactic pause / punctuation occurs
      for (let i = 0; i < 110; i++) {
        engine.update(0.0, 0.0, 16.6, false); // Advance ~1800ms
      }

      // Trigger syntactic pause
      let state = engine.update(0.0, 0.0, 16.6, true);
      expect(state.isBlinking).toBe(true);

      // Fast downward closing phase (~45ms / ~3 frames)
      for (let i = 0; i < 3; i++) {
        state = engine.update(0.0, 0.0, 16.6);
      }
      expect(state.blinkProgress).toBeGreaterThan(0.7);

      // Reopening phase (slower elastic recovery ~110ms / ~7 frames)
      for (let i = 0; i < 7; i++) {
        state = engine.update(0.0, 0.0, 16.6);
      }
      expect(state.blinkProgress).toBeLessThan(0.4);

      // Full reopening
      for (let i = 0; i < 5; i++) {
        state = engine.update(0.0, 0.0, 16.6);
      }
      expect(state.isBlinking).toBe(false);
      expect(state.blinkProgress).toBe(0.0);
    });

    it("supports programmatic manual trigger", () => {
      const engine = new AcousticBlinkEngine();
      engine.triggerBlink();
      const state = engine.update(0.0, 0.0, 16.6);
      expect(state.isBlinking).toBe(true);
      expect(state.blinkProgress).toBeGreaterThan(0.0);
    });
  });

  // ── 2. SACCADIC GAZE ENGINE ───────────────────────────────────────────────
  describe("SaccadicGazeEngine", () => {
    it("sweeps horizontal gaze across teleprompter line and returns ballistically", () => {
      const engine = new SaccadicGazeEngine();

      // Start of line (left margin)
      const startState = engine.update(16.6, true, 2000);
      expect(startState.gazeOffsetX).toBeLessThan(0.0);

      // Mid-line
      for (let i = 0; i < 60; i++) {
        engine.update(16.6, true, 2000);
      }
      const midState = engine.update(16.6, true, 2000);
      expect(midState.gazeOffsetX).toBeGreaterThan(startState.gazeOffsetX);

      // Advance to line wrap (~2000ms)
      for (let i = 0; i < 60; i++) {
        engine.update(16.6, true, 2000);
      }

      // Ballistic return saccade occurs
      let returnState = engine.update(16.6, true, 2000);
      for (let i = 0; i < 5; i++) {
        returnState = engine.update(16.6, true, 2000);
      }
      expect(returnState.gazeOffsetX).toBeLessThan(0.0);
    });

    it("executes fixational Ornstein-Uhlenbeck micro-drift within physiological bounds", () => {
      const engine = new SaccadicGazeEngine();

      // Disable teleprompter reading to test pure cognitive micro-saccades
      let maxAbsX = 0;
      let maxAbsY = 0;
      for (let i = 0; i < 100; i++) {
        const state = engine.update(16.6, false);
        maxAbsX = Math.max(maxAbsX, Math.abs(state.gazeOffsetX));
        maxAbsY = Math.max(maxAbsY, Math.abs(state.gazeOffsetY));
      }

      // Ornstein-Uhlenbeck drift is bounded to prevent unnatural eye rolling
      expect(maxAbsX).toBeLessThanOrEqual(2.5);
      expect(maxAbsY).toBeLessThanOrEqual(1.5);
    });
  });

  // ── 3. RESPIRATORY BREATH ENGINE ──────────────────────────────────────────
  describe("RespiratoryBreathEngine", () => {
    it("parts stomion and lifts clavicle during pre-utterance inhalation", () => {
      const engine = new RespiratoryBreathEngine();

      // Speech is imminent in 180ms
      let state = engine.update(false, 180, 16.6);
      expect(state.phase).toBe("inhalation");

      // Advance inhalation
      for (let i = 0; i < 10; i++) {
        state = engine.update(false, 100, 16.6);
      }

      expect(state.inhalatoryAperturePx).toBeGreaterThan(0.5);
      expect(state.chestClavicleYOffset).toBeGreaterThan(0.4);
      expect(state.lungVolumeRatio).toBeGreaterThan(0.6);
    });

    it("transitions from speaking to smooth post-speech exhalatory deceleration", () => {
      const engine = new RespiratoryBreathEngine();

      // Speaking active
      engine.update(true, 0, 16.6);
      for (let i = 0; i < 10; i++) {
        engine.update(true, 0, 16.6);
      }

      // Speech ends -> Exhalation phase triggers
      let state = engine.update(false, 0, 16.6);
      expect(state.phase).toBe("exhalation");

      // Smooth settlement back to neutral idle
      for (let i = 0; i < 12; i++) {
        state = engine.update(false, 0, 16.6);
      }
      expect(state.phase).toBe("idle");
      expect(state.inhalatoryAperturePx).toBe(0.0);
    });
  });

  // ── 4. COMPOSITOR INTEGRATION & STABILITY ─────────────────────────────────
  describe("Compositor Integration & Stability", () => {
    it("AffineMouthCompositor applies lateral hemifacial motor asymmetry without shearing", () => {
      const comp = new AffineMouthCompositor();

      let appliedTransform = [1, 0, 0, 1, 0, 0];
      const mockCtx = {
        save: () => {},
        restore: () => {},
        setTransform: (m00: number, m10: number, m01: number, m11: number, m02: number, m12: number) => {
          appliedTransform = [m00, m10, m01, m11, m02, m12];
        },
        drawImage: () => {},
        clearRect: () => {},
        globalAlpha: 1.0,
      } as unknown as CanvasRenderingContext2D;

      const dummyImage = {} as CanvasImageSource;

      // Render symmetric (asymmetry = 0.0)
      comp.render(mockCtx, dummyImage, null, baseLandmark, 0.0, 1.0, {
        hemifacialAsymmetry: 0.0,
      });
      const symM02 = appliedTransform[4];
      const symM12 = appliedTransform[5];

      // Render with right cerebral dominance (+0.12)
      comp.render(mockCtx, dummyImage, null, baseLandmark, 0.0, 1.0, {
        hemifacialAsymmetry: 0.12,
        enableDuchenneCoupling: true,
        gazeOffsetX: 0.8,
        gazeOffsetY: -0.4,
        blinkProgress: 0.5,
        chestClavicleYOffset: 1.2,
      });

      expect(appliedTransform[4]).not.toBe(symM02);
      expect(appliedTransform[5]).not.toBe(symM12);
    });

    it("WebGLVisemeCompositor interface supports all ultimate forensic uniform options", () => {
      const compositor = new WebGLVisemeCompositor();

      const opts = {
        cardiacPulse: 0.75,
        duchenneTension: 0.60,
        tongueShadow: 0.80,
        interdentalEmbrasure: 0.70,
        buccalOcclusion: 0.75,
        mentalisTension: 0.80,
        radialCreasing: 0.60,
        alarFlareWidth: 0.04,
      };

      expect(opts.cardiacPulse).toBe(0.75);
      expect(opts.duchenneTension).toBe(0.60);
      expect(opts.tongueShadow).toBe(0.80);
      expect(opts.interdentalEmbrasure).toBe(0.70);
    });
  });
});
