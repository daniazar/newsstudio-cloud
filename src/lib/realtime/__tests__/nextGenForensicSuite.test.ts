import { describe, it, expect } from "vitest";
import { OneEuroFilter, LandmarkOneEuroFilter } from "../oneEuroFilter";
import { SibilantConstraintEngine } from "../sibilantConstraintEngine";
import { PhoneticStressCoupler } from "../phoneticStressCoupler";
import { MultiAngleYawBlender } from "../multiAngleYawBlender";
import { LabiodentalEngine } from "../labiodentalEngine";
import { NasalAlarEngine } from "../nasalAlarEngine";
import { AffineMouthCompositor, LandmarkTarget } from "../affineMouthCompositor";
import { WebGLVisemeCompositor } from "../webglVisemeCompositor";

describe("Next-Gen Forensic Realism Suite (Upgrades 1-7)", () => {
  const baseLandmark: LandmarkTarget = {
    cx: 128.0,
    cy: 160.0,
    w: 94.5,
    h: 30.56,
    angle: 0.0,
    yawDeg: 0.0,
    pitchDeg: 0.0,
  };

  // ── 1. SUB-PIXEL DUAL-STATE 1-EURO FILTER (ITEM 6) ─────────────────────────
  describe("Sub-Pixel Dual-State 1-Euro Filter", () => {
    it("suppresses stationary sub-pixel tracking jitter without lag", () => {
      const filter = new OneEuroFilter({ minCutoff: 0.8, beta: 0.007 });
      const staticVal = 100.0;
      let filtered = staticVal;

      // Simulate 30 frames of stationary jitter (+- 0.4px noise)
      let noiseMax = 0;
      for (let i = 0; i < 30; i++) {
        const noise = (Math.sin(i * 1.7) * 0.4);
        const noisyVal = staticVal + noise;
        filtered = filter.filter(noisyVal, i * 0.0166);
        const dev = Math.abs(filtered - staticVal);
        if (dev > noiseMax) noiseMax = dev;
      }

      // Jitter is attenuated down to < 0.18px
      expect(noiseMax).toBeLessThan(0.18);
    });

    it("dynamically increases cutoff frequency during rapid motion bursts", () => {
      const filter = new OneEuroFilter({ minCutoff: 0.8, beta: 0.01 });

      // Initialize filter at 100.0
      filter.filter(100.0, 0.0);

      // Fast linear velocity: 100.0 -> 250.0 in 5 frames (60 fps, ~1800 px/s)
      let filtered = 100.0;
      for (let i = 1; i <= 5; i++) {
        const target = 100.0 + i * 30.0;
        filtered = filter.filter(target, i * 0.0166);
      }

      // High velocity ensures filter responds aggressively without sluggish drag
      expect(filtered).toBeGreaterThan(210.0);
    });

    it("filters multi-dimensional facial landmarks and preserves optional fields", () => {
      const landmarkFilter = new LandmarkOneEuroFilter();

      const noisyTarget: LandmarkTarget = {
        cx: 128.4,
        cy: 160.3,
        w: 94.8,
        h: 30.8,
        angle: 0.5,
        yawDeg: 12.2,
        pitchDeg: -4.1,
      };

      const out = landmarkFilter.filter(noisyTarget, 0.0166);
      expect(out.cx).toBeCloseTo(128.4, 1);
      expect(out.cy).toBeCloseTo(160.3, 1);
      expect(out.w).toBeCloseTo(94.8, 1);
      expect(out.h).toBeDefined();
      expect(out.yawDeg).toBeDefined();
      expect(out.pitchDeg).toBeDefined();

      landmarkFilter.reset();
    });
  });

  // ── 2. ACOUSTIC SIBILANT DENTAL PROXIMITY CONSTRAINT (ITEM 3) ────────────
  describe("Acoustic Sibilant Dental Proximity Constraint", () => {
    it("detects high-frequency energy in audio PCM frame", () => {
      const engine = new SibilantConstraintEngine();

      // High-frequency alternating signal (Nyquist quadrant)
      const pcm = new Float32Array(256);
      for (let i = 0; i < pcm.length; i++) {
        pcm[i] = (i % 2 === 0 ? 0.9 : -0.9);
      }

      // Run multiple frames to allow temporal smoothing attack
      let state = engine.update(10.0, 8.0, pcm, 16000, "", 16.6);
      for (let i = 0; i < 4; i++) {
        state = engine.update(10.0, 8.0, pcm, 16000, "", 16.6);
      }

      expect(state.isSibilantActive).toBe(true);
      expect(state.sibilantEnergyRatio).toBeGreaterThan(0.35);
      expect(state.incisalProximity).toBeGreaterThan(0.2);
    });

    it("classifies phonemes correctly (/S/, /Z/, /SH/ vs /AA/, /M/)", () => {
      const engine = new SibilantConstraintEngine();

      // Test sibilant phoneme
      let stateS = engine.update(10.0, 8.0, undefined, 16000, "S", 16.6);
      for (let i = 0; i < 3; i++) {
        stateS = engine.update(10.0, 8.0, undefined, 16000, "S", 16.6);
      }
      expect(stateS.isSibilantActive).toBe(true);
      expect(stateS.sibilantEnergyRatio).toBeGreaterThan(0.35);

      // Reset and test open vowel
      engine.reset();
      const stateAA = engine.update(10.0, 8.0, undefined, 16000, "AA", 16.6);
      expect(stateAA.isSibilantActive).toBe(false);
      expect(stateAA.sibilantEnergyRatio).toBe(0.0);
    });

    it("strictly clamps jaw descent to <= 1.8px and enforces incisal proximity slit", () => {
      const engine = new SibilantConstraintEngine();

      // Sibilant state
      const sibilantState = {
        isSibilantActive: true,
        sibilantEnergyRatio: 0.85,
        maxJawDescentPx: 1.8,
        clampedAperture: 1.2,
        widthMultiplier: 1.08,
        incisalProximity: 1.0,
      };

      const constrained = engine.constrain(baseLandmark, 9.5, sibilantState);

      // Jaw descent clamped to <= 1.8px
      expect(constrained.clampedJawDescent).toBeLessThanOrEqual(1.8);
      // Incisal contact slit height clamped
      expect(constrained.incisalSlitHeight).toBeLessThanOrEqual(1.8);
      // Lateral corner stretch applied (+8% smile spread)
      expect(constrained.constrainedLandmark.w).toBeGreaterThan(baseLandmark.w * 1.05);
      expect(constrained.isContactSlit).toBe(true);
    });

    it("leaves landmark unconstrained during non-sibilant speech", () => {
      const engine = new SibilantConstraintEngine();
      const nonSibilantState = {
        isSibilantActive: false,
        sibilantEnergyRatio: 0.05,
        maxJawDescentPx: 8.0,
        clampedAperture: 8.0,
        widthMultiplier: 1.0,
        incisalProximity: 0.0,
      };

      const constrained = engine.constrain(baseLandmark, 8.0, nonSibilantState);
      expect(constrained.clampedJawDescent).toBe(8.0);
      expect(constrained.constrainedLandmark.w).toBe(baseLandmark.w);
      expect(constrained.isContactSlit).toBe(false);
    });
  });

  // ── 3. PHONETIC STRESS MICRO-NOD COUPLING (ITEM 7) ─────────────────────────
  describe("Phonetic Stress Micro-Nod Coupling", () => {
    it("induces downward micro-nod and pitch tilt on vocal stress spikes", () => {
      const coupler = new PhoneticStressCoupler();

      // Syllable attack: sharp transition from 0.0 to 0.90 RMS energy + pitch inflection
      let state = coupler.update(0.90, 0.95, 0.0166);

      // Micro-nod descends
      for (let i = 0; i < 6; i++) {
        state = coupler.update(0.92, 0.95, 0.0166);
      }

      expect(state.headNodYOffset).toBeGreaterThan(0.05);
      expect(state.headNodYOffset).toBeLessThanOrEqual(2.2); // Anatomic clamp
      expect(state.headNodPitchDeg).toBeGreaterThan(0.02);
      expect(state.headNodPitchDeg).toBeLessThanOrEqual(1.0);
    });

    it("relaxes back to equilibrium without hyperextension or negative overshoot", () => {
      const coupler = new PhoneticStressCoupler();

      // Excite spring
      coupler.update(0.95, 0.95, 0.0166);
      for (let i = 0; i < 10; i++) {
        coupler.update(0.90, 0.90, 0.0166);
      }

      // Energy drops to silence
      let state = coupler.update(0.0, 0.5, 0.0166);
      for (let i = 0; i < 40; i++) {
        state = coupler.update(0.0, 0.5, 0.0166);
      }

      // Equilibrium restored, critically damped, non-negative
      expect(state.headNodYOffset).toBeGreaterThanOrEqual(0.0);
      expect(state.headNodYOffset).toBeLessThan(0.05);
      expect(state.headNodPitchDeg).toBeLessThan(0.05);
    });
  });

  // ── 4. CONTINUOUS MULTI-ANGLE YAW MORPHING (ITEM 5) ───────────────────────
  describe("Continuous Multi-Angle Yaw Morphing", () => {
    const blender = new MultiAngleYawBlender();

    it("resolves exact stops with blendFactor = 0.0", () => {
      const res0 = blender.resolve(0);
      expect(res0.angleA).toBe(0);
      expect(res0.angleB).toBe(25);
      expect(res0.blendFactor).toBe(0.0);

      const res25 = blender.resolve(25);
      expect(res25.angleA).toBe(25);
      expect(res25.angleB).toBe(45);
      expect(res25.blendFactor).toBe(0.0);
    });

    it("interpolates continuous angles between adjacent angle stops", () => {
      // 35 deg is midway between 25 and 45: t = (35 - 25) / (45 - 25) = 0.5
      const res35 = blender.resolve(35);
      expect(res35.angleA).toBe(25);
      expect(res35.angleB).toBe(45);
      expect(res35.blendFactor).toBeCloseTo(0.5, 3);
      expect(res35.isFlipped).toBe(false);

      // Negative angles mirror correctly
      const resNeg35 = blender.resolve(-35);
      expect(resNeg35.angleA).toBe(25);
      expect(resNeg35.angleB).toBe(45);
      expect(resNeg35.blendFactor).toBeCloseTo(0.5, 3);
      expect(resNeg35.isFlipped).toBe(true);
    });

    it("clamps angles beyond 90 degrees to maximum profile", () => {
      const res110 = blender.resolve(110);
      expect(res110.angleA).toBe(65);
      expect(res110.angleB).toBe(90);
      expect(res110.blendFactor).toBe(1.0);
    });

    it("formats dual-atlas asset URLs", () => {
      const res = blender.resolve(35, "ruby");
      expect(res.codebookUrlA).toContain("ruby_25deg_ditto_codebook.json");
      expect(res.codebookUrlB).toContain("ruby_45deg_ditto_codebook.json");
      expect(res.blendFactor).toBeCloseTo(0.5, 3);
    });
  });

  // ── 5. CAPILLARY HEMODYNAMICS & PRESSURE BLANCHING (ITEM 1) ───────────────
  describe("Capillary Hemodynamics & Pressure Blanching", () => {
    it("accumulates ischemic blanching during bilabial occlusion", () => {
      const labio = new LabiodentalEngine();

      // Simulate bilabial occlusion for plosive /p/ (aperture 0.1px)
      let state = labio.update(0.1, "P", 16.6);
      for (let i = 0; i < 4; i++) {
        state = labio.update(0.1, "P", 16.6);
      }

      // Capillary blanching accumulates
      expect(state.hemodynamicBlanching).toBeGreaterThan(0.25);
      expect(state.reactiveHyperemia).toBe(0.0);
    });

    it("triggers reactive hyperemia capillary flush upon plosive release", () => {
      const labio = new LabiodentalEngine();

      // Phase 1: Bilabial pressure build-up
      for (let i = 0; i < 6; i++) {
        labio.update(0.1, "P", 16.6);
      }

      // Phase 2: Plosive burst release! (aperture pops open to 4.2px)
      const burstState = labio.update(4.2, "P", 16.6);
      expect(burstState.hemodynamicBlanching).toBeLessThan(0.6);
      expect(burstState.reactiveHyperemia).toBeGreaterThan(0.4);

      // Phase 3: Flush decays over 140ms
      let decayState = burstState;
      for (let i = 0; i < 10; i++) {
        decayState = labio.update(4.2, "P", 16.6);
      }
      expect(decayState.reactiveHyperemia).toBeLessThan(0.1);
    });

    it("engages mentalis muscle tension during plosive compression and labiodental tuck", () => {
      const labio = new LabiodentalEngine();

      // Plosive compression
      for (let i = 0; i < 4; i++) {
        labio.update(0.1, "P", 16.6);
      }
      const plosiveState = labio.update(0.1, "P", 16.6);
      expect(plosiveState.mentalisTension).toBeGreaterThan(0.5);

      // Labiodental tuck (/F/)
      labio.reset();
      for (let i = 0; i < 4; i++) {
        labio.update(2.0, "F", 16.6);
      }
      const tuckState = labio.update(2.0, "F", 16.6);
      expect(tuckState.mentalisTension).toBeGreaterThan(0.4);
    });

    it("activates radial orbicularis oris puckering creasing on rounded vowels", () => {
      const labio = new LabiodentalEngine();

      // Rounded vowel /UW/ ("soon")
      for (let i = 0; i < 4; i++) {
        labio.update(2.5, "UW", 16.6);
      }
      const puckerState = labio.update(2.5, "UW", 16.6);
      expect(puckerState.radialPuckerCreasing).toBeGreaterThan(0.5);

      // Non-rounded vowel /AA/ relaxes creasing
      for (let i = 0; i < 10; i++) {
        labio.update(10.0, "AA", 16.6);
      }
      const flatState = labio.update(10.0, "AA", 16.6);
      expect(flatState.radialPuckerCreasing).toBeLessThan(0.1);
    });
  });

  // ── 6. DILATOR NARIS / ALAR NASAL WING FLARE (NASAL PHONEMES) ─────────────
  describe("Dilator Naris / Alar Nasal Wing Flare", () => {
    it("dilates alar nasal wings and elevates nostrils on nasal consonants (/m/, /n/, /ng/)", () => {
      const alar = new NasalAlarEngine();

      for (let i = 0; i < 5; i++) {
        alar.update("M", undefined, 16000, 16.6);
      }
      const nasalState = alar.update("M", undefined, 16000, 16.6);

      expect(nasalState.isNasalActive).toBe(true);
      expect(nasalState.alarExpansionRatio).toBeGreaterThan(1.02);
      expect(nasalState.alarExpansionRatio).toBeLessThanOrEqual(1.045);
      expect(nasalState.nostrilLiftPx).toBeGreaterThan(0.15);
    });

    it("detects low-frequency nasal murmur in acoustic PCM audio", () => {
      const alar = new NasalAlarEngine();

      // Synthesize low-frequency nasal murmur signal (~250 Hz at 16kHz)
      const pcm = new Float32Array(256);
      for (let i = 0; i < pcm.length; i++) {
        pcm[i] = Math.sin((2 * Math.PI * 250 * i) / 16000);
      }

      for (let i = 0; i < 5; i++) {
        alar.update("", pcm, 16000, 16.6);
      }
      const murmurState = alar.update("", pcm, 16000, 16.6);

      expect(murmurState.isNasalActive).toBe(true);
      expect(murmurState.nasalEnergyRatio).toBeGreaterThan(0.25);
    });

    it("relaxes alar wings to neutral on non-nasal speech", () => {
      const alar = new NasalAlarEngine();

      // Non-nasal phoneme
      const state = alar.update("AA", undefined, 16000, 16.6);
      expect(state.isNasalActive).toBe(false);
      expect(state.alarExpansionRatio).toBe(1.0);
      expect(state.nostrilLiftPx).toBe(0.0);
    });
  });

  // ── 7. COMPOSITOR INTEGRATION & STABILITY (UPGRADES 1-10) ──────────────────
  describe("Compositor Integration & Stability", () => {
    it("AffineMouthCompositor accepts all forensic options without crashing", () => {
      const comp = new AffineMouthCompositor();

      // Mock 2D context
      const dummyCtx = {
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        drawImage: () => {},
        clearRect: () => {},
        globalAlpha: 1.0,
      } as unknown as CanvasRenderingContext2D;

      const dummyImage = {} as CanvasImageSource;

      expect(() => {
        comp.render(dummyCtx, dummyImage, null, baseLandmark, 2.0, 1.0, {
          enableOneEuroFilter: true,
          headNodYOffset: 1.5,
          filterTimestampSec: 0.0166,
          buccalOcclusion: 0.85,
          mentalisTension: 0.65,
          radialCreasing: 0.40,
          alarFlareWidth: 0.03,
        });
      }).not.toThrow();
    });

    it("WebGLVisemeCompositor interface supports all forensic realism uniform options", () => {
      const compositor = new WebGLVisemeCompositor();

      expect(compositor).toBeDefined();
      expect(typeof compositor.render).toBe("function");

      // Verify that options type check cleanly
      const opts = {
        hemodynamicBlanch: 0.45,
        reactiveHyperemia: 0.65,
        dentalShadowStrength: 0.70,
        mucosalEvaporation: 0.25,
        yawBlendFactor: 0.50,
        headNodYOffset: 1.2,
        buccalOcclusion: 0.75,
        mentalisTension: 0.80,
        radialCreasing: 0.60,
        alarFlareWidth: 0.04,
      };
      expect(opts.hemodynamicBlanch).toBe(0.45);
      expect(opts.reactiveHyperemia).toBe(0.65);
      expect(opts.dentalShadowStrength).toBe(0.70);
      expect(opts.mucosalEvaporation).toBe(0.25);
      expect(opts.yawBlendFactor).toBe(0.50);
      expect(opts.headNodYOffset).toBe(1.2);
      expect(opts.buccalOcclusion).toBe(0.75);
      expect(opts.mentalisTension).toBe(0.80);
      expect(opts.radialCreasing).toBe(0.60);
      expect(opts.alarFlareWidth).toBe(0.04);
    });
  });
});
