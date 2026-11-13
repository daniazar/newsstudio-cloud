import { describe, it, expect } from "vitest";
import { OpticalFlowWarper, VisemeMorphState } from "../opticalFlowWarper";
import { FormantTracker } from "../formantTracker";
import { LabiodentalEngine } from "../labiodentalEngine";
import { PitchDetector } from "../pitchDetector";
import { LandmarkTarget, AffineMouthCompositor } from "../affineMouthCompositor";
import { WebGLVisemeCompositor } from "../webglVisemeCompositor";

describe("Advanced Forensic Realism Viseme Suite (7-Pillar Improvements)", () => {
  const baseLandmark: LandmarkTarget = {
    cx: 512.0,
    cy: 640.0,
    w: 94.5,
    h: 30.56,
    angle: 0.0,
  };

  // ── 1. OPTICAL FLOW WARPING & MOTION VECTOR FIELD (ITEM 1) ─────────────────
  describe("OpticalFlowWarper", () => {
    it("returns zero displacement vector when source and target states are identical", () => {
      const state: VisemeMorphState = { aperture: 5.0, width: 94.5 };
      const flow = OpticalFlowWarper.computeFlow(0.5, 0.54, state, state);

      expect(flow.vx).toBeCloseTo(0.0, 5);
      expect(flow.vy).toBeCloseTo(0.0, 5);
    });

    it("computes outward lateral expansion for lip spreading (stateB.width > stateA.width)", () => {
      const stateA: VisemeMorphState = { aperture: 4.0, width: 85.0 }; // rounded /u/
      const stateB: VisemeMorphState = { aperture: 4.0, width: 105.0 }; // spread /i/

      // Right commissure (u = 0.65 > cx = 0.5): flow.vx should be positive (moving right)
      const flowRight = OpticalFlowWarper.computeFlow(0.65, 0.54, stateA, stateB);
      expect(flowRight.vx).toBeGreaterThan(0.0);

      // Left commissure (u = 0.35 < cx = 0.5): flow.vx should be negative (moving left)
      const flowLeft = OpticalFlowWarper.computeFlow(0.35, 0.54, stateA, stateB);
      expect(flowLeft.vx).toBeLessThan(0.0);

      // Magnitude of symmetrical expansion should match
      expect(Math.abs(flowRight.vx)).toBeCloseTo(Math.abs(flowLeft.vx), 4);
    });

    it("exhibits asymmetric vertical displacement for jaw depression (lower lip > upper lip)", () => {
      const stateA: VisemeMorphState = { aperture: 1.0, width: 94.5 }; // closed
      const stateB: VisemeMorphState = { aperture: 14.0, width: 94.5 }; // open /aa/

      // Lower lip (v = 0.62 > cy = 0.54)
      const flowLower = OpticalFlowWarper.computeFlow(0.5, 0.62, stateA, stateB);
      expect(flowLower.vy).toBeGreaterThan(0.0); // downward motion

      // Upper lip (v = 0.46 < cy = 0.54)
      const flowUpper = OpticalFlowWarper.computeFlow(0.5, 0.46, stateA, stateB);
      expect(flowUpper.vy).toBeLessThan(0.0); // slight upward compliance

      // Lower lip excursion must significantly exceed upper lip compliance (~4-5x)
      expect(Math.abs(flowLower.vy)).toBeGreaterThan(Math.abs(flowUpper.vy) * 3.0);
    });

    it("attenuates to zero outside the perioral anatomical envelope", () => {
      const stateA: VisemeMorphState = { aperture: 0.0, width: 90.0 };
      const stateB: VisemeMorphState = { aperture: 16.0, width: 105.0 };

      // Distant forehead / cheek point
      const flowDistant = OpticalFlowWarper.computeFlow(0.05, 0.05, stateA, stateB);
      expect(flowDistant.vx).toBe(0.0);
      expect(flowDistant.vy).toBe(0.0);
    });

    it("computes bidirectional warped UV coordinates bounded in [0, 1]", () => {
      const stateA: VisemeMorphState = { aperture: 2.0, width: 88.0 };
      const stateB: VisemeMorphState = { aperture: 12.0, width: 98.0 };

      const warpedMid = OpticalFlowWarper.computeWarpedUvs(0.55, 0.58, stateA, stateB, 0.5);
      expect(warpedMid.uvA[0]).toBeGreaterThanOrEqual(0.0);
      expect(warpedMid.uvA[0]).toBeLessThanOrEqual(1.0);
      expect(warpedMid.uvA[1]).toBeGreaterThanOrEqual(0.0);
      expect(warpedMid.uvA[1]).toBeLessThanOrEqual(1.0);
      expect(warpedMid.uvB[0]).toBeGreaterThanOrEqual(0.0);
      expect(warpedMid.uvB[0]).toBeLessThanOrEqual(1.0);
      expect(warpedMid.uvB[1]).toBeGreaterThanOrEqual(0.0);
      expect(warpedMid.uvB[1]).toBeLessThanOrEqual(1.0);
    });
  });

  // ── 2. DUAL-FORMANT ACOUSTIC RESONANCE TRACKER (ITEM 2) ───────────────────
  describe("FormantTracker", () => {
    it("handles silence and empty buffers with graceful baseline returns", () => {
      const silence = new Float32Array(512);
      const res = FormantTracker.analyzeFrame(silence, 16000);

      expect(res.energyRms).toBe(0.0);
      expect(res.f1Hz).toBe(0.0);
      expect(res.f2Hz).toBe(0.0);
      expect(res.normalizedAperture).toBeLessThan(0.1);
      expect(res.normalizedWidth).toBe(0.5);
    });

    it("handles short buffers (N < 64) without crashing", () => {
      const shortBuf = new Float32Array(32);
      const res = FormantTracker.analyzeFrame(shortBuf, 16000);
      expect(res.energyRms).toBe(0);
      expect(res.f1Hz).toBe(0);
    });

    it("detects resonant frequency peaks and maps to biomechanical aperture & width", () => {
      const sampleRate = 16000;
      const duration = 0.05; // 50ms window
      const N = Math.round(sampleRate * duration);
      const pcm = new Float32Array(N);

      // Generate a synthetic open vowel (/a/-like) with strong F1 resonance ~700 Hz
      // and F2 resonance ~1200 Hz
      for (let i = 0; i < N; i++) {
        const t = i / sampleRate;
        const waveF1 = 0.6 * Math.sin(2 * Math.PI * 700 * t);
        const waveF2 = 0.3 * Math.sin(2 * Math.PI * 1200 * t);
        pcm[i] = waveF1 + waveF2;
      }

      const res = FormantTracker.analyzeFrame(pcm, sampleRate);
      expect(res.energyRms).toBeGreaterThan(0.1);
      expect(res.f1Hz).toBeGreaterThan(500.0);
      expect(res.f1Hz).toBeLessThan(950.0);
      // F1 around ~700 Hz should map to wide aperture (> 0.5)
      expect(res.normalizedAperture).toBeGreaterThan(0.5);
    });

    it("extracts formant trajectories across multi-frame audio sequence", () => {
      const sampleRate = 16000;
      const pcm = new Float32Array(sampleRate * 0.2); // 200ms
      for (let i = 0; i < pcm.length; i++) {
        pcm[i] = 0.4 * Math.sin((2 * Math.PI * 600 * i) / sampleRate);
      }

      const trajectory = FormantTracker.extractFormantTrajectory(pcm, sampleRate, 25.0);
      expect(trajectory.f1Hz.length).toBeGreaterThanOrEqual(4);
      expect(trajectory.apertureTrajectory.length).toBe(trajectory.f1Hz.length);
      expect(trajectory.widthTrajectory.length).toBe(trajectory.f1Hz.length);
    });
  });

  // ── 3. PLOSIVE PRESSURE & LABIODENTAL TUCK ENGINE (ITEMS 4 & 6) ───────────
  describe("LabiodentalEngine", () => {
    it("accumulates intra-oral air pressure and vermilion flattening during plosive occlusion (/p/)", () => {
      const engine = new LabiodentalEngine();

      // Frame 1: Plosive occlusion initiated (aperture = 0.2px, phoneme = 'P')
      let state = engine.update(0.2, "P", 16.6);
      expect(state.plosiveCompression).toBeGreaterThan(0.0);
      expect(state.preBurstBulge).toBeGreaterThan(0.0);
      expect(state.burstSurge).toBe(1.0); // no release yet

      // Accumulate over 45ms of continuous occlusion
      state = engine.update(0.1, "P", 16.6);
      state = engine.update(0.05, "P", 16.6);
      expect(state.plosiveCompression).toBeGreaterThan(0.7);
      expect(state.preBurstBulge).toBeGreaterThan(0.6);

      // Frame 4: Acoustic burst release (aperture opens to 2.5px)
      const burstState = engine.update(2.5, "AA", 16.6);
      expect(burstState.burstSurge).toBeGreaterThan(1.2); // Explosive burst acceleration

      // Advance 40ms: Burst surge decays back to neutral 1.0
      engine.update(4.0, "AA", 20.0);
      const settledState = engine.update(4.5, "AA", 20.0);
      expect(settledState.burstSurge).toBe(1.0);
    });

    it("triggers lower lip inward tuck and contact shadow for labiodental fricatives (/f/, /v/)", () => {
      const engine = new LabiodentalEngine();

      // Non-labiodental baseline
      let state = engine.update(3.0, "AA", 16.6);
      expect(state.labiodentalTuck).toBe(0.0);
      expect(state.contactOcclusion).toBe(0.0);

      // Phoneme /f/ introduced
      state = engine.update(2.0, "F", 16.6);
      expect(state.labiodentalTuck).toBeGreaterThan(0.2); // rolls inward towards target (0.78)

      // Next frame of /f/ continues inward tuck
      state = engine.update(2.0, "F", 16.6);
      expect(state.labiodentalTuck).toBeGreaterThan(0.4);
      expect(state.contactOcclusion).toBeGreaterThan(0.2); // contact shadow under upper incisors

      // Transition to vowel /iy/ relaxes the tuck
      state = engine.update(4.0, "IY", 16.6);
      expect(state.labiodentalTuck).toBeLessThan(0.4);
    });

    it("resets cleanly to baseline state", () => {
      const engine = new LabiodentalEngine();
      engine.update(0.1, "B", 30.0);
      engine.reset();

      const fresh = engine.update(5.0, "N", 16.6);
      expect(fresh.plosiveCompression).toBe(0.0);
      expect(fresh.preBurstBulge).toBe(0.0);
      expect(fresh.burstSurge).toBe(1.0);
      expect(fresh.labiodentalTuck).toBe(0.0);
    });
  });

  // ── 4. PITCH-COUPLED LARYNGEAL INFLECTION (ITEM 5) ─────────────────────────
  describe("PitchDetector & Laryngeal Tracking", () => {
    it("accurately detects pure tone fundamental frequency within ±10 Hz", () => {
      const sampleRate = 16000;
      const duration = 0.2; // 200ms
      const N = Math.round(sampleRate * duration);
      const pcm = new Float32Array(N);

      const targetF0 = 220.0; // Musical A3
      for (let i = 0; i < N; i++) {
        pcm[i] = 0.5 * Math.sin((2 * Math.PI * targetF0 * i) / sampleRate);
      }

      const result = PitchDetector.extractPitchTrajectory(pcm, sampleRate, 25.0);
      expect(result.rawF0Hz.length).toBeGreaterThan(0);
      expect(result.medianF0Hz).toBeGreaterThanOrEqual(targetF0 - 10.0);
      expect(result.medianF0Hz).toBeLessThanOrEqual(targetF0 + 10.0);
    });

    it("maps high pitch inflection to elevated normalized pitch for laryngeal lift", () => {
      const sampleRate = 16000;
      const N = sampleRate * 0.15; // 150ms
      const pcm = new Float32Array(N);

      // Soprano / high pitch tone (320 Hz)
      for (let i = 0; i < N; i++) {
        pcm[i] = 0.5 * Math.sin((2 * Math.PI * 320.0 * i) / sampleRate);
      }

      const result = PitchDetector.extractPitchTrajectory(pcm, sampleRate, 25.0);
      expect(result.normalizedPitch[0]).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ── 5. COMPOSITOR EXTENDED UNIFORMS & INTEGRATION ─────────────────────────
  describe("Compositor Integration with Advanced Forensic Realism", () => {
    it("AffineMouthCompositor accepts laryngealYOffset and labiodentalTuck without error", () => {
      const compositor = new AffineMouthCompositor();
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
        setTransform: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      };

      const mockImage: any = { width: 256, height: 256 };

      expect(() => {
        compositor.render(mockCtx, mockImage, mockImage, baseLandmark, 6.0, 1.0, {
          laryngealYOffset: -2.4, // pitch lift
          labiodentalTuck: 0.75, // /f/ tuck
          anchorUpperLip: true,
        });
      }).not.toThrow();
    });

    it("WebGLVisemeCompositor instantiates and exposes all advanced uniform properties", () => {
      const compositor = new WebGLVisemeCompositor();
      expect(compositor).toBeDefined();
      expect(compositor.isReady()).toBe(false); // No WebGL context in headless Node

      // Verify that sampleSkinProbe returns fallback when canvas is undefined
      const probe = compositor.sampleSkinProbe({} as any, baseLandmark);
      expect(probe.lumaRatio).toBe(1.0);
      expect(probe.gain).toEqual([1.0, 1.0, 1.0]);
    });
  });
});
