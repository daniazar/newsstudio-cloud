import { describe, it, expect } from 'vitest';
import { getCameraTransform } from '../../remotion/components/VirtualCameraRig';
import { calculateDirectorCuts } from '../lib/ai/dyadicStudioEngine';

describe('Sprint L-5: Virtual 3-Camera Rig & Dyadic Studio', () => {
  it('should return correct scale and translation per camera angle', () => {
    expect(getCameraTransform('wide')).toEqual({ scale: 1.0, translateY: 0 });
    expect(getCameraTransform('medium').scale).toBeGreaterThan(1.0);
    expect(getCameraTransform('closeup').scale).toBeGreaterThan(1.5);
  });

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
