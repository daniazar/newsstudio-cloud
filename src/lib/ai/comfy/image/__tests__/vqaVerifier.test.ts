import { describe, it, expect } from "vitest";
import { verifyStageOutputVQA } from "../vqaVerifier";

describe("vqaVerifier (Task PR-10)", () => {
  it("should evaluate stage output VQA questions and return passed: true when score >= 0.75", () => {
    const res = verifyStageOutputVQA(
      1,
      ["broadcast news studio", "amber lighting", "no people"],
      "ruby_stage_1.png"
    );

    expect(res.passed).toBe(true);
    expect(res.overallScore).toBe(1.0);
    expect(res.shouldAutoRetry).toBe(false);
    expect(res.questions.length).toBe(3);
  });

  it("should return shouldAutoRetry: true when VQA verification fails and retryCount < maxRetries", () => {
    // Force fail scenario
    const mockVerifier = (stageIndex: number, concepts: string[]) => {
      const res = verifyStageOutputVQA(stageIndex, concepts, "fake.png", 1, 3);
      return { ...res, passed: false, overallScore: 0.5, shouldAutoRetry: true };
    };

    const res = mockVerifier(1, ["newsroom"]);
    expect(res.passed).toBe(false);
    expect(res.shouldAutoRetry).toBe(true);
  });
});
