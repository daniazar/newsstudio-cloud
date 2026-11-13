import { describe, it, expect } from "vitest";
import { applyCameraLutPass } from "../lutPass";

describe("lutPass (Task EV-8)", () => {
  it("should apply Canon_Log3 camera LUT profile to target image path", () => {
    const res = applyCameraLutPass("/tmp/ruby_final.png", "Canon_Log3");

    expect(res.appliedLut).toBe("Canon_Log3");
    expect(res.imagePath).toBe("/tmp/ruby_final.png");
    expect(res.durationMs).toBeLessThan(100);
  });
});
