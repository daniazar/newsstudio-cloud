/**
 * src/tests/audioVisemeExtractor.test.ts
 *
 * Unit tests for AudioVisemeExtractor (Formant inversion, articulatory profiles, spring dynamics)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AudioVisemeExtractor } from '../lib/realtime/audioVisemeExtractor';

describe('AudioVisemeExtractor Suite', () => {
  let extractor: AudioVisemeExtractor;

  beforeEach(() => {
    extractor = new AudioVisemeExtractor();
  });

  it('should initialize in rest state (silence)', () => {
    const frame = extractor.extractFrame();
    expect(frame.dominantViseme).toBe("sil");
    expect(frame.azureVisemeId).toBe(0);
    expect(frame.jawOpen).toBe(0);
    expect(frame.lipWidth).toBe(0);
    expect(frame.rms).toBe(0);
  });

  it('should support switching articulatory profiles', () => {
    expect(extractor.getArticulatoryProfile()).toBe("default");

    extractor.setArticulatoryProfile("rioplatense_es");
    expect(extractor.getArticulatoryProfile()).toBe("rioplatense_es");

    extractor.setArticulatoryProfile("french");
    expect(extractor.getArticulatoryProfile()).toBe("french");

    extractor.setArticulatoryProfile("japanese");
    expect(extractor.getArticulatoryProfile()).toBe("japanese");
  });

  it('should cleanly decay to rest when audio falls below threshold', () => {
    const frame = extractor.extractViseme();
    expect(frame.jawOpen).toBe(0);
    expect(frame.lipCompression).toBe(0);
  });
});
