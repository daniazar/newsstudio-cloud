/**
 * src/tests/latentStreamUnpacker.test.ts
 *
 * Test suite for LatentStreamUnpacker, Float16 decoding, and MuseTalk Asset Service.
 */

import { describe, it, expect } from "vitest";
import { LatentStreamUnpacker, decodeFloat16 } from "../lib/realtime/latentStreamUnpacker";
import { MuseTalkAssetService, MuseTalkAvatarMeta } from "../lib/realtime/musetalkAssetService";
import fs from "fs";
import path from "path";

describe("MuseTalk Edge Latent Stream Suite", () => {
  describe("Float16 Bit-Level Decoder", () => {
    it("should decode standard IEEE 754 half-precision values correctly", () => {
      // 0.0 -> 0x0000
      expect(decodeFloat16(0x0000)).toBe(0.0);
      // 1.0 -> 0x3C00
      expect(decodeFloat16(0x3c00)).toBeCloseTo(1.0, 5);
      // -1.0 -> 0xBC00
      expect(decodeFloat16(0xbc00)).toBeCloseTo(-1.0, 5);
      // 2.0 -> 0x4000
      expect(decodeFloat16(0x4000)).toBeCloseTo(2.0, 5);
      // 0.5 -> 0x3800
      expect(decodeFloat16(0x3800)).toBeCloseTo(0.5, 5);
      // -0.5 -> 0xB800
      expect(decodeFloat16(0xb800)).toBeCloseTo(-0.5, 5);
    });
  });

  describe("LatentStreamUnpacker Memory & Frame Indexing", () => {
    const mockMeta: MuseTalkAvatarMeta = {
      avatarId: "test_avatar",
      frameCount: 4,
      fps: 25,
      channels: 8,
      latentHeight: 32,
      latentWidth: 32,
      dtype: "float16",
      bytesPerFrame: 16384,
      totalBytes: 16384 * 4,
      binFile: "test_avatar.latents.bin",
      coords: [
        [100, 150, 200, 250],
        [102, 152, 202, 252],
        [104, 154, 204, 254],
        [106, 156, 206, 256],
      ],
      geometry: [
        [80, 130, 220, 270, 20, 20, 100, 100],
        [82, 132, 222, 272, 20, 20, 100, 100],
        [84, 134, 224, 274, 20, 20, 100, 100],
        [86, 136, 226, 276, 20, 20, 100, 100],
      ],
    };

    it("should mount an ArrayBuffer and extract accurate frame slices", () => {
      const elementsPerFrame = 8 * 32 * 32; // 8192
      const totalElements = elementsPerFrame * 4;
      const buffer = new ArrayBuffer(totalElements * 2); // 2 bytes per float16
      const uint16View = new Uint16Array(buffer);

      // Populate Frame 0 with 1.0 (0x3C00) and Frame 1 with -1.0 (0xBC00)
      for (let i = 0; i < elementsPerFrame; i++) {
        uint16View[i] = 0x3c00;
        uint16View[elementsPerFrame + i] = 0xbc00;
      }

      const unpacker = new LatentStreamUnpacker();
      unpacker.mountBuffer(mockMeta, buffer);

      expect(unpacker.ready).toBe(true);
      expect(unpacker.frameCount).toBe(4);
      expect(unpacker.fps).toBe(25);

      // Frame 0 Check
      const frame0 = unpacker.getFrameByIndex(0);
      expect(frame0).not.toBeNull();
      expect(frame0?.frameIndex).toBe(0);
      expect(frame0?.latentFP32.length).toBe(8192);
      expect(frame0?.latentFP32[0]).toBeCloseTo(1.0, 4);
      expect(frame0?.coords).toEqual([100, 150, 200, 250]);
      expect(frame0?.geometry).toEqual([80, 130, 220, 270, 20, 20, 100, 100]);

      // Frame 1 Check
      const frame1 = unpacker.getFrameByIndex(1);
      expect(frame1?.frameIndex).toBe(1);
      expect(frame1?.latentFP32[0]).toBeCloseTo(-1.0, 4);

      // Cyclic Looping Check (index 4 wraps to 0)
      const frame4 = unpacker.getFrameByIndex(4);
      expect(frame4?.frameIndex).toBe(0);
    });

    it("should accurately resolve frames based on video playback time", () => {
      const elementsPerFrame = 8 * 32 * 32;
      const buffer = new ArrayBuffer(elementsPerFrame * 4 * 2);
      const unpacker = new LatentStreamUnpacker();
      unpacker.mountBuffer(mockMeta, buffer);

      // at 25 fps:
      // t = 0.00s -> frame 0
      // t = 0.04s -> frame 1
      // t = 0.08s -> frame 2
      // t = 0.12s -> frame 3
      // t = 0.16s -> frame 0 (cyclic loop)
      expect(unpacker.getFrameAtTime(0.0)?.frameIndex).toBe(0);
      expect(unpacker.getFrameAtTime(0.041)?.frameIndex).toBe(1);
      expect(unpacker.getFrameAtTime(0.081)?.frameIndex).toBe(2);
      expect(unpacker.getFrameAtTime(0.121)?.frameIndex).toBe(3);
      expect(unpacker.getFrameAtTime(0.161)?.frameIndex).toBe(0);
    });
  });

  describe("Real Precomputed Avatar Asset Verification", () => {
    it("should verify exported ruby_standing_bg packet integrity if present", async () => {
      const binPath = MuseTalkAssetService.getLatentsBinPath("ruby_standing_bg");
      if (binPath && fs.existsSync(binPath)) {
        const meta = await MuseTalkAssetService.getAvatarMeta("ruby_standing_bg");
        expect(meta).not.toBeNull();
        expect(meta?.avatarId).toBe("ruby_standing_bg");
        expect(meta?.frameCount).toBeGreaterThan(100);
        expect(meta?.channels).toBe(8);
        expect(meta?.latentWidth).toBe(32);
        expect(meta?.latentHeight).toBe(32);
        expect(meta?.bytesPerFrame).toBe(16384);

        // Verify single frame bytes slice read
        const frame0Bytes = await MuseTalkAssetService.getFrameLatentBytes("ruby_standing_bg", 0);
        expect(frame0Bytes).not.toBeNull();
        expect(frame0Bytes?.length).toBe(16384);
      }
    });
  });
});
