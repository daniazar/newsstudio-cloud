import { describe, it, expect } from "vitest";
import { generateBlenderProxyMaps } from "../blenderProxy";

describe("blenderProxy (Task OB-2)", () => {
  it("should generate 4 pixel-aligned ControlNet conditioning maps", () => {
    const maps = generateBlenderProxyMaps({
      cameraAngle: "3/4 left, eye level",
      personaPositions: [{ id: "ruby", x: 0, y: 0, z: 0 }],
      lightingRig: "warm 3-point key light"
    });

    expect(maps.generatedCount).toBe(4);
    expect(maps.depthMapPath).toContain("blender_depth.png");
    expect(maps.normalMapPath).toContain("blender_normals.png");
  });
});
