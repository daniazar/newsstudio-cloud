import { describe, it, expect } from 'vitest';
import { calculateVocalMicroTilts } from '../lib/ai/microBehaviorEngine';
import { checkLoopQuality } from '../../scripts/check-loop-quality';

describe('Sprint L-4: Micro-Behaviors & Quality Gate', () => {
  it('should calculate vocal micro tilts within +-1.2 degrees', () => {
    const pitch = [120, 180, 110, 200];
    const tilts = calculateVocalMicroTilts(pitch, 1.2);
    expect(tilts.length).toBe(3);
    for (const t of tilts) {
      expect(Math.abs(t.rotationDegrees)).toBeLessThanOrEqual(1.2);
    }
  });

  it('should evaluate SSIM quality gate correctly', () => {
    const res = checkLoopQuality('non_existent.mp4');
    expect(res.passed).toBe(false);
  });
});
