import { describe, it, expect } from 'vitest';
import { calculateChromaDistance } from '../../remotion/layers/ChromaKeyPresenterLayer';

describe('Sprint L-2: Chroma-Key Presenter Layer', () => {
  it('should calculate zero distance for pure green screen pixel', () => {
    const dist = calculateChromaDistance(0, 255, 0, 255);
    expect(dist).toBe(0);
  });

  it('should calculate non-zero distance for non-green skin tones', () => {
    const skinDist = calculateChromaDistance(215, 160, 140, 255);
    expect(skinDist).toBeGreaterThan(150);
  });
});
