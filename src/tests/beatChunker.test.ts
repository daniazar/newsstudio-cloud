/**
 * src/tests/beatChunker.test.ts
 *
 * Test suite for 4.0s Audio Chunker, Cosine Anti-Click Fade, and Cadence Optimizer.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  sliceAudioIntoBeats,
  getAudioDuration,
  createSyntheticWav,
  buildWavHeader,
  parseWavHeader,
  applyCosineFade16Bit,
} from "../lib/audio/beatChunker";
import {
  optimizeScriptCadence,
  optimizeScriptPacingForBeats,
} from "../lib/audio/cadenceOptimizer";

describe("Audio Beat Chunker & Cadence Optimizer Suite", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beat_chunker_test_"));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. WAV Header & Synthesis Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("WAV Header & PCM Parsing", () => {
    it("should build and parse a standard 44-byte RIFF PCM header", () => {
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const dataLength = sampleRate * 2 * 4; // 4.0 seconds of 16-bit mono = 192,000 bytes

      const header = buildWavHeader(dataLength, sampleRate, numChannels, bitsPerSample);
      expect(header.length).toBe(44);

      const fakeFile = Buffer.concat([header, Buffer.alloc(dataLength)]);
      const parsed = parseWavHeader(fakeFile);

      expect(parsed).not.toBeNull();
      expect(parsed?.sampleRate).toBe(24000);
      expect(parsed?.numChannels).toBe(1);
      expect(parsed?.bitsPerSample).toBe(16);
      expect(parsed?.durationSec).toBe(4.0);
      expect(parsed?.dataSize).toBe(dataLength);
    });

    it("should create synthetic WAV audio with exact requested duration", () => {
      const durationSec = 3.5;
      const sampleRate = 24000;
      const wavBuffer = createSyntheticWav(durationSec, sampleRate, 440);

      const parsed = parseWavHeader(wavBuffer);
      expect(parsed).not.toBeNull();
      expect(parsed?.sampleRate).toBe(24000);
      expect(parsed?.durationSec).toBeCloseTo(3.5, 2);
    });

    it("should accurately read audio duration with getAudioDuration", async () => {
      const testWavPath = path.join(tempDir, "test_tone_6s.wav");
      const wavBuf = createSyntheticWav(6.0, 24000);
      fs.writeFileSync(testWavPath, wavBuf);

      const dur = await getAudioDuration(testWavPath);
      expect(dur).toBeCloseTo(6.0, 1);
    });

    it("should throw error for non-existent audio file in getAudioDuration", async () => {
      const nonExistentPath = path.join(tempDir, "does_not_exist.wav");
      await expect(getAudioDuration(nonExistentPath)).rejects.toThrow(/Audio file not found/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Anti-Click Cosine Fade Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Anti-Click Cosine Fade Integrity", () => {
    it("should smoothly ramp samples to prevent DC offset clicks", () => {
      const sampleRate = 24000;
      const durationSec = 1.0;
      const numSamples = sampleRate * durationSec;
      const pcmBuffer = Buffer.alloc(numSamples * 2);

      // Fill with constant high amplitude DC offset: 20000
      for (let i = 0; i < numSamples; i++) {
        pcmBuffer.writeInt16LE(20000, i * 2);
      }

      const fadeMs = 10;
      const fadeSamples = Math.round((fadeMs / 1000) * sampleRate); // 240 samples

      applyCosineFade16Bit(pcmBuffer, sampleRate, 1, fadeMs);

      // First sample (s=0) should be zero: gain = sin(0) = 0
      const firstSample = pcmBuffer.readInt16LE(0);
      expect(firstSample).toBe(0);

      // Mid-fade sample (s=fadeSamples/2) should be attenuated ~0.707 * 20000 = ~14142
      const midFadeSample = pcmBuffer.readInt16LE(Math.floor(fadeSamples / 2) * 2);
      expect(midFadeSample).toBeGreaterThan(12000);
      expect(midFadeSample).toBeLessThan(16000);

      // Unfaded sample in the middle should remain 20000
      const centerSample = pcmBuffer.readInt16LE(Math.floor(numSamples / 2) * 2);
      expect(centerSample).toBe(20000);

      // Last sample should be zero: gain = cos(pi/2) = 0
      const lastSample = pcmBuffer.readInt16LE((numSamples - 1) * 2);
      expect(lastSample).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Audio Slicing & 4.0s Pad Normalization Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("sliceAudioIntoBeats", () => {
    it("should slice a 14.2s audio file into 4 exact 4.0s beat chunks (16.0s total)", async () => {
      const masterAudioPath = path.join(tempDir, "master_speech_14_2s.wav");
      const wavBuf = createSyntheticWav(14.2, 24000);
      fs.writeFileSync(masterAudioPath, wavBuf);

      const result = await sliceAudioIntoBeats(masterAudioPath, {
        beatDurationSec: 4.0,
        outputDir: path.join(tempDir, "beats_output"),
        applyAntiClickFade: true,
      });

      expect(result.totalBeats).toBe(4);
      expect(result.originalDurationSec).toBeCloseTo(14.2, 1);
      expect(result.paddedDurationSec).toBe(16.0);
      expect(result.chunks).toHaveLength(4);

      // Verify each chunk
      for (let i = 0; i < 4; i++) {
        const chunk = result.chunks[i];
        expect(chunk.chunkIndex).toBe(i);
        expect(chunk.durationSec).toBe(4.0);
        expect(chunk.startTimeSec).toBe(i * 4.0);
        expect(chunk.endTimeSec).toBe((i + 1) * 4.0);
        expect(fs.existsSync(chunk.chunkPath)).toBe(true);

        // Check chunk WAV header and byte size
        const chunkData = fs.readFileSync(chunk.chunkPath);
        const parsed = parseWavHeader(chunkData);
        expect(parsed).not.toBeNull();
        expect(parsed?.durationSec).toBe(4.0);
      }

      // First 3 chunks should not be padded; last chunk is padded
      expect(result.chunks[0].isPadded).toBe(false);
      expect(result.chunks[1].isPadded).toBe(false);
      expect(result.chunks[2].isPadded).toBe(false);
      expect(result.chunks[3].isPadded).toBe(true);
      expect(result.chunks[3].speechEndsAtSec).toBeCloseTo(14.2, 1);
    });

    it("should handle audio shorter than 4.0s (e.g. 2.1s) by padding to 1 exact 4.0s beat", async () => {
      const shortAudioPath = path.join(tempDir, "short_audio_2_1s.wav");
      const wavBuf = createSyntheticWav(2.1, 24000);
      fs.writeFileSync(shortAudioPath, wavBuf);

      const result = await sliceAudioIntoBeats(shortAudioPath, {
        beatDurationSec: 4.0,
        outputDir: path.join(tempDir, "beats_short"),
      });

      expect(result.totalBeats).toBe(1);
      expect(result.originalDurationSec).toBeCloseTo(2.1, 1);
      expect(result.paddedDurationSec).toBe(4.0);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].isPadded).toBe(true);
      expect(result.chunks[0].durationSec).toBe(4.0);

      const chunkData = fs.readFileSync(result.chunks[0].chunkPath);
      const parsed = parseWavHeader(chunkData);
      expect(parsed?.durationSec).toBe(4.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Cadence & Breathing Pause Optimizer Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Cadence Optimizer", () => {
    it("should extract FSM script cues with accurate approximate timestamps", () => {
      const script = "Good evening. [BREAKING] Today markets surged to record highs. [DATA] Tech stocks led the rally. [CONCLUSION] Back to you.";
      const analysis = optimizeScriptCadence(script, { wordsPerMinute: 150 });

      expect(analysis.detectedCues).toHaveLength(3);
      expect(analysis.detectedCues[0].tag).toBe("BREAKING");
      expect(analysis.detectedCues[1].tag).toBe("DATA");
      expect(analysis.detectedCues[2].tag).toBe("CONCLUSION");
      expect(analysis.recommendedBeats).toBeGreaterThan(0);
      expect(analysis.optimizedText).toContain("...");
    });

    it("should inject breathing pauses and calculate beat alignment pacing score", () => {
      const script = "First sentence. Second sentence, with a pause. Third sentence.";
      const result = optimizeScriptPacingForBeats(script, 12.0);

      expect(result.breathingPausesInjected).toBeGreaterThan(0);
      expect(result.pacingScore).toBeGreaterThanOrEqual(0.0);
      expect(result.pacingScore).toBeLessThanOrEqual(1.0);
      expect(result.recommendedBeats).toBeGreaterThanOrEqual(1);
    });
  });
});
