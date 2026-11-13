import { describe, it, expect } from "vitest";
import { validatePreGenClipScore } from "../clipValidator";

describe("validatePreGenClipScore (Task QA-10)", () => {
  it("should return isValid: true and coherenceScore: 1.0 for harmonious prompt tags", () => {
    const res = validatePreGenClipScore("cyberpunk newsroom broadcast studio, wearing a dark navy formal news anchor blazer");

    expect(res.isValid).toBe(true);
    expect(res.coherenceScore).toBe(1.0);
    expect(res.conflicts.length).toBe(0);
  });

  it("should detect nudity vs clothing contradiction and return isValid: false with conflict details", () => {
    const res = validatePreGenClipScore("completely naked, fully nude, wearing a dark navy formal news anchor blazer");

    expect(res.isValid).toBe(false);
    expect(res.coherenceScore).toBeLessThan(1.0);
    expect(res.conflicts.length).toBeGreaterThan(0);
    expect(res.conflicts[0].reason).toContain("Nudity tags specified alongside explicit clothing items");
    expect(res.sanitizedPrompt).not.toContain("naked");
  });

  it("should detect daylight vs dark night contradiction", () => {
    const res = validatePreGenClipScore("bright daylight, dark night sky, newsroom studio");
    expect(res.isValid).toBe(false);
    expect(res.conflicts[0].reason).toContain("Daylight specified alongside dark night environment");
  });
});
