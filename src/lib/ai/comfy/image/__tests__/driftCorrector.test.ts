import { describe, it, expect } from "vitest";
import { evaluateSemanticDriftAndCorrection } from "../driftCorrector";

describe("driftCorrector (Task PR-11)", () => {
  it("should evaluate semantic similarity score and return isDrifting: false when score >= threshold", () => {
    const res = evaluateSemanticDriftAndCorrection(
      1,
      "broadcast studio, amber sconce lighting, mahogany desk",
      "ruby_stage_1.png",
      0.70
    );

    expect(res.similarityScore).toBeGreaterThanOrEqual(0.70);
    expect(res.isDrifting).toBe(false);
    expect(res.correctionBoostPrompt).toBeNull();
  });

  it("should detect drift and build correction boost prompt tags when similarity < threshold", () => {
    const res = evaluateSemanticDriftAndCorrection(
      1,
      "copper red hair, green eyes, dark navy blazer",
      "ruby_stage_1.png",
      0.95 // High threshold forces drift detection
    );

    expect(res.isDrifting).toBe(true);
    expect(res.driftingConcepts.length).toBeGreaterThan(0);
    expect(res.correctionBoostPrompt).toContain(":1.7");
  });
});
