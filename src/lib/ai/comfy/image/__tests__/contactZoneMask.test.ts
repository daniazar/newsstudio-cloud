import { describe, it, expect } from "vitest";
import { injectContactZoneMask } from "../workflowMutator";
import { generateContactZoneBounds } from "../contactZoneManager";

describe("injectContactZoneMask (Task CC-8)", () => {
  it("should inject SolidMask and ConditioningSetMask nodes for FULL_CONTACT bounds", () => {
    const workflow: Record<string, any> = {
      "6": { inputs: { positive: ["5", 0] } },
      "8": { inputs: { positive: ["6", 0] } }
    };

    const bounds = generateContactZoneBounds("couple in doggystyle position on bed", 1024, 1024);
    injectContactZoneMask(workflow, bounds, 1024, 1024);

    expect(workflow["contact_zone_mask"]).toBeDefined();
    expect(workflow["contact_zone_mask"].class_type).toBe("SolidMask");
    expect(workflow["contact_zone_mask"].inputs.x).toBe(256);

    expect(workflow["contact_zone_conditioning"]).toBeDefined();
    expect(workflow["contact_zone_conditioning"].class_type).toBe("ConditioningSetMask");
    expect(workflow["8"].inputs.positive).toEqual(["contact_zone_conditioning", 0]);
  });

  it("should do nothing when contactType is NONE", () => {
    const workflow: Record<string, any> = {
      "6": { inputs: { positive: ["5", 0] } },
      "8": { inputs: { positive: ["6", 0] } }
    };

    const bounds = generateContactZoneBounds("empty newsroom studio", 1024, 1024);
    injectContactZoneMask(workflow, bounds, 1024, 1024);

    expect(workflow["contact_zone_mask"]).toBeUndefined();
    expect(workflow["8"].inputs.positive).toEqual(["6", 0]);
  });
});
