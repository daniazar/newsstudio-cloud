import { describe, it, expect } from "vitest";
import { injectFP32VAEDecoder } from "../fp32VaeLoader";

describe("fp32VaeLoader (Task AD-3)", () => {
  it("should inject VAELoader and terminal VAEDecode nodes into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: {} }
    };

    const success = injectFP32VAEDecoder(workflow, "8", "sdxl_vae.safetensors");

    expect(success).toBe(true);
    expect(workflow["fp32_vae_loader"]).toBeDefined();
    expect(workflow["terminal_vae_decode"]).toBeDefined();
    expect(workflow["terminal_vae_decode"].inputs.vae).toEqual(["fp32_vae_loader", 0]);
  });
});
