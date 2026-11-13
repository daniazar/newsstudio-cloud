import { describe, it, expect } from "vitest";
import { resolveFLUXFallbackModel } from "../ggufFallback";

describe("ggufFallback (Task XA-11)", () => {
  it("should auto-switch to GGUF Q4_K_M model when quality issues detected on fp8", () => {
    const res = resolveFLUXFallbackModel("flux1-dev-fp8.safetensors", true);

    expect(res.shouldSwitchToGGUF).toBe(true);
    expect(res.selectedModelName).toBe("flux1-dev-Q4_K_M.gguf");
    expect(res.loaderType).toBe("UnetLoaderGGUF");
  });

  it("should keep fp8 model when no quality issues are detected", () => {
    const res = resolveFLUXFallbackModel("flux1-dev-fp8.safetensors", false);

    expect(res.shouldSwitchToGGUF).toBe(false);
    expect(res.selectedModelName).toBe("flux1-dev-fp8.safetensors");
  });
});
