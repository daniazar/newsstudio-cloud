import { describe, it, expect } from "vitest";
import { applyDepthOfFieldBlurPass } from "../dofBlurLayering";

describe("dofBlurLayering (Task QX-8)", () => {
  it("should apply strong defocus blur pass for fast f/1.8 aperture", () => {
    const res = applyDepthOfFieldBlurPass("/tmp/final.png", "/tmp/depth.png", { aperture: "f/1.8", focusDistanceMeters: 1.2 });

    expect(res.aperture).toBe("f/1.8");
    expect(res.blurRadiusMaxPx).toBe(5.2);
    expect(res.outputImagePath).toContain("final_dof.png");
  });
});
