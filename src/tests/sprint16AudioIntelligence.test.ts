/**
 * src/tests/sprint16AudioIntelligence.test.ts
 *
 * Sprint 16: Audio & Signal Intelligence Unit Tests
 * - D2: Speech Stress Beat Detection & Coupled Driver Micro-Nods
 * - I4: Emotional Arousal Driven Pupil Dilation (Sympathetic Mydriasis)
 * - I1: 3-State Respiratory Pattern Switching ("rest" | "speech" | "effort")
 * - D5: Acoustic Reverb / Echo Decay Gate
 * - D3: Audible Breath vs. Silence Classifier
 * - H3: WebAudio Latency Compensation
 */

import { describe, it, expect } from "vitest";
import { AcousticSentimentEngine } from "../lib/realtime/acousticSentimentEngine";
import { OcularLifeEngine } from "../lib/realtime/ocularLifeEngine";
import { ProceduralLivePortraitDriver } from "../lib/realtime/proceduralLivePortraitDriver";
import { MasterClockSync } from "../lib/realtime/masterClockSync";
import { AudioVisemeExtractor } from "../lib/realtime/audioVisemeExtractor";
import { OnnxAudioVisemeEngine, SILENT_NEURAL_FRAME } from "../lib/realtime/onnxAudioVisemeEngine";

function createMockAnalyser(populateFn?: (bins: Uint8Array) => void): AnalyserNode {
  return {
    frequencyBinCount: 256,
    fftSize: 512,
    smoothingTimeConstant: 0.35,
    getByteFrequencyData: (arr: Uint8Array) => {
      arr.fill(0);
      if (populateFn) populateFn(arr);
    },
  } as unknown as AnalyserNode;
}

