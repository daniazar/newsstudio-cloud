import { describe, it, expect } from "vitest";
import { generateMultiShotStoryList } from "../multiShotStory";

describe("multiShotStory (Task OB-5)", () => {
  it("should generate a 6-shot visual narrative shot list sequence", () => {
    const series = generateMultiShotStoryList("Ruby and Volt at the hotel bar");

    expect(series.shotCount).toBe(6);
    expect(series.shots[0].shotType).toBe("WIDE_ESTABLISHING");
    expect(series.shots[1].reuseEnvironmentLatent).toBe(true);
  });
});
