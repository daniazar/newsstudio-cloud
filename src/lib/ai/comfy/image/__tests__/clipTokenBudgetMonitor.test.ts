import { describe, it, expect } from "vitest";
import { monitorClipTokenBudget } from "../clipTokenBudgetMonitor";

describe("clipTokenBudgetMonitor (Task QX-1)", () => {
  it("should pass short prompt without warnings or trimming", () => {
    const res = monitorClipTokenBudget("ruby, copper hair, newsroom");

    expect(res.exceedsWarningThreshold).toBe(false);
    expect(res.exceedsHardCeiling).toBe(false);
    expect(res.removedTags.length).toBe(0);
  });

  it("should warn and trim when prompt exceeds CLIP token budget ceiling", () => {
    const longPrompt = Array(35).fill("sample_tag_detail").join(", ");
    const res = monitorClipTokenBudget(longPrompt);

    expect(res.exceedsWarningThreshold).toBe(true);
    expect(res.exceedsHardCeiling).toBe(true);
    expect(res.removedTags.length).toBeGreaterThan(0);
  });
});
