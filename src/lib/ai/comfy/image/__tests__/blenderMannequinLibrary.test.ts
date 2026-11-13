import { describe, it, expect } from "vitest";
import { getBlenderMannequinMesh } from "../blenderMannequinLibrary";

describe("blenderMannequinLibrary (Task OB-10)", () => {
  it("should resolve female average height 3D mannequin mesh path", () => {
    const mesh = getBlenderMannequinMesh("female", "average");

    expect(mesh.gender).toBe("female");
    expect(mesh.heightCategory).toBe("average");
    expect(mesh.meshPath).toContain("female_average.blend");
  });
});
