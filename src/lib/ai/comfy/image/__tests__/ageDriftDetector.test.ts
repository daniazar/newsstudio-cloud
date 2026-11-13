import { describe, it, expect } from "vitest";
import { detectAgeDrift } from "../ageDriftDetector";

describe("ageDriftDetector (Task QX-3)", () => {
  it("should pass when age drift is within 5 years tolerance", () => {
    const res = detectAgeDrift("/tmp/stage3.png", 28, 30);

    expect(res.exceedsThreshold).toBe(false);
    expect(res.correctiveYouthTags.length).toBe(0);
  });

  it("should generate youth tags when age drift exceeds 5 years", () => {
    const res = detectAgeDrift("/tmp/stage3.png", 28, 36);

    expect(res.exceedsThreshold).toBe(true);
    expect(res.correctiveYouthTags).toContain("(youthful skin:1.3)");
  });
});
