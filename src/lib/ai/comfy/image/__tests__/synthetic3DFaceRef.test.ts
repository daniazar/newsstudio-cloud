import { describe, it, expect } from "vitest";
import { getSynthetic3DFaceReference } from "../synthetic3DFaceRef";

describe("synthetic3DFaceRef (Task OB-6)", () => {
  it("should resolve normalized synthetic reference image path for target yaw/pitch angles", () => {
    const res = getSynthetic3DFaceReference("ruby", 32, -14);

    expect(res.personaId).toBe("ruby");
    expect(res.yawDeg).toBe(30);
    expect(res.pitchDeg).toBe(-15);
    expect(res.syntheticRefPath).toContain("ref_pitch-15_yaw30.png");
  });
});
