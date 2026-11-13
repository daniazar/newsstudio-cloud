/**
 * src/tests/lingualDynamicsEngine.test.ts
 *
 * Unit tests for LingualDynamicsEngine (tongue elevation, protrusion, median sulcus)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LingualDynamicsEngine } from '../lib/realtime/lingualDynamicsEngine';
import { OculusViseme } from '../lib/realtime/audioVisemeExtractor';

describe('LingualDynamicsEngine Suite', () => {
  let engine: LingualDynamicsEngine;

  beforeEach(() => {
    engine = new LingualDynamicsEngine();
  });

  it('should initialize with neutral silence state', () => {
    const state = engine.update(1.0, null);
    expect(state.tongueElevation).toBe(0.0);
    expect(state.tongueProtrusion).toBe(0.0);
    expect(state.phonemeClass).toBe('silence');
  });

  it('should elevate tongue blade on alveolar consonants (/d, t, n/)', () => {
    const emptyWeights = {} as Record<OculusViseme, number>;
    // Step forward in time with DD active
    let state = engine.update(1.0, {
      visemeWeights: { ...emptyWeights, DD: 0.90 } as any,
    });
    for (let t = 1.0; t <= 1.15; t += 0.016) {
      state = engine.update(t, {
        visemeWeights: { ...emptyWeights, DD: 0.90 } as any,
      });
    }

    expect(state.tongueElevation).toBeGreaterThan(0.5);
    expect(state.tongueProtrusion).toBeLessThan(0.2);
    expect(state.phonemeClass).toBe('alveolar');
  });

  it('should protrude tongue between teeth on dental fricatives (/th, dh/)', () => {
    const emptyWeights = {} as Record<OculusViseme, number>;
    let state = engine.update(1.0, {
      visemeWeights: { ...emptyWeights, TH: 0.85 } as any,
    });
    for (let t = 1.0; t <= 1.15; t += 0.016) {
      state = engine.update(t, {
        visemeWeights: { ...emptyWeights, TH: 0.85 } as any,
      });
    }

    expect(state.tongueProtrusion).toBeGreaterThan(0.5);
    expect(state.phonemeClass).toBe('dental');
  });

  it('should deepen median sulcus groove on open vowels (/aa/)', () => {
    const emptyWeights = {} as Record<OculusViseme, number>;
    let state = engine.update(1.0, {
      visemeWeights: { ...emptyWeights, aa: 0.95 } as any,
    });
    for (let t = 1.0; t <= 1.15; t += 0.016) {
      state = engine.update(t, {
        visemeWeights: { ...emptyWeights, aa: 0.95 } as any,
      });
    }

    expect(state.tongueGroove).toBeGreaterThan(0.5);
    expect(state.phonemeClass).toBe('vowel');
  });

  it('should reset properly to baseline', () => {
    engine.update(1.0, { visemeWeights: { DD: 0.9 } as any });
    engine.reset();
    const state = engine.update(2.0, null);
    expect(state.tongueElevation).toBeLessThan(0.05);
  });
});
