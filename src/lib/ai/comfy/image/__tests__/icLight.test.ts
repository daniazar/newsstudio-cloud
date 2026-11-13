import { describe, it, expect } from "vitest";
import { injectICLightV2Relighting } from "../icLight";

describe("icLight (Task PR-7)", () => {
  it("should inject ICLightModelLoader and ICLightApply nodes wired to foreground image node", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "VAEDecode", inputs: {} }
    };

    const success = injectICLightV2Relighting(workflow, "8", "ambient_warm", 0.85);

    expect(success).toBe(true);
    expect(workflow["ic_light_model_loader"]).toBeDefined();
    expect(workflow["ic_light_apply"]).toBeDefined();
    expect(workflow["ic_light_apply"].inputs.light_direction).toBe("ambient_warm");
    expect(workflow["ic_light_apply"].inputs.strength).toBe(0.85);
    expect(workflow["ic_light_apply"].inputs.image).toEqual(["8", 0]);
  });

  it("should return false if foreground image node does not exist", () => {
    const workflow: Record<string, any> = {};
    const success = injectICLightV2Relighting(workflow, "999", "left_light", 0.8);
    expect(success).toBe(false);
  });
});
