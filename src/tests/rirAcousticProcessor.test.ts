import { describe, it, expect } from 'vitest';
import { applyAcousticRIR } from '../lib/sfx/rirAcousticProcessor';

describe('Sprint L-6: Acoustic RIR Processor', () => {
  it('should throw error when input WAV for RIR is missing', () => {
    expect(() => {
      applyAcousticRIR({
        inputWavPath: 'missing_audio_99.wav',
        outputWavPath: 'storage/cache/rir_out.wav',
      });
    }).toThrow(/Input WAV file missing/);
  });
});
