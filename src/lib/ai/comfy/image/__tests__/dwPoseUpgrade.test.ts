import { describe, it, expect } from "vitest";
import { upgradeToDWPosePreprocessor } from "../dwPoseUpgrade";

describe("dwPoseUpgrade (Task EV-3)", () => {
  it("should replace OpenposePreprocessor class_type with DWPreprocessor", () => {
    const workflow: Record<string, any> = {
      pose_node_1: {
        class_type: "OpenposePreprocessor",
        inputs: {}
      }
    };

    const count = upgradeToDWPosePreprocessor(workflow);

    expect(count).toBe(1);
    expect(workflow.pose_node_1.class_type).toBe("DWPreprocessor");
    expect(workflow.pose_node_1.inputs.detect_hand).toBe("enable");
  });
});
