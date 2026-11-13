import { describe, it, expect } from "vitest";
import { injectInstantIDNode } from "../instantIdIntegrator";

describe("instantIdIntegrator (Task EV-1)", () => {
  it("should inject InstantIDModelLoader and ApplyInstantID nodes into workflow graph", () => {
    const workflow: Record<string, any> = {};

    const success = injectInstantIDNode(workflow, {
      weight: 0.90,
      startAt: 0.0,
      endAt: 1.0,
      faceRefPath: "/public/placeholder_ruby.png"
    });

    expect(success).toBe(true);
    expect(workflow["instantid_model_loader"]).toBeDefined();
    expect(workflow["apply_instantid"]).toBeDefined();
    expect(workflow["apply_instantid"].inputs.weight).toBe(0.90);
  });
});
