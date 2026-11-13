import { describe, it, expect } from "vitest";
import { classifyFacialExpression } from "../facsClassifier";

describe("facsClassifier (Task OB-8)", () => {
  it("should return Action Unit scores and verify expression score >= 0.65 for genuine smile", () => {
    const res = classifyFacialExpression("/tmp/ruby_stage5.png", "warm smile");

    expect(res.expressionScore).toBeGreaterThanOrEqual(0.65);
    expect(res.needsReroll).toBe(false);
    expect(res.au6CheekRaiser).toBe(0.84);
  });
});
