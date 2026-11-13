import { describe, it, expect } from "vitest";
import { injectSkipLayerGuidanceNode } from "../skipLayerGuidance";

describe("skipLayerGuidance (Task EV-4)", () => {
  it("should inject SkipLayerGuidanceDiag node for Stage 3", () => {
    const workflow: Record<string, any> = {};

    const injected = injectSkipLayerGuidanceNode(workflow, 3);

    expect(injected).toBe(true);
    expect(workflow["slg_cfg_stage_3"]).toBeDefined();
    expect(workflow["slg_cfg_stage_3"].inputs.scale).toBe(2.8);
  });

  it("should skip SLG node injection for non-applicable stages", () => {
    const workflow: Record<string, any> = {};

    const injected = injectSkipLayerGuidanceNode(workflow, 2);

    expect(injected).toBe(false);
    expect(workflow["slg_cfg_stage_2"]).toBeUndefined();
  });
});
