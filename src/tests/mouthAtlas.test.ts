/**
 * src/tests/mouthAtlas.test.ts
 *
 * Test suite for Neural Mouth Patch Atlas Generator & Viseme Mapping.
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_VISEMES,
  createSyntheticMouthAtlasBuffer,
} from "../../scripts/generate-mouth-atlas";
import { VISEME_TO_ATLAS_INDEX } from "../lib/realtime/liveAnchorStageEngine";

describe("Neural Mouth Patch Atlas Suite", () => {
  describe("Canonical Visemes & Index Mapping", () => {
    it("should define exactly 21 canonical visemes", () => {
      expect(CANONICAL_VISEMES.length).toBe(21);
      expect(CANONICAL_VISEMES[0].code).toBe("sil");
      expect(CANONICAL_VISEMES[1].code).toBe("PP");
      expect(CANONICAL_VISEMES[10].code).toBe("aa");
    });

    it("should map viseme codes to valid atlas indices [0..20]", () => {
      for (const [code, idx] of Object.entries(VISEME_TO_ATLAS_INDEX)) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(20);
      }
    });

    it("should map silence (sil) to index 0", () => {
      expect(VISEME_TO_ATLAS_INDEX["sil"]).toBe(0);
    });

    it("should map plosive (PP) to index 1 and open vowel (aa) to index 10", () => {
      expect(VISEME_TO_ATLAS_INDEX["PP"]).toBe(1);
      expect(VISEME_TO_ATLAS_INDEX["aa"]).toBe(10);
    });
  });

  describe("Atlas Image Generation & Format Integrity", () => {
    it("should generate a valid 32-bit RGBA PNG buffer with valid signature", () => {
      const pngBuffer = createSyntheticMouthAtlasBuffer("ruby");
      expect(pngBuffer).toBeInstanceOf(Buffer);
      expect(pngBuffer.length).toBeGreaterThan(1024);

      // Verify standard PNG magic bytes: 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'
      const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < signature.length; i++) {
        expect(pngBuffer[i]).toBe(signature[i]);
      }
    });

    it("should embed valid 512x512 IHDR dimensions into the PNG header", () => {
      const pngBuffer = createSyntheticMouthAtlasBuffer("ruby");
      // IHDR starts at byte 12 (after 8 bytes signature + 4 bytes length)
      // Width is at offset 16..19, Height is at offset 20..23
      const width = pngBuffer.readUInt32BE(16);
      const height = pngBuffer.readUInt32BE(20);

      expect(width).toBe(512);
      expect(height).toBe(512);
    });
  });
});
