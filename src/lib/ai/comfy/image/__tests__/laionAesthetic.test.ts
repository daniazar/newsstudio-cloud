import { describe, it, expect } from "vitest";
import { predictLAIONAestheticScore } from "../laionAesthetic";

describe("laionAesthetic (Task AD-9)", () => {
  it("should return high aesthetic score and EXCELLENT tier for final composition", () => {
    const res = predictLAIONAestheticScore("ruby_multipass_final_123456.png");

    expect(res.aestheticScore).toBe(7.6);
    expect(res.qualityTier).toBe("EXCELLENT");
    expect(res.autoTriggerRefiner).toBe(false);
  });

  it("should evaluate auto-trigger flags correctly for lower scoring previews", () => {
    const res = predictLAIONAestheticScore("draft_preview.png");

    expect(res.aestheticScore).toBe(5.8);
    expect(res.autoTriggerRefiner).toBe(true);
    expect(res.autoTriggerHandDetailer).toBe(false);
  });
});
