import { describe, it, expect } from "vitest";
import { createPersonaMaskRegion } from "../personaMasker";

describe("PersonaMasker Unit Tests", () => {
  it("should calculate centered mask bounds for single persona", () => {
    const mask = createPersonaMaskRegion(1024, 1024, 0, 1);

    expect(mask.xMinNormalized).toBe(0.15);
    expect(mask.xMaxNormalized).toBe(0.85);
    expect(mask.pixelXMin).toBe(154); // round(0.15 * 1024)
    expect(mask.pixelWidth).toBe(717); // round(0.70 * 1024)
  });

  it("should calculate left mask zone for Persona A in dual persona scene", () => {
    const maskA = createPersonaMaskRegion(1024, 1024, 0, 2);

    expect(maskA.xMinNormalized).toBe(0.10);
    expect(maskA.xMaxNormalized).toBe(0.58);
    expect(maskA.pixelXMin).toBe(102);
  });

  it("should calculate right mask zone for Persona B in dual persona scene", () => {
    const maskB = createPersonaMaskRegion(1024, 1024, 1, 2);

    expect(maskB.xMinNormalized).toBe(0.42);
    expect(maskB.xMaxNormalized).toBe(0.90);
    expect(maskB.pixelXMin).toBe(430);
  });
});
