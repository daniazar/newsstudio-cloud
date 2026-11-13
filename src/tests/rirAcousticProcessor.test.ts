import { describe, it, expect } from 'vitest';
import { calculateMatrix3D } from '../../remotion/components/HomographyScreenOverlay';
import { applyAcousticRIR } from '../lib/sfx/rirAcousticProcessor';

describe('Sprint L-6: Homography & Acoustic RIR Processor', () => {
  it('should return valid matrix3d transform string', () => {
    const matrix = calculateMatrix3D();
    expect(matrix).toContain('matrix3d');
  });

  it('should throw error when input WAV for RIR is missing', () => {
    expect(() => {
      applyAcousticRIR({
        inputWavPath: 'missing_audio_99.wav',
        outputWavPath: 'storage/cache/rir_out.wav',
      });
    }).toThrow(/Input WAV file missing/);
  });
});
