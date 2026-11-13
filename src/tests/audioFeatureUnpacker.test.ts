/**
 * src/tests/audioFeatureUnpacker.test.ts
 *
 * Test suite for AudioFeatureUnpacker, FP16 conversions, silence masking, and feature loading.
 */

import { describe, it, expect } from "vitest";
import { AudioFeatureUnpacker } from "../lib/realtime/audioFeatureUnpacker";
import { AudioFeatureService, AudioFeatureMeta } from "../lib/realtime/audioFeatureService";
import fs from "fs";
import path from "path";

describe("MuseTalk Edge Audio Feature Suite", () => {
  describe("Float16 Bit-Level Decoding", () => {
    it("should accurately decode half-precision floats", () => {
      expect(AudioFeatureUnpacker.decodeFloat16(0x0000)).toBe(0.0);
      expect(AudioFeatureUnpacker.decodeFloat16(0x3c00)).toBeCloseTo(1.0, 5);
      expect(AudioFeatureUnpacker.decodeFloat16(0xbc00)).toBeCloseTo(-1.0, 5);
      expect(AudioFeatureUnpacker.decodeFloat16(0x4000)).toBeCloseTo(2.0, 5);
      expect(AudioFeatureUnpacker.decodeFloat16(0x3800)).toBeCloseTo(0.5, 5);
      expect(AudioFeatureUnpacker.decodeFloat16(0xb800)).toBeCloseTo(-0.5, 5);
    });
  });

  describe("In-Memory ArrayBuffer Unpacking & Silence Masking", () => {
    const mockMeta: AudioFeatureMeta = {
      id: "mock_speech",
      audioPath: "/path/to/mock.wav",
      numFrames: 4,
      fps: 25,
      durationSec: 0.16,
      featureDim: [50, 384],
      dtype: "float16",
      bytesPerFrame: 38400,
      totalBytes: 38400 * 4,
      silenceMask: [true, false, false, true], // Frames 0 and 3 are silent
      createdAt: new Date().toISOString(),
    };

    it("should mount binary buffer and extract 50x384 tensors with silence flags", () => {
      const elementsPerFrame = 50 * 384; // 19,200
      const totalElements = elementsPerFrame * 4;
      const buffer = new ArrayBuffer(totalElements * 2);
      const uint16View = new Uint16Array(buffer);

      // Frame 0: 0.0 (silent)
      // Frame 1: 1.0 (0x3C00)
      // Frame 2: 2.0 (0x4000)
      // Frame 3: 0.0 (silent)
      for (let i = 0; i < elementsPerFrame; i++) {
        uint16View[elementsPerFrame * 1 + i] = 0x3c00;
        uint16View[elementsPerFrame * 2 + i] = 0x4000;
      }

      const unpacker = new AudioFeatureUnpacker();
      unpacker.loadFromArrayBuffer(mockMeta, buffer);

      expect(unpacker.ready).toBe(true);
      expect(unpacker.frameCount).toBe(4);
      expect(unpacker.fps).toBe(25);
      expect(unpacker.durationSec).toBe(0.16);

      // Frame 0: Silent
      const res0 = unpacker.getFeatureForFrame(0);
      expect(res0.isSilent).toBe(true);

      // Frame 1: Speech (1.0)
      const res1 = unpacker.getFeatureForFrame(1);
      expect(res1.isSilent).toBe(false);
      expect(res1.feature.length).toBe(19200);
      expect(res1.feature[0]).toBeCloseTo(1.0, 4);

      // Frame 2: Speech (2.0)
      const res2 = unpacker.getFeatureForFrame(2);
      expect(res2.isSilent).toBe(false);
      expect(res2.feature[0]).toBeCloseTo(2.0, 4);

      // Frame 3: Silent
      const res3 = unpacker.getFeatureForFrame(3);
      expect(res3.isSilent).toBe(true);

      // Out of bounds (<0 or >=4): defaults to silence
      const resOutOfBounds = unpacker.getFeatureForFrame(10);
      expect(resOutOfBounds.isSilent).toBe(true);
    });

    it("should accurately resolve feature frame by playback timestamp", () => {
      const elementsPerFrame = 50 * 384;
      const buffer = new ArrayBuffer(elementsPerFrame * 4 * 2);
      const uint16View = new Uint16Array(buffer);
      for (let i = 0; i < elementsPerFrame; i++) {
        uint16View[elementsPerFrame * 2 + i] = 0x3c00; // Frame 2 = 1.0
      }

      const unpacker = new AudioFeatureUnpacker();
      unpacker.loadFromArrayBuffer(mockMeta, buffer);

      // At 25 fps, 0.08s -> frame 2
      const res = unpacker.getFeatureForTime(0.085);
      expect(res.frameIndex).toBe(2);
      expect(res.isSilent).toBe(false);
      expect(res.feature[0]).toBeCloseTo(1.0, 4);
    });
  });

  describe("Real Precomputed Feature Asset (cli_voice_ruby)", () => {
    it("should load extracted cli_voice_ruby features if present", async () => {
      const meta = await AudioFeatureService.getFeatureMeta("cli_voice_ruby");
      if (!meta) {
        console.warn("Skipping real file test: cli_voice_ruby.audio_features.json not generated yet");
        return;
      }

      expect(meta.numFrames).toBeGreaterThan(100);
      expect(meta.fps).toBe(25);
      expect(meta.featureDim).toEqual([50, 384]);
      expect(meta.silenceMask.length).toBe(meta.numFrames);

      const binPath = AudioFeatureService.getFeatureBinaryPath("cli_voice_ruby");
      expect(binPath).not.toBeNull();
      expect(fs.existsSync(binPath!)).toBe(true);

      const buffer = fs.readFileSync(binPath!);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      const unpacker = new AudioFeatureUnpacker();
      unpacker.loadFromArrayBuffer(meta, arrayBuffer);

      expect(unpacker.ready).toBe(true);
      expect(unpacker.frameCount).toBe(meta.numFrames);

      // Check a middle frame
      const midFrame = Math.floor(meta.numFrames / 2);
      const res = unpacker.getFeatureForFrame(midFrame);
      expect(res.feature.length).toBe(19200);
      // Values should not be NaN or Infinity
      expect(isNaN(res.feature[0])).toBe(false);
      expect(isFinite(res.feature[0])).toBe(true);
    });
  });
});
