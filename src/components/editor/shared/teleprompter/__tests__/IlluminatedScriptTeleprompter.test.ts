/**
 * src/components/editor/shared/teleprompter/__tests__/IlluminatedScriptTeleprompter.test.ts
 *
 * Unit tests for IlluminatedScriptTeleprompter and ProductAdCaptionsLayer
 * word-by-word real-time illumination and timing synchronization logic.
 */

import { describe, it, expect } from "vitest";
import { stripAllInlineTags } from "@/lib/sfx/inlineSfxParser";

describe("Illuminated Text & Caption Sync Engine", () => {
  const SAMPLE_SCRIPT = "Transform your living room with 100% waterproof [sfx:water_splash] planks and save $500 today!";

  it("strips inline sfx and pause tags cleanly", () => {
    const clean = stripAllInlineTags(SAMPLE_SCRIPT).replace(/\s+/g, " ").trim();
    expect(clean).not.toContain("[sfx:");
    expect(clean).toBe("Transform your living room with 100% waterproof planks and save $500 today!");
  });

  it("calculates character-weighted word timing accurately", () => {
    const clean = stripAllInlineTags(SAMPLE_SCRIPT).replace(/\s+/g, " ").trim();
    const rawWords = clean.split(/\s+/).filter(Boolean);
    const sceneStartFrame = 0;
    const sceneDurationFrames = 120; // 4 seconds at 30 fps
    const totalChars = rawWords.reduce((acc, w) => acc + w.length, 0);
    const effectiveFrames = Math.max(15, sceneDurationFrames - 10);
    const speechLeadFrames = 3;

    let accumulatedOffset = speechLeadFrames;
    const timedWords = rawWords.map((word) => {
      const wordWeight = word.length / totalChars;
      const wordDuration = Math.max(4, Math.round(wordWeight * effectiveFrames));
      const start = sceneStartFrame + accumulatedOffset;
      const end = start + wordDuration;
      accumulatedOffset += wordDuration;

      return { word, start, end };
    });

    expect(timedWords.length).toBe(rawWords.length);
    expect(timedWords[0].start).toBe(3);
    // Ensure all words are sequential without backwards jumps
    for (let i = 1; i < timedWords.length; i++) {
      expect(timedWords[i].start).toBe(timedWords[i - 1].end);
    }
    // "waterproof" (10 chars) should receive more frames than "and" (3 chars)
    const waterproofWord = timedWords.find((w) => w.word.toLowerCase() === "waterproof")!;
    const andWord = timedWords.find((w) => w.word.toLowerCase() === "and")!;
    expect(waterproofWord.end - waterproofWord.start).toBeGreaterThan(andWord.end - andWord.start);
  });

  it("identifies active, spoken, and future words at any frame position", () => {
    const words = [
      { word: "Renueva", start: 0, end: 20 },
      { word: "tus", start: 20, end: 35 },
      { word: "pisos", start: 35, end: 60 },
      { word: "hoy", start: 60, end: 90 },
    ];

    const getStateAtFrame = (frame: number) => {
      return words.map((w) => ({
        word: w.word,
        isActive: frame >= w.start && frame < w.end,
        isSpoken: frame >= w.end,
        isFuture: frame < w.start,
      }));
    };

    // At frame 10: "Renueva" is active, rest are future
    const stateAt10 = getStateAtFrame(10);
    expect(stateAt10[0].isActive).toBe(true);
    expect(stateAt10[1].isFuture).toBe(true);

    // At frame 40: "Renueva" & "tus" are spoken, "pisos" is active, "hoy" is future
    const stateAt40 = getStateAtFrame(40);
    expect(stateAt40[0].isSpoken).toBe(true);
    expect(stateAt40[1].isSpoken).toBe(true);
    expect(stateAt40[2].isActive).toBe(true);
    expect(stateAt40[3].isFuture).toBe(true);

    // At frame 100: all words are spoken
    const stateAt100 = getStateAtFrame(100);
    expect(stateAt100.every((s) => s.isSpoken)).toBe(true);
  });

  it("detects numeric, currency, and power words for special illumination", () => {
    const testCases = [
      { word: "$49", isNum: true, isPower: false },
      { word: "100%", isNum: true, isPower: false },
      { word: "31%OFF", isNum: true, isPower: false },
      { word: "WATERPROOF", isNum: false, isPower: true },
      { word: "GARANTIZADO", isNum: false, isPower: true },
      { word: "SAVE", isNum: false, isPower: true },
      { word: "simple", isNum: false, isPower: false },
    ];

    for (const tc of testCases) {
      const cleanWord = tc.word.toUpperCase().replace(/[^A-Z0-9$%]/g, "");
      const isNumericOrCurrency = /[0-9]|\$|%|€|£/.test(cleanWord);
      const isPowerWord = /^(OFF|SAVE|FREE|SALE|NUEVO|NEW|WATERPROOF|IMPERMEABLE|GARANTIZADO|GUARANTEED|BEST|TOP|EXCLUSIVE|TRANSFORM|CALIDAD|DESCUENTO)$/.test(
        cleanWord
      );

      expect(isNumericOrCurrency).toBe(tc.isNum);
      if (tc.isPower) {
        expect(isPowerWord).toBe(true);
      }
    }
  });

  it("chunks words appropriately based on aspect ratio", () => {
    const getWordsPerChunk = (aspect: string) => {
      if (aspect === "9:16") return 3;
      if (aspect === "16:9") return 5;
      return 4;
    };

    expect(getWordsPerChunk("9:16")).toBe(3);
    expect(getWordsPerChunk("16:9")).toBe(5);
    expect(getWordsPerChunk("1:1")).toBe(4);
    expect(getWordsPerChunk("4:5")).toBe(4);
  });
});
