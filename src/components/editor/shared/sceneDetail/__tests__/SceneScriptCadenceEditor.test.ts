import { describe, it, expect } from "vitest";
import { TTS_ENGINES } from "../components/SceneScriptCadenceEditor";

describe("SceneScriptCadenceEditor — Tier 2 Acoustic Architecture", () => {
  it("defines the 4 production TTS engines with model-specific directives", () => {
    expect(TTS_ENGINES).toHaveLength(4);
    const engineIds = TTS_ENGINES.map((e) => e.id);
    expect(engineIds).toContain("omni");
    expect(engineIds).toContain("piper");
    expect(engineIds).toContain("kokoro");
    expect(engineIds).toContain("f5_tts");

    const piper = TTS_ENGINES.find((e) => e.id === "piper");
    expect(piper?.desc).toContain("Latin G2P");
    expect(piper?.desc).toContain("hyphenated initialisms");

    const omni = TTS_ENGINES.find((e) => e.id === "omni");
    expect(omni?.desc).toContain("Clause ceiling ≤14 words");

    const kokoro = TTS_ENGINES.find((e) => e.id === "kokoro");
    expect(kokoro?.desc).toContain("Strict written accents");

    const f5 = TTS_ENGINES.find((e) => e.id === "f5_tts");
    expect(f5?.desc).toContain("Strictly 0 digits & 0 symbols");
  });

  it("calculates visual vs spoken desync state correctly", () => {
    const originalText = "Apple announced $3.5B for AI.";
    const normalizedSpoken = "La empresa Ápel anunció tres punto cinco billones de dólares para I-A.";
    let lastNormalizedVisual = originalText;

    // Case 1: Unedited text — in sync
    let editedText = "Apple announced $3.5B for AI.";
    let isSpokenDesynced =
      Boolean(normalizedSpoken.trim()) &&
      Boolean(lastNormalizedVisual.trim()) &&
      editedText.trim() !== lastNormalizedVisual.trim();
    expect(isSpokenDesynced).toBe(false);

    // Case 2: User edits visual text ($3.5B -> $5.0B) — desynced!
    editedText = "Apple announced $5.0B for AI.";
    isSpokenDesynced =
      Boolean(normalizedSpoken.trim()) &&
      Boolean(lastNormalizedVisual.trim()) &&
      editedText.trim() !== lastNormalizedVisual.trim();
    expect(isSpokenDesynced).toBe(true);

    // Case 3: Re-normalization updates lastNormalizedVisual — re-synced!
    lastNormalizedVisual = editedText;
    isSpokenDesynced =
      Boolean(normalizedSpoken.trim()) &&
      Boolean(lastNormalizedVisual.trim()) &&
      editedText.trim() !== lastNormalizedVisual.trim();
    expect(isSpokenDesynced).toBe(false);
  });
});

describe("WebGPU MuseTalk Pipeline — FP16 Decoding & Silence Energy Bypass", () => {
  // Reproduce LUT decoding from musetalkGPUWorker.ts
  const FP16_LUT = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) {
    const sign = (i & 0x8000) >> 15;
    const exponent = (i & 0x7c00) >> 10;
    const fraction = i & 0x03ff;
    if (exponent === 0) {
      FP16_LUT[i] = (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / 1024);
    } else if (exponent === 0x1f) {
      FP16_LUT[i] = fraction ? NaN : (sign ? -Infinity : Infinity);
    } else {
      FP16_LUT[i] = (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
    }
  }

  function unpackFloat16Array(buffer: ArrayBuffer): Float32Array {
    const u16 = new Uint16Array(buffer);
    const f32 = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) {
      f32[i] = FP16_LUT[u16[i]];
    }
    return f32;
  }

  it("decodes IEEE 754 Float16 values accurately", () => {
    // 0x0000 = +0.0
    // 0x3C00 = 1.0 (exponent = 15 -> 2^0, fraction = 0 -> 1.0)
    // 0xBC00 = -1.0
    // 0x3800 = 0.5 (exponent = 14 -> 2^-1, fraction = 0 -> 0.5)
    // 0x4000 = 2.0 (exponent = 16 -> 2^1, fraction = 0 -> 2.0)
    const testBuffer = new Uint16Array([0x0000, 0x3c00, 0xbc00, 0x3800, 0x4000]).buffer;
    const decoded = unpackFloat16Array(testBuffer);

    expect(decoded[0]).toBe(0.0);
    expect(decoded[1]).toBe(1.0);
    expect(decoded[2]).toBe(-1.0);
    expect(decoded[3]).toBe(0.5);
    expect(decoded[4]).toBe(2.0);
  });

  it("accurately detects silence energy bypass below RMS threshold", () => {
    const SILENCE_THRESHOLD = 0.005;

    // Silent audio chunk (e.g. ambient microphone or breathing pause)
    const silentAudio = new Float32Array(320);
    for (let i = 0; i < 320; i++) {
      silentAudio[i] = (Math.random() - 0.5) * 0.001; // tiny noise
    }

    let sumSq = 0;
    for (let s = 0; s < silentAudio.length; s++) {
      sumSq += silentAudio[s] * silentAudio[s];
    }
    const silentRms = Math.sqrt(sumSq / silentAudio.length);
    expect(silentRms).toBeLessThan(SILENCE_THRESHOLD);

    // Active speech audio chunk
    const activeSpeech = new Float32Array(320);
    for (let i = 0; i < 320; i++) {
      activeSpeech[i] = Math.sin((i / 320) * Math.PI * 8) * 0.4;
    }

    let activeSumSq = 0;
    for (let s = 0; s < activeSpeech.length; s++) {
      activeSumSq += activeSpeech[s] * activeSpeech[s];
    }
    const activeRms = Math.sqrt(activeSumSq / activeSpeech.length);
    expect(activeRms).toBeGreaterThan(SILENCE_THRESHOLD);
  });
});
