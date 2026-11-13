import { describe, it, expect } from "vitest";
import { injectIPAdapterFaceIDNode } from "../ipAdapterFaceID";

describe("ipAdapterFaceID (Task EV-2)", () => {
  it("should inject IPAdapterFaceID nodes into workflow graph", () => {
    const workflow: Record<string, any> = {};

    const success = injectIPAdapterFaceIDNode(workflow, {
      weight: 0.65,
      weightType: "linear",
      faceRefPath: "/public/placeholder_ruby.png"
    });

    expect(success).toBe(true);
    expect(workflow["ipadapter_faceid_loader"]).toBeDefined();
    expect(workflow["apply_ipadapter_faceid"]).toBeDefined();
    expect(workflow["apply_ipadapter_faceid"].inputs.weight).toBe(0.65);
  });
});
