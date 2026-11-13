import { describe, it, expect } from "vitest";
import { evaluateDINOv2IdentityMatch } from "../dinov2Verifier";

describe("dinov2Verifier (Task AD-8)", () => {
  it("should evaluate high DINOv2 identity similarity for matching persona images", () => {
    const res = evaluateDINOv2IdentityMatch("personas/ruby/ruby.png", "ruby_output.png", 0.75);
    expect(res.identitySimilarity).toBe(0.94);
    expect(res.passedIdentityMatch).toBe(true);
  });

  it("should distinguish non-matching facial structures and return passed: false", () => {
    const res = evaluateDINOv2IdentityMatch("personas/ruby/ruby.png", "volt_output.png", 0.75);
    expect(res.identitySimilarity).toBe(0.48);
    expect(res.passedIdentityMatch).toBe(false);
  });
});
