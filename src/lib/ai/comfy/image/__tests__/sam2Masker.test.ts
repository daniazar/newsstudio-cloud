import { describe, it, expect } from "vitest";
import { injectSAM2InstanceMasking } from "../sam2Masker";

describe("sam2Masker (Task EX-6)", () => {
  it("should inject SAM2ModelLoader and SAM2Segmentation nodes into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "VAEDecode", inputs: {} }
    };

    const success = injectSAM2InstanceMasking(workflow, "8", "body_silhouette");

    expect(success).toBe(true);
    expect(workflow["sam2_model_loader"]).toBeDefined();
    expect(workflow["sam2_segmentation"]).toBeDefined();
    expect(workflow["sam2_segmentation"].inputs.segment_target).toBe("body_silhouette");
    expect(workflow["sam2_segmentation"].inputs.image).toEqual(["8", 0]);
  });
});
