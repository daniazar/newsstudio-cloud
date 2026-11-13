import { describe, it, expect } from "vitest";
import { verifySfwSafetyGate } from "../sfwSafetyGate";

describe("sfwSafetyGate (Task SW-10)", () => {
  it("should verify output safety for SFW generation mode", () => {
    const res = verifySfwSafetyGate("/tmp/ruby_stage6.png", "SFW");

    expect(res.isSafe).toBe(true);
    expect(res.confidenceScore).toBeGreaterThanOrEqual(0.95);
  });

  it("should bypass safety gate for NSFW_EXPLICIT mode", () => {
    const res = verifySfwSafetyGate("/tmp/ruby_explicit.png", "NSFW_EXPLICIT");

    expect(res.isSafe).toBe(true);
    expect(res.confidenceScore).toBe(1.0);
  });
});
