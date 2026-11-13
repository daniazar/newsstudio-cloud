import { describe, it, expect } from "vitest";
import { injectModelMergeNode } from "../modelBlender";

describe("modelBlender (Task EX-9)", () => {
  it("should inject CheckpointLoader nodes and ModelMergeSimple into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: { model: ["1", 0] } }
    };

    const success = injectModelMergeNode(workflow, "modelA.safetensors", "modelB.safetensors", 0.65);

    expect(success).toBe(true);
    expect(workflow["checkpoint_loader_a"]).toBeDefined();
    expect(workflow["checkpoint_loader_b"]).toBeDefined();
    expect(workflow["runtime_model_merge"]).toBeDefined();
    expect(workflow["runtime_model_merge"].inputs.ratio).toBe(0.65);
    expect(workflow["8"].inputs.model).toEqual(["runtime_model_merge", 0]);
  });
});
