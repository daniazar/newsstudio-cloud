import { describe, it, expect } from "vitest";
import { generatePostRunQualityScorecard, getSegmentRating } from "../scorecard";

describe("generatePostRunQualityScorecard (Task QA-11)", () => {
  it("should calculate segment ratings accurately", () => {
    expect(getSegmentRating(95)).toBe("PREMIUM");
    expect(getSegmentRating(88)).toBe("EXCELLENT");
    expect(getSegmentRating(82)).toBe("HIGH");
    expect(getSegmentRating(72)).toBe("PASSABLE");
    expect(getSegmentRating(65)).toBe("NEEDS_RETRY");
  });

  it("should generate a multi-pass pipeline quality scorecard result", () => {
    const res = generatePostRunQualityScorecard("final_image.png", {
      environment: "cyberpunk broadcast studio",
      props: "mahogany news anchor desk",
      persona: "Ruby Vance female presenter",
      wardrobe: "navy formal blazer"
    });

    expect(res.overallIndex).toBeGreaterThanOrEqual(75);
    expect(res.segments.length).toBe(4);
    expect(res.scorecardText).toContain("QUALITY SCORECARD");
    expect(res.scorecardText).toContain("Overall Pipeline Quality Index:");
  });
});
