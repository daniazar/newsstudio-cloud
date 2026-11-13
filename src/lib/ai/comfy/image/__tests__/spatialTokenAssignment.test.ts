import { describe, it, expect } from "vitest";
import { injectSpatialTokenAssignment, SpatialRegionConfig } from "../workflowMutator";

describe("injectSpatialTokenAssignment (Task QA-8)", () => {
  it("should inject SolidMask, CLIPTextEncode, ConditioningSetMask, and ConditioningCombine nodes for specified regions", () => {
    const workflow: Record<string, any> = {
      "6": { class_type: "CLIPTextEncode", inputs: { text: "base prompt" } },
      "8": { class_type: "KSampler", inputs: { positive: ["6", 0] } }
    };

    const regions: SpatialRegionConfig[] = [
      { regionId: "desk", xMin: 0, yMin: 600, width: 1024, height: 424, promptText: "mahogany news desk with dual microphones" },
      { regionId: "background_screen", xMin: 0, yMin: 0, width: 1024, height: 400, promptText: "blue neon grid background display" }
    ];

    const success = injectSpatialTokenAssignment(workflow, regions, ["2", 1]);

    expect(success).toBe(true);
    expect(workflow["spatial_mask_desk_0"]).toBeDefined();
    expect(workflow["spatial_mask_desk_0"].class_type).toBe("SolidMask");
    expect(workflow["spatial_clip_desk_0"].inputs.text).toBe("mahogany news desk with dual microphones");
    expect(workflow["spatial_cond_mask_desk_0"].class_type).toBe("ConditioningSetMask");
    expect(workflow["spatial_cond_combine_background_screen_1"]).toBeDefined();

    // Verify KSampler positive input points to final ConditioningCombine node
    expect(workflow["8"].inputs.positive).toEqual(["spatial_cond_combine_background_screen_1", 0]);
  });

  it("should return false if regions array is empty or KSampler node is missing", () => {
    const workflow: Record<string, any> = {};
    const success = injectSpatialTokenAssignment(workflow, [], ["2", 1]);
    expect(success).toBe(false);
  });
});
