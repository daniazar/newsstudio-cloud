import { describe, it, expect } from "vitest";
import { determineReRollEntryStage, logReRollStrategy } from "../rerollSelector";

describe("rerollSelector (Task QA-12)", () => {
  it("should jump directly to Stage 3.2 for wardrobe changes and re-use stages 1, 2, 3", () => {
    const res = determineReRollEntryStage("wardrobe");
    expect(res.entryStageIndex).toBe(3.2);
    expect(res.cachedStagesToReuse).toEqual([1, 2, 3]);
    expect(res.estimatedTimeSavedSeconds).toBe(30);
  });

  it("should jump directly to Stage 4 for lighting changes and re-use stages 1, 2, 3, 3.2", () => {
    const res = determineReRollEntryStage("lighting");
    expect(res.entryStageIndex).toBe(4);
    expect(res.cachedStagesToReuse).toEqual([1, 2, 3, 3.2]);
  });

  it("should jump directly to Stage 5 for face_detail changes", () => {
    const res = determineReRollEntryStage("face_detail");
    expect(res.entryStageIndex).toBe(5);
    expect(res.estimatedTimeSavedSeconds).toBe(48);
  });

  it("should log re-roll strategy and return result", () => {
    const res = logReRollStrategy("hands");
    expect(res.entryStageIndex).toBe(6);
    expect(res.cachedStagesToReuse).toEqual([1, 2, 3, 3.2, 4, 5]);
  });
});
