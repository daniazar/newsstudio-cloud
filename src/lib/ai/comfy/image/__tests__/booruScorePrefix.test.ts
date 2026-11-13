import { describe, it, expect } from "vitest";
import { resolveScorePrefix } from "../booruScorePrefix";

describe("booruScorePrefix (Task SW-5)", () => {
  it("should return rating_safe prefix for SFW mode", () => {
    const res = resolveScorePrefix("SFW");
    expect(res.ratingTag).toBe("rating_safe");
    expect(res.prefix).toContain("rating_safe");
  });

  it("should return rating_explicit prefix for NSFW_EXPLICIT mode", () => {
    const res = resolveScorePrefix("NSFW_EXPLICIT");
    expect(res.ratingTag).toBe("rating_explicit");
    expect(res.prefix).toContain("rating_explicit");
  });
});
