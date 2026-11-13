import { describe, it, expect } from "vitest";
import { injectTAESDPreviewDecoder } from "../workflowMutator";

describe("injectTAESDPreviewDecoder (Task QA-6)", () => {
  it("should inject TAESDLoader and VAEDecode nodes connected to latent source node", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: {} }
    };

    const success = injectTAESDPreviewDecoder(workflow, "taesd_sdxl.safetensors", "8");

    expect(success).toBe(true);
    expect(workflow["taesd_loader"]).toBeDefined();
    expect(workflow["taesd_loader"].class_type).toBe("TAESDLoader");
    expect(workflow["taesd_loader"].inputs.taesd_name).toBe("taesd_sdxl.safetensors");

    expect(workflow["taesd_preview_vae_decode"]).toBeDefined();
    expect(workflow["taesd_preview_vae_decode"].class_type).toBe("VAEDecode");
    expect(workflow["taesd_preview_vae_decode"].inputs.samples).toEqual(["8", 0]);
    expect(workflow["taesd_preview_vae_decode"].inputs.vae).toEqual(["taesd_loader", 0]);
  });

  it("should return false if latent source node does not exist", () => {
    const workflow: Record<string, any> = {};
    const success = injectTAESDPreviewDecoder(workflow, "taesd_sdxl.safetensors", "99");
    expect(success).toBe(false);
  });
});
