import { describe, it, expect } from "vitest";
import { computeTechnicalQualityMetrics } from "../technicalQuality";

describe("technicalQuality (Task AD-10)", () => {
  it("should evaluate clean BRISQUE and NIQE scores for high quality output", () => {
    const res = computeTechnicalQualityMetrics("ruby_clean.png");

    expect(res.brisque).toBe(32.1);
    expect(res.niqe).toBe(3.8);
    expect(res.plasticSkinRisk).toBe(false);
    expect(res.aiArtifactRisk).toBe(false);
    expect(res.recommendation).toBe("Acceptable technical quality");
  });

  it("should detect plastic skin risk when BRISQUE > 50", () => {
    const res = computeTechnicalQualityMetrics("ruby_over_smooth.png");

    expect(res.plasticSkinRisk).toBe(true);
    expect(res.recommendation).toContain("Plastic/airbrushed skin detected");
  });
});