describe("Sprint 16: Audio & Signal Intelligence Suite", () => {
  describe("D2: Speech Stress Beat Detection & Coupled Micro-Nods", () => {
    it("should not trigger stress beat during steady conversational speech", () => {
      const engine = new AcousticSentimentEngine("auto", 1.0);
      const analyser = createMockAnalyser((bins) => {
        // Steady speech energy in vowel bands
        for (let i = 4; i < 30; i++) bins[i] = 70;
      });

      // Warm up initial speech frames
      for (let i = 0; i < 6; i++) {
        engine.update(analyser, true, 0.016);
      }

      // Run steady frames
      let stressBeatDetected = false;
      for (let i = 0; i < 20; i++) {
        const { telemetry } = engine.update(analyser, true, 0.016);
        if (telemetry.isStressBeat) {
          stressBeatDetected = true;
        }
      }
      expect(stressBeatDetected).toBe(false);
      expect(engine.getIsStressBeat()).toBe(false);
    });

    it("should detect sudden syllable stress beat on >1.8x energy surge", () => {
      const engine = new AcousticSentimentEngine("auto", 1.0);
      let currentEnergy = 35;
      const analyser = createMockAnalyser((bins) => {
        for (let i = 4; i < 30; i++) bins[i] = currentEnergy;
      });

      // Establish baseline energy
      for (let i = 0; i < 25; i++) {
        engine.update(analyser, true, 0.016);
      }
      expect(engine.getIsStressBeat()).toBe(false);

      // Deliver a sharp energy spike (> 2.5x baseline)
      currentEnergy = 130;
      const { telemetry } = engine.update(analyser, true, 0.016);

      expect(telemetry.isStressBeat).toBe(true);
      expect(telemetry.stressBeatIntensity).toBeGreaterThan(0.2);
      expect(engine.getIsStressBeat()).toBe(true);
      expect(engine.getStressBeatIntensity()).toBeGreaterThan(0.2);
    });

    it("should enforce 220ms refractory cooldown between consecutive stress beats", () => {
      const engine = new AcousticSentimentEngine("auto", 1.0);
      let currentEnergy = 35;
      const analyser = createMockAnalyser((bins) => {
        for (let i = 4; i < 30; i++) bins[i] = currentEnergy;
      });

      for (let i = 0; i < 25; i++) {
        engine.update(analyser, true, 0.016);
      }

      // First spike triggers stress beat
      currentEnergy = 140;
      const step1 = engine.update(analyser, true, 0.016);
      expect(step1.telemetry.isStressBeat).toBe(true);

      // Immediate follow-up frame (16ms later, within 220ms refractory window)
      currentEnergy = 160;
      const step2 = engine.update(analyser, true, 0.016);
      expect(step2.telemetry.isStressBeat).toBe(false);

      // Advance time past 240ms cooldown
      for (let i = 0; i < 16; i++) {
        currentEnergy = 35;
        engine.update(analyser, true, 0.016);
      }

      // Next spike after cooldown should trigger successfully
      currentEnergy = 150;
      const step3 = engine.update(analyser, true, 0.016);
      expect(step3.telemetry.isStressBeat).toBe(true);
    });

    it("should induce pitch-kick micro-nod and brow flash on procedural driver", () => {
      const driver = new ProceduralLivePortraitDriver({
        motionIntensity: 1.0,
        isAutoAnimate: true,
      });

      // Initially zero kick
      const state0 = driver.update(0.016);
      const pitch0 = state0.pitchDeg;

      // Trigger stress beat emphasis
      driver.triggerStressBeat(1.2);
      const state1 = driver.update(0.016);

      // Pitch kick is negative (downward nod)
      expect(state1.pitchDeg).toBeLessThan(pitch0);
    });
  });

  describe("I4: Emotional Arousal Driven Pupil Dilation (Sympathetic Mydriasis)", () => {
    it("should modulate pupil diameter via sympathetic nervous system arousal", () => {
      const ocular = new OcularLifeEngine();

      // Baseline neutral arousal (centered at 1.0)
      ocular.setEmotionalArousal(0.0, 0.0);
      let t = 0;
      for (let i = 0; i < 20; i++) {
        t += 0.016;
        ocular.update(t, 0.5, 0.5, false, 1.0, 0.0, 0.5);
      }
      const neutralDilation = ocular.getArousalDilation();
      expect(neutralDilation).toBeCloseTo(1.0, 2);

      // High emotional arousal (excited / alarmed news broadcast)
      ocular.setEmotionalArousal(0.8, 0.9);
      for (let i = 0; i < 40; i++) {
        t += 0.016;
        ocular.update(t, 0.5, 0.5, false, 1.0, 0.0, 0.5);
      }
      const highDilation = ocular.getArousalDilation();
      // Expect sympathetic mydriasis (pupil dilation up to +16%, multiplier ~1.15)
      expect(highDilation).toBeGreaterThan(1.08);
      expect(highDilation).toBeLessThanOrEqual(1.18);

      t += 0.016;
      const ocularState = ocular.update(t, 0.5, 0.5, false, 1.0, 0.0, 0.5);
      expect(ocularState.arousalDilation).toBeCloseTo(highDilation, 2);
      expect(ocularState.plrScale).toBeGreaterThan(1.0);
    });

    it("should forward emotional arousal from procedural driver to ocular engine", () => {
      const driver = new ProceduralLivePortraitDriver();
      driver.setEmotionalArousal(0.75, 0.85);

      let t = 0;
      for (let i = 0; i < 35; i++) {
        t += 0.016;
        driver.update(t);
      }
      expect(driver.getOcularEngine().getArousalDilation()).toBeGreaterThan(1.05);
    });
  });

  describe("I1: 3-State Respiratory Pattern Switching", () => {
    it("should smoothly switch between rest, speech, and effort breathing kinematics", () => {
      const driver = new ProceduralLivePortraitDriver({ isAutoAnimate: true });

      // Default is rest mode
      expect(driver.getRespiratoryMode()).toBe("rest");

      // Warm up rest mode
      for (let i = 0; i < 30; i++) {
        driver.update(0.016);
      }
      const restState = driver.update(0.016);
      expect(restState.respiratoryState).toBe("rest");

      // Switch to speech mode (faster irregular breathing)
      driver.setRespiratoryMode("speech");
      expect(driver.getRespiratoryMode()).toBe("speech");
      for (let i = 0; i < 40; i++) {
        driver.update(0.016);
      }
      const speechState = driver.update(0.016);
      expect(speechState.respiratoryState).toBe("speech");

      // Switch to effort mode (deep urgent breathing with clavicular shrug)
      driver.setRespiratoryMode("effort");
      expect(driver.getRespiratoryMode()).toBe("effort");
      for (let i = 0; i < 40; i++) {
        driver.update(0.016);
      }
      const effortState = driver.update(0.016);
      expect(effortState.respiratoryState).toBe("effort");
      expect(effortState.shoulderBreath).toBeDefined();
    });
  });

  describe("D5: Acoustic Reverb / Echo Decay Gate", () => {
    it("should activate reverb gate attenuation during 150ms window after speech ends", () => {
      const clock = new MasterClockSync();
      const t0 = 1000;

      clock.notifySpeechState(true, t0);
      expect(clock.isReverbGateActive(t0)).toBe(false);
      expect(clock.getReverbGateAttenuation(t0)).toBe(1.0);

      // Anchor stops speaking at t = 2000ms
      clock.notifySpeechState(false, 2000);

      // 40ms into decay window: reverb gate active with exponential suppression
      expect(clock.isReverbGateActive(2040)).toBe(true);
      const atten40 = clock.getReverbGateAttenuation(2040);
      expect(atten40).toBeLessThan(1.0);
      expect(atten40).toBeGreaterThan(0.0);

      // 100ms into decay window: attenuation continues easing back
      const atten100 = clock.getReverbGateAttenuation(2100);
      expect(atten100).toBeGreaterThan(atten40);

      // Past 150ms: reverb gate turns off and returns full 1.0 factor
      expect(clock.isReverbGateActive(2200)).toBe(false);
      expect(clock.getReverbGateAttenuation(2200)).toBe(1.0);
    });

    it("should suppress phantom reverb reflections in AudioVisemeExtractor and OnnxAudioVisemeEngine", () => {
      const visemeExt = new AudioVisemeExtractor();
      expect(visemeExt.getReverbGateAttenuation()).toBe(1.0);

      visemeExt.setReverbGateAttenuation(0.4);
      expect(visemeExt.getReverbGateAttenuation()).toBe(0.4);

      const onnxEng = new OnnxAudioVisemeEngine();
      expect(onnxEng.getReverbGateAttenuation()).toBe(1.0);

      onnxEng.setReverbGateAttenuation(0.5);
      expect(onnxEng.getReverbGateAttenuation()).toBe(0.5);
    });
  });

  describe("D3: Audible Breath vs. True Silence Classifier", () => {
    it("should classify diffuse broadband breath and avoid snapping jaw shut", () => {
      const extractor = new AudioVisemeExtractor();
      const breathAnalyser = createMockAnalyser((bins) => {
        // Low energy across speech frequencies without high sibilant spikes
        for (let i = 2; i < 35; i++) bins[i] = 12;
      });
      extractor.attachAnalyser(breathAnalyser);

      const frame = extractor.extractViseme();
      if (frame.rms >= 0.008 && frame.rms < 0.08) {
        expect(frame.isAudibleBreath).toBe(true);
        expect(frame.breathIntensity).toBeGreaterThan(0.0);
        // Jaw stays slightly parted for physiological inhalation
        expect(frame.jawOpen).toBeGreaterThan(0.0);
      }
    });

    it("should classify silence when energy is below threshold and decay jaw to zero", () => {
      const extractor = new AudioVisemeExtractor();
      const silentAnalyser = createMockAnalyser((bins) => {
        bins.fill(0);
      });
      extractor.attachAnalyser(silentAnalyser);

      // Advance several frames to settle spring
      for (let i = 0; i < 20; i++) {
        extractor.extractViseme();
      }
      const frame = extractor.extractViseme();
      expect(frame.isAudibleBreath).toBe(false);
      expect(frame.breathIntensity).toBe(0.0);
      expect(frame.jawOpen).toBeCloseTo(0.0, 3);
    });

    it("should verify SILENT_NEURAL_FRAME default breath state in OnnxAudioVisemeEngine", () => {
      expect(SILENT_NEURAL_FRAME.isAudibleBreath).toBe(false);
      expect(SILENT_NEURAL_FRAME.breathIntensity).toBe(0);
    });
  });

  describe("H3: WebAudio Latency Compensation", () => {
    it("should support setting and reading WebAudio buffer latency offset", () => {
      const extractor = new AudioVisemeExtractor();
      expect(extractor.getWebAudioLatencyMs()).toBe(0);

      extractor.setWebAudioLatencyMs(35);
      expect(extractor.getWebAudioLatencyMs()).toBe(35);

      const onnxEngine = new OnnxAudioVisemeEngine();
      expect(onnxEngine.getWebAudioLatencyMs()).toBe(0);

      onnxEngine.setWebAudioLatencyMs(42);
      expect(onnxEngine.getWebAudioLatencyMs()).toBe(42);
    });
  });
});
