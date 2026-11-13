import { describe, it, expect } from "vitest";
import { injectIPAdapterStyleOnlyNode } from "../ipAdapterStyle";

describe("ipAdapterStyle (Task AD-4)", () => {
  it("should inject IPAdapterModelLoader and IPAdapterApply nodes with weight_type: style only", () => {
    const workflow: Record<string, any> = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: {} },
      "8": { class_type: "KSampler", inputs: { model: ["1", 0] } }
    };

    const success = injectIPAdapterStyleOnlyNode(workflow, "editorial.jpg", 0.40, "1");

    expect(success).toBe(true);
    expect(workflow["ip_adapter_style_loader"]).toBeDefined();
    expect(workflow["ip_adapter_style_apply"]).toBeDefined();
    expect(workflow["ip_adapter_style_apply"].inputs.weight_type).toBe("style only");
    expect(workflow["ip_adapter_style_apply"].inputs.weight).toBe(0.40);
    expect(workflow["8"].inputs.model).toEqual(["ip_adapter_style_apply", 0]);
  });
});
