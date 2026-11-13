import { describe, it, expect } from "vitest";
import { getStagePAGConfig, injectPAGGuidanceNode } from "../pagGuidance";

describe("pagGuidance (Task EX-1)", () => {
  it("should enable PAG for Stages 3, 3.5, 5, and 6", () => {
    expect(getStagePAGConfig(3).enablePAG).toBe(true);
    expect(getStagePAGConfig(3.5).scale).toBe(3.5);
    expect(getStagePAGConfig(5).scale).toBe(2.5);
    expect(getStagePAGConfig(6).scale).toBe(3.0);
    expect(getStagePAGConfig(1).enablePAG).toBe(false);
  });

  it("should inject PerturbedAttentionGuidance node into workflow graph for Stage 3", () => {
    const workflow: Record<string, any> = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: {} },
      "8": { class_type: "KSampler", inputs: { model: ["1", 0] } }
    };

    const success = injectPAGGuidanceNode(workflow, 3, "1");

    expect(success).toBe(true);
    expect(workflow["pag_guidance_node"]).toBeDefined();
    expect(workflow["pag_guidance_node"].inputs.scale).toBe(3.0);
    expect(workflow["8"].inputs.model).toEqual(["pag_guidance_node", 0]);
  });
});
