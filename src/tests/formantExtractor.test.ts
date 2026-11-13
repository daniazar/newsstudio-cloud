import { describe, it, expect } from "vitest";
import { FormantExtractor } from "../lib/realtime/formantExtractor";

describe("Real-Time LPC Formant Extractor (D1)", () => {
  it("should return baseline rest result on silence", () => {
    const extractor = new FormantExtractor(16000, 14, 256);
    const silence = new Float32Array(256);
    const result = extractor.extractFormants(silence);

    expect(result.isVoicedVowel).toBe(false);
    expect(result.jawOpenEstimate).toBe(0);
    expect(result.lipPuckerEstimate).toBe(0);
  });

  it("should correctly estimate open vowel /a/ with high F1 resonance (wide jaw)", () => {
    const extractor = new FormantExtractor(16000, 14, 256);
    const sampleRate = 16000;
    const pcm = new Float32Array(256);

    // Synthesize synthetic vowel with F1=750Hz and F2=1300Hz (typical open /a/)
    for (let i = 0; i < 256; i++) {
      const t = i / sampleRate;
      const glottal = Math.sin(2 * Math.PI * 130 * t); // F0 voice pitch ~130Hz
      const form1 = Math.sin(2 * Math.PI * 750 * t) * 0.7;
      const form2 = Math.sin(2 * Math.PI * 1300 * t) * 0.4;
      pcm[i] = glottal * (form1 + form2) * 0.5;
    }

    const result = extractor.extractFormants(pcm);
    expect(result.f1).toBeGreaterThan(500); // High F1 indicative of open jaw
    expect(result.jawOpenEstimate).toBeGreaterThan(0.20);
  });

  it("should estimate close rounded vowel /u/ with low F1 and low F2 (pucker)", () => {
    const extractor = new FormantExtractor(16000, 14, 256);
    const sampleRate = 16000;
    const pcm = new Float32Array(256);

    // Synthesize synthetic vowel with F1=320Hz and F2=900Hz (typical back rounded /u/)
    for (let i = 0; i < 256; i++) {
      const t = i / sampleRate;
      const glottal = Math.sin(2 * Math.PI * 120 * t);
      const form1 = Math.sin(2 * Math.PI * 320 * t) * 0.8;
      const form2 = Math.sin(2 * Math.PI * 900 * t) * 0.5;
      pcm[i] = glottal * (form1 + form2) * 0.5;
    }

    extractor.extractFormants(pcm);
    const result = extractor.extractFormants(pcm);
    expect(result.f1).toBeLessThan(600); // Low F1
    expect(result.f2).toBeLessThan(1400); // Low F2
    expect(result.lipPuckerEstimate).toBeGreaterThan(0.10);
  });
});
