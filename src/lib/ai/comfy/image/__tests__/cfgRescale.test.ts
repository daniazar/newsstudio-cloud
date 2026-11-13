import { describe, it, expect } from "vitest";
import { getStageCFGRescale, injectCFGRescaleNode } from "../cfgRescale";

describe("cfgRescale (Task AD-2)", () => {
  it("should return optimal CFG scale and rescale factor per stage", () => {
    expect(getStageCFGRescale(1).rescale).toBe(0.3);
    expect(getStageCFGRescale(3).rescale).toBe(0.6);
    expect(getStageCFGRescale(5).rescale).toBe(0.5);
  });

  it("should inject RescaleCFG node into workflow graph", () => {
    const workflow: Record<string, any> = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: {} },
      "8": { class_type: "KSampler", inputs: { model: ["1", 0] } }
    };

    const success = injectCFGRescaleNode(workflow, 3, "1");

    expect(success).toBe(true);
    expect(workflow["cfg_rescale_node"]).toBeDefined();
    expect(workflow["cfg_rescale_node"].inputs.multiplier).toBe(0.6);
    expect(workflow["8"].inputs.model).toEqual(["cfg_rescale_node", 0]);
  });
});
