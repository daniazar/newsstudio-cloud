/**
 * src/tests/proceduralLivePortraitDriver.test.ts
 *
 * Unit tests for ProceduralLivePortraitDriver (3D VOR, pre-speech inhalation, asymmetry)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProceduralLivePortraitDriver } from '../lib/realtime/proceduralLivePortraitDriver';

describe('ProceduralLivePortraitDriver Suite', () => {
  let driver: ProceduralLivePortraitDriver;

  beforeEach(() => {
    driver = new ProceduralLivePortraitDriver({
      isAutoAnimate: false,
      cameraEyeLock: true,
      motionIntensity: 1.0,
    });
  });

  it('should counter-rotate gaze vertically on head pitch downward (3D VOR)', () => {
    driver.setManualPose(-15, 0, 0);
    let state = driver.update(1.0);
    for (let i = 1; i <= 15; i++) {
      state = driver.update(1.0 + i * 0.016);
    }

    // With 3D VOR, vertical gaze should counter-rotate upward (positive Y) to maintain eye lock
    expect(state.pitchDeg).toBeLessThan(-10);
    expect(state.gazeY).toBeGreaterThan(0.05);
  });

  it('should counter-rotate gaze horizontally on head yaw (Horizontal VOR)', () => {
    driver.setManualPose(0, 15, 0);
    let state = driver.update(1.0);
    for (let i = 1; i <= 15; i++) {
      state = driver.update(1.0 + i * 0.016);
    }

    // Eyes should counter-turn to the left (negative X) to keep locked on lens
    expect(state.yawDeg).toBeGreaterThan(10);
    expect(state.gazeX).toBeLessThan(-0.05);
  });

  it('should trigger pre-speech inhalation and clavicular rise on anticipateSpeech', () => {
    driver.anticipateSpeech(0.18);
    let state = driver.update(1.0);
    for (let i = 1; i <= 5; i++) {
      state = driver.update(1.0 + i * 0.016);
    }

    // Clavicular breathing and eye focus should be elevated
    expect(state.shoulderBreath).toBeGreaterThan(0.001);
    expect(state.eyeWidening).toBeGreaterThan(1.0);
  });

  it('should provide non-zero stochastic hemispheric asymmetry across frames', () => {
    const state1 = driver.update(1.0);
    const state2 = driver.update(2.5);

    expect(typeof state1.asymmetry).toBe("number");
    expect(state1.asymmetry).not.toBe(0);
    expect(state1.asymmetry).not.toEqual(state2.asymmetry);
  });

  it('should trigger upper-face coupling (brow flash & chin kick) via feedVisemeCoupling', () => {
    driver.feedVisemeCoupling({
      lipCompression: 0.8,
      teethClenched: 0.2,
      dominantViseme: 'PP',
    });
    driver.update(1.0);

    // Burst into open /aa/ vowel (compression drop > 0.35)
    driver.feedVisemeCoupling({
      lipCompression: 0.1,
      teethClenched: 0.1,
      dominantViseme: 'aa',
      visemeWeights: { aa: 0.85 },
    });
    const state = driver.update(1.016);

    expect(state.eyebrowRaise).toBeGreaterThan(0.0);
  });

  it('should exhibit lowered subtle default respiration baseline and obey respirationScale', () => {
    driver.setConfig({ isAutoAnimate: true });
    // 1. In rest mode, baseline peak amplitude should be subtle (< 0.003, down from previous 0.0045-0.0085)
    driver.setRespiratoryMode("rest");
    let maxBreath = 0;
    for (let t = 0; t <= 4.0; t += 0.05) {
      const state = driver.update(t);
      maxBreath = Math.max(maxBreath, Math.abs(state.shoulderBreath));
    }
    expect(maxBreath).toBeGreaterThan(0.0005);
    expect(maxBreath).toBeLessThan(0.0035);
    expect(driver.getRespirationScale()).toBe(1.0);

    // 2. Setting respirationScale = 0.0 should freeze breathing completely
    driver.setRespirationScale(0.0);
    expect(driver.getRespirationScale()).toBe(0.0);
    const frozenState = driver.update(5.0);
    expect(frozenState.shoulderBreath).toBe(0.0);
    expect(frozenState.respirationScale).toBe(0.0);

    // 3. Setting respirationScale = 0.5 should reduce amplitude by 50%
    driver.setRespirationScale(0.5);
    expect(driver.getRespirationScale()).toBe(0.5);
    let maxHalfBreath = 0;
    for (let t = 6.0; t <= 10.0; t += 0.05) {
      const state = driver.update(t);
      maxHalfBreath = Math.max(maxHalfBreath, Math.abs(state.shoulderBreath));
    }
    expect(maxHalfBreath).toBeLessThan(maxBreath * 0.7);
  });
});
