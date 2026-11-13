import { describe, it, expect } from "vitest";
import { detectFLUXQuantization } from "../fluxQuantDetector";

describe("fluxQuantDetector (Task XA-6)", () => {
  it("should detect fp8_e4m3fn quantization for flux1-dev-fp8.safetensors", () => {
    const spec = detectFLUXQuantization("flux1-dev-fp8.safetensors");

    expect(spec.isQuantized).toBe(true);
    expect(spec.quantType).toBe("fp8_e4m3fn");
    expect(spec.recommendedLoader).toBe("UNETLoader");
    expect(spec.vramUsageGb).toBe(12.0);
  });

  it("should detect GGUF quantization for flux1-dev-Q4_K_M.gguf", () => {
    const spec = detectFLUXQuantization("flux1-dev-Q4_K_M.gguf");

    expect(spec.quantType).toBe("gguf_q4_k_m");
    expect(spec.recommendedLoader).toBe("UnetLoaderGGUF");
    expect(spec.vramUsageGb).toBe(8.5);
  });
});
