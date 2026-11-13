import { describe, it, expect } from "vitest";
import { injectLayerDiffuseNodes } from "../layerDiffuseCompositor";

describe("layerDiffuseCompositor (Task OB-1)", () => {
  it("should inject LayerDiffuse nodes when contact intensity score < 15", () => {
    const workflow: Record<string, any> = {};

    const success = injectLayerDiffuseNodes(workflow, { contactIntensityScore: 10, weight: 1.0 });

    expect(success).toBe(true);
    expect(workflow["layer_diffuse_loader"]).toBeDefined();
    expect(workflow["apply_layer_diffuse"]).toBeDefined();
  });

  it("should block LayerDiffuse injection when contact intensity score >= 15", () => {
    const workflow: Record<string, any> = {};

    const success = injectLayerDiffuseNodes(workflow, { contactIntensityScore: 35, weight: 1.0 });

    expect(success).toBe(false);
    expect(workflow["layer_diffuse_loader"]).toBeUndefined();
  });
});
