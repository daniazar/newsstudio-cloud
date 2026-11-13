import { describe, it, expect } from "vitest";
import { injectFrequencyDomainTexture } from "../frequencyTextureInjector";

describe("frequencyTextureInjector (Task EX-9)", () => {
  it("should apply FFT band separation and composite high-frequency skin pores texture", () => {
    const res = injectFrequencyDomainTexture("/tmp/image.png", "skin_pores");

    expect(res.textureCategory).toBe("skin_pores");
    expect(res.fftHighPassCutoff).toBe(128);
    expect(res.outputImagePath).toContain("image_fft_texture.png");
  });
});
