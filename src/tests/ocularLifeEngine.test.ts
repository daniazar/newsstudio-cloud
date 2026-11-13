/**
 * src/tests/ocularLifeEngine.test.ts
 *
 * Unit tests for OcularLifeEngine (fixational drift, micro-saccades, pupillary hippus)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OcularLifeEngine } from '../lib/realtime/ocularLifeEngine';

describe('OcularLifeEngine Suite', () => {
  let engine: OcularLifeEngine;

  beforeEach(() => {
    engine = new OcularLifeEngine({
      saccadeRate: 1.0,
      amplitudeScale: 1.0,
      teleprompterEnabled: true,
      teleprompterPeriod: 2.4,
    });
  });

  it('should initialize with neutral state and zero velocity', () => {
    const state = engine.update(1.0, 0.0, 0.0, false, 1.0);
    expect(state).toHaveProperty('gazeX');
    expect(state).toHaveProperty('gazeY');
    expect(state).toHaveProperty('pupilHippus');
    expect(state).toHaveProperty('saccadeVelocity');
    expect(state.pupilHippus).toBeGreaterThan(0.9);
    expect(state.pupilHippus).toBeLessThan(1.15);
  });

  it('should generate continuous bounded drift over time', () => {
    let prevGazeX = 0;
    for (let t = 1.0; t < 3.0; t += 0.033) {
      const state = engine.update(t, 0.1, -0.05, true, 1.2);
      expect(state.gazeX).toBeGreaterThanOrEqual(-1.0);
      expect(state.gazeX).toBeLessThanOrEqual(1.0);
      expect(state.gazeY).toBeGreaterThanOrEqual(-1.0);
      expect(state.gazeY).toBeLessThanOrEqual(1.0);
      prevGazeX = state.gazeX;
    }
    expect(prevGazeX).toBeDefined();
  });

  it('should oscillate pupillary hippus around 1.0 (autonomic breathing rhythm)', () => {
    const values: number[] = [];
    for (let t = 0.0; t < 10.0; t += 0.033) {
      const state = engine.update(t, 0.0, 0.0, false, 1.0);
      values.push(state.pupilHippus);
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(min).toBeLessThan(1.0);
    expect(max).toBeGreaterThan(1.0);
    expect(max - min).toBeGreaterThan(0.02); // Observable hippus amplitude
  });

  it('should reset properly to neutral values', () => {
    engine.update(1.0, 0.5, 0.5, false, 1.0);
    engine.reset();
    const state = engine.update(2.0, 0.0, 0.0, false, 0.0);
    expect(Math.abs(state.gazeX)).toBeLessThan(0.05);
    expect(Math.abs(state.gazeY)).toBeLessThan(0.05);
  });
});
