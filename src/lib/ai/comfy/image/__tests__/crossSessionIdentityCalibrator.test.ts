import { describe, it, expect } from "vitest";
import { calibrateCrossSessionIdentity } from "../crossSessionIdentityCalibrator";

describe("crossSessionIdentityCalibrator (Task EX-6)", () => {
  it("should calculate mean pairwise similarity and return identity calibration metrics", () => {
    const res = calibrateCrossSessionIdentity("ruby", [
      { path: "/tmp/img1.png", seed: 1001 },
      { path: "/tmp/img2.png", seed: 1002 }
    ]);

    expect(res.personaId).toBe("ruby");
    expect(res.meanSessionSimilarity).toBeGreaterThanOrEqual(0.75);
    expect(res.puLIDStrengthAdjustment).toBe(0.0);
  });
});
