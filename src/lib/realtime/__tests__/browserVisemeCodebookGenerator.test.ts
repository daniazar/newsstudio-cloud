import { describe, it, expect } from "vitest";
import {
  buildSoftCosineMask,
  BrowserVisemeCodebookGenerator,
} from "../browserVisemeCodebookGenerator";

describe("BrowserVisemeCodebookGenerator", () => {
  it("builds canonical soft cosine mask with correct boundaries", () => {
    const mask = buildSoftCosineMask(256, 256);
    expect(mask.length).toBe(256 * 256);

    // Mouth stomion center (128, 110) should be fully opaque (1.0)
    const centerIdx = 110 * 256 + 128;
    expect(mask[centerIdx]).toBeCloseTo(1.0, 1);

    // Corners should be completely transparent (0.0)
    expect(mask[0]).toBe(0.0);
    expect(mask[255]).toBe(0.0);
    expect(mask[255 * 256]).toBe(0.0);
    expect(mask[255 * 256 + 255]).toBe(0.0);

    // All mask values must be bounded in [0.0, 1.0]
    for (let i = 0; i < mask.length; i += 64) {
      expect(mask[i]).toBeGreaterThanOrEqual(0.0);
      expect(mask[i]).toBeLessThanOrEqual(1.0);
    }
  });

  it("caches the soft cosine mask in singleton memory", () => {
    const mask1 = BrowserVisemeCodebookGenerator.getSoftMask();
    const mask2 = BrowserVisemeCodebookGenerator.getSoftMask();
    expect(mask1).toBe(mask2);
    expect(mask1.length).toBe(65536);
  });
});
