import { describe, it, expect } from "vitest";
import { getStageFreeUParameters, injectFreeUV2Node } from "../freeuRebalancer";

describe("freeuRebalancer (Task EX-2)", () => {
  it("should return structure phase parameters for Stage 1 & 2", () => {
    const p1 = getStageFreeUParameters(1);
    expect(p1.b1).toBe(1.3);
    expect(p1.b2).toBe(1.4);
    expect(p1.phaseName).toContain("Structure-Building");
  });

  it("should return detail phase parameters for Stage 3-6", () => {
    const p3 = getStageFreeUParameters(3);
    expect(p3.b1).toBe(1.1);
    expect(p3.b2).toBe(1.2);
    expect(p3.phaseName).toContain("Detail-Refinement");
  });

  it("should inject FreeU_V2 node into workflow graph", () => {
    const workflow: Record<string, any> = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: {} },
      "8": { class_type: "KSampler", inputs: { model: ["1", 0] } }
    };

    const success = injectFreeUV2Node(workflow, 1, "1");

    expect(success).toBe(true);
    expect(workflow["freeu_v2_node"]).toBeDefined();
    expect(workflow["freeu_v2_node"].inputs.b1).toBe(1.3);
    expect(workflow["8"].inputs.model).toEqual(["freeu_v2_node", 0]);
  });
});
