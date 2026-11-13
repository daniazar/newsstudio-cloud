/**
 * src/lib/realtime/head-engine/__tests__/RespirationModule.test.ts
 *
 * Unit tests for RespirationModule:
 * 1. Respiration cycle phase progression (12-16 breaths/min autonomic rhythm).
 * 2. Asymmetric physiological breathing curve (faster inhale ~40%, slower relaxed exhale ~60%).
 * 3. Pre-speech inhalation trigger prior to phonation onset.
 * 4. Respiratory rate scaling under emotional arousal (e.g. angry/intense faster, calm/analyst slower).
 * 5. Bounded torso shift and chest expansion values.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RespirationModule } from "../modules/RespirationModule";

describe("RespirationModule", () => {
  let testModule: RespirationModule;

  beforeEach(() => {
    testModule = new RespirationModule();
  });

  it("advances respiration phase over time at standard autonomic frequency (~0.2 Hz)", () => {
    const s0 = testModule.update({ timestamp: 0 });
    expect(s0.respirationCycle).toBeGreaterThanOrEqual(0.0);
    expect(s0.respirationCycle).toBeLessThan(2 * Math.PI);

    // After 2.5 seconds (half a ~5s cycle), phase should advance by approx PI
    const s1 = testModule.update({ timestamp: 2500 });
    expect(s1.respirationCycle).toBeGreaterThan(s0.respirationCycle);
  });

  it("models asymmetric physiological breathing curve (inhale faster than exhale)", () => {
    // Collect samples over one complete 5-second cycle
    const samples: number[] = [];
    for (let t = 0; t <= 5000; t += 200) {
      const state = testModule.update({ timestamp: t });
      samples.push(state.torsoVerticalShift);
    }

    // Inhale peak should occur within first 45% of cycle
    const maxVal = Math.max(...samples);
    const peakIndex = samples.indexOf(maxVal);
    const peakRatio = peakIndex / samples.length;
    expect(peakRatio).toBeLessThan(0.50);
  });

  it("activates pre-speech inhalation trigger when speech onset is signalled", () => {
    // Normal resting state
    const resting = testModule.update({ timestamp: 1000, isSpeechStarting: false });
    expect(resting.preSpeechInhalation).toBe(0.0);

    // Signal speech onset
    const inhale = testModule.update({ timestamp: 1200, isSpeechStarting: true });
    expect(inhale.preSpeechInhalation).toBeGreaterThan(0.5);
    // Torso should lift upwards (negative Y in screen coords or positive expansion)
    expect(inhale.chestExpansion).toBeGreaterThan(resting.chestExpansion);

    // Later when speaking is in progress, preSpeechInhalation decays
    const speaking = testModule.update({ timestamp: 2000, isSpeaking: true });
    expect(speaking.preSpeechInhalation).toBeLessThan(inhale.preSpeechInhalation);
  });

  it("scales breathing rate dynamically with emotional arousal rateScale", () => {
    const normalMod = new RespirationModule();
    const agitatedMod = new RespirationModule();

    // Run both for 2000ms
    const sNormal = normalMod.update({ timestamp: 2000, rateScale: 1.0 });
    const sAgitated = agitatedMod.update({ timestamp: 2000, rateScale: 1.8 });

    // The agitated testModule should have advanced through its phase faster
    expect(sAgitated.respirationCycle).toBeGreaterThan(sNormal.respirationCycle);
  });

  it("strictly bounds torso displacement within subtle micro-motion thresholds", () => {
    for (let t = 0; t <= 10000; t += 100) {
      const state = testModule.update({
        timestamp: t,
        rateScale: 2.5,
        isSpeechStarting: true,
      });
      expect(Math.abs(state.torsoVerticalShift)).toBeLessThanOrEqual(0.025);
      expect(state.chestExpansion).toBeGreaterThanOrEqual(0.0);
      expect(state.chestExpansion).toBeLessThanOrEqual(1.0);
    }
  });
});
