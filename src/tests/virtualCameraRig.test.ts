import { describe, it, expect } from 'vitest';
import { calculateDirectorCuts } from '../lib/ai/dyadicStudioEngine';

describe('Sprint L-5: Dyadic Studio Director Cuts', () => {
  it('should calculate smart director cuts accurately', () => {
    const timeline = [
      { frame: 0, speakerId: 'anchor_a' as const },
      { frame: 60, speakerId: 'anchor_b' as const },
    ];
    const cuts = calculateDirectorCuts(timeline);
    expect(cuts.length).toBe(2);
    expect(cuts[0].cameraAngle).toBe('wide');
    expect(cuts[1].cameraAngle).toBe('wide');
  });
});
