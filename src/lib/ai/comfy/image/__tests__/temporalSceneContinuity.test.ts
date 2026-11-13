import { describe, it, expect } from "vitest";
import { getOrCreateStoryContinuity } from "../temporalSceneContinuity";

describe("temporalSceneContinuity (Task EX-7)", () => {
  it("should track physical state changes across story scenes", () => {
    const continuity = getOrCreateStoryContinuity("story_episode_3", "ruby", 2);

    expect(continuity.storyId).toBe("story_episode_3");
    expect(continuity.activeStateChanges.length).toBeGreaterThan(0);
    expect(continuity.activeStateChanges[0].effect).toBe("slightly damp hair");
  });
});
