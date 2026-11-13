import { describe, it, expect } from "vitest";
import { BuccalPuffEngine } from "../buccalPuffEngine";
import { NeuromuscularTremorEngine } from "../neuromuscularTremorEngine";
import { ZygomaticCoarticulationEngine } from "../zygomaticCoarticulationEngine";
import { ProsodicIntonationDirector } from "../prosodicIntonationDirector";
import { SaccadicGazeEngine } from "../saccadicGazeEngine";
import { AdaptiveNoiseGate } from "../adaptiveNoiseGate";
import { NEURAL_3DMM_UNIFORM_NAMES, Neural3DMMUniforms } from "../neural3DMMShader";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../shaders/neural3DMMFragmentShader";
import { DEFAULT_BIOPHYSICS_OPTIONS, BiophysicsOptions } from "../liveAnchorStageEngine";

describe("Next-Gen Biomechanical, Optical, Prosodic & Audio Realism Suite", () => {
  // ── 1. BUCCAL PUFF & AERODYNAMIC BURST ENGINE ────────────────────────────
  describe("BuccalPuffEngine", () => {
    it("accumulates intra-oral pressure during bilabial occlusion", () => {
      const engine = new BuccalPuffEngine();

      // Closed mouth with vocal energy (bilabial stop occlusion)
      let state = engine.update(0.2, 0.45, 0.0166);
      expect(state.intraoralPressure).toBeGreaterThan(0.0);
      expect(state.isBursting).toBe(false);

      // Accumulate across several frames (~120ms)
      for (let i = 0; i < 8; i++) {
        state = engine.update(0.2, 0.45, 0.0166);
      }
      expect(state.intraoralPressure).toBeGreaterThan(0.3);
      expect(state.cheekPuffOffset).toBe(0.0);
    });

    it("triggers instantaneous plosive release impulse on stomion detachment", () => {
      const engine = new BuccalPuffEngine();

      // Build pressure
      for (let i = 0; i < 10; i++) {
        engine.update(0.2, 0.6, 0.0166);
      }

      // Detach lips: aperture pops from 0.2px to 2.5px
      const burstState = engine.update(2.5, 0.6, 0.0166);
      expect(burstState.isBursting).toBe(true);
      expect(burstState.velocity).toBeGreaterThan(0.0);
      expect(burstState.intraoralPressure).toBe(0.0); // Discharged

      // Step forward: spring displaces cheek outward and elastically dissipates
      const postState = engine.update(2.5, 0.4, 0.0166);
      expect(postState.cheekPuffOffset).toBeGreaterThan(0.0);
    });
  });

  // ── 2. NEUROMUSCULAR TREMOR ENGINE ───────────────────────────────────────
  describe("NeuromuscularTremorEngine", () => {
    it("generates subtle involuntary micro-tremor during sustained silence or vowels", () => {
      const engine = new NeuromuscularTremorEngine();

      // Stationary aperture (sustained vowel / pause)
      let maxOffset = 0;
      for (let i = 0; i < 30; i++) {
        const tremor = engine.update(5.0, 0.0166);
        expect(tremor.tremorIntensity).toBeCloseTo(1.0, 1);
        maxOffset = Math.max(maxOffset, Math.abs(tremor.leftCornerY), Math.abs(tremor.chinY));
      }
      expect(maxOffset).toBeGreaterThan(0.05);
      expect(maxOffset).toBeLessThanOrEqual(0.35); // Within physiological bound
    });

    it("dampens micro-tremor during high-velocity speech articulation", () => {
      const engine = new NeuromuscularTremorEngine();

      // High velocity: aperture jumps by 8px in 16.6ms (480 px/s)
      engine.update(1.0, 0.0166);
      const tremor = engine.update(9.0, 0.0166);
      expect(tremor.tremorIntensity).toBe(0.0);
      expect(tremor.leftCornerX).toBe(0.0);
      expect(tremor.leftCornerY).toBe(0.0);
    });
  });

  // ── 3. ZYGOMATIC COARTICULATION ENGINE ────────────────────────────────────
  describe("ZygomaticCoarticulationEngine", () => {
    it("returns zero offsets when smile is neutral or frowning", () => {
      const engine = new ZygomaticCoarticulationEngine();
      const state = engine.update(0.0, 2.0);
      expect(state.commissureLiftY).toBe(0);
      expect(state.upperLipArchLift).toBe(0);
      expect(state.enamelExposureBias).toBe(0);
      expect(state.vocalTractShortening).toBe(1.0);
    });

    it("elevates upper lip and locks tooth exposure when smiling", () => {
      const engine = new ZygomaticCoarticulationEngine();
      const state = engine.update(0.75, 1.0);
      expect(state.commissureLiftY).toBeGreaterThan(2.0);
      expect(state.upperLipArchLift).toBeGreaterThan(1.2);
      expect(state.enamelExposureBias).toBeGreaterThan(0.5);
      expect(state.vocalTractShortening).toBeGreaterThan(1.05);
    });
  });

  // ── 4. PROSODIC INTONATION DIRECTOR ───────────────────────────────────────
  describe("ProsodicIntonationDirector", () => {
    it("detects rising F0 question slope and triggers eyebrow lift & cranial pitch elevation", () => {
      const director = new ProsodicIntonationDirector();
      const now = 1000;

      // Feed rising pitch: 140 Hz -> 260 Hz over 250ms (~480 Hz/s)
      let state = director.update(140, 0.35, now, 0.0166);
      for (let i = 1; i <= 10; i++) {
        state = director.update(140 + i * 12, 0.35, now + i * 25, 0.025);
      }

      expect(state.contourType).toBe("rising_question");
      expect(state.pitchDerivative).toBeGreaterThan(25.0);
      expect(state.eyebrowRaiseOffset).toBeGreaterThan(0.0);
      expect(state.headPitchOffsetDeg).toBeGreaterThan(0.0);
    });

    it("detects falling declarative cadence and triggers assertive micro-nod dip", () => {
      const director = new ProsodicIntonationDirector();
      const now = 2000;

      // Feed falling pitch: 240 Hz -> 130 Hz over 250ms
      let state = director.update(240, 0.35, now, 0.0166);
      for (let i = 1; i <= 10; i++) {
        state = director.update(240 - i * 11, 0.35, now + i * 25, 0.025);
      }

      expect(state.contourType).toBe("falling_assertion");
      expect(state.pitchDerivative).toBeLessThan(-20.0);
      expect(state.eyebrowFurrowOffset).toBeGreaterThan(0.0);
      expect(state.headPitchOffsetDeg).toBeLessThan(0.0); // Downward nod
    });
  });

  // ── 5. SACCADIC GAZE COGNITIVE AVERSION ──────────────────────────────────
  describe("SaccadicGazeEngine Cognitive Aversion", () => {
    it("triggers momentary cognitive turn-taking gaze shift", () => {
      const gaze = new SaccadicGazeEngine();
      expect(gaze.update(16.6).isCognitiveAverting).toBe(false);

      gaze.triggerCognitiveAversion(300, -1);
      const avertingState = gaze.update(16.6);
      expect(avertingState.isCognitiveAverting).toBe(true);
      expect(Math.abs(avertingState.gazeOffsetX)).toBeGreaterThan(0.0);
    });
  });

  // ── 6. ADAPTIVE NOISE GATE ────────────────────────────────────────────────
  describe("AdaptiveNoiseGate", () => {
    it("attenuates low-energy ambient noise below SNR threshold", () => {
      const gate = new AdaptiveNoiseGate({ initialNoiseFloor: 0.015, minSnrDb: 6.0 });

      // Ambient HVAC noise at 0.014 RMS (near noise floor)
      const quiet = gate.process(0.014, 0.0166);
      expect(quiet.gateFactor).toBeLessThan(0.5);
      expect(quiet.cleanEnergyRms).toBeLessThan(0.014);
      expect(quiet.isSpeechActive).toBe(false);
    });

    it("passes active speech signals with high SNR", () => {
      const gate = new AdaptiveNoiseGate({ initialNoiseFloor: 0.010, minSnrDb: 6.0 });

      // Run a few frames of speech onset (0.35 RMS)
      let active = gate.process(0.35, 0.0166);
      for (let i = 0; i < 5; i++) {
        active = gate.process(0.35, 0.0166);
      }
      expect(active.gateFactor).toBeGreaterThan(0.85);
      expect(active.cleanEnergyRms).toBeGreaterThan(0.25);
      expect(active.isSpeechActive).toBe(true);
    });
  });

  // ── 7. SHADER & BIOPHYSICS UNIFORMS & GLSL INTEGRITY ──────────────────────
  describe("Shader Uniforms & GLSL Parity", () => {
    it("declares all new optical and micro-structural uniforms in NEURAL_3DMM_UNIFORM_NAMES", () => {
      const required = [
        "u_ischemicBlanch",
        "u_tearMeniscus",
        "u_limbusSoftening",
        "u_oralParallax",
        "u_sulcalTension",
      ];
      for (const u of required) {
        expect(NEURAL_3DMM_UNIFORM_NAMES).toContain(u);
      }
    });

    it("contains GLSL uniform declarations and implementations in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_ischemicBlanch;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_tearMeniscus;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_limbusSoftening;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_oralParallax;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_sulcalTension;");

      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("blanchTint");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("meniscusLineL");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("meniscusLineR");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("limbusEdgeL");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("limbusEdgeR");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sulcusWave");

      // Verify that left eye variables are not leaked into right eye block
      const rightEyeBlock = NEURAL_3DMM_FRAGMENT_SHADER.split("Right Eye Softbox Catchlight")[1]?.split("6B. ANATOMICAL DOWNWARD EYELID")[0];
      expect(rightEyeBlock).toBeDefined();
      expect(rightEyeBlock).not.toContain("normCorneaDistSqL");
      expect(rightEyeBlock).toContain("normCorneaDistSqR");
    });

    it("verifies BiophysicsOptions defaults include all new subsystems", () => {
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableBuccalPuff).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableNeuromuscularTremor).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableZygomaticCoarticulation).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableProsodicIntonation).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableAdaptiveNoiseGate).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableTearMeniscus).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableLimbusSoftening).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableOralParallax).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableSulcalTension).toBe(true);
    });
  });
});
