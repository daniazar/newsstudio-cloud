import { describe, it, expect } from "vitest";
import { evaluateStage1CreativeDirector } from "../creativeDirector";

describe("creativeDirector (Task OB-4)", () => {
  it("should auto-patch downstream prompt when aesthetic score < 0.75", () => {
    const feedback = evaluateStage1CreativeDirector("/tmp/stage1.png", 0.65, "hotel bar interior");

    expect(feedback.needsPromptPatch).toBe(true);
    expect(feedback.patchedPrompt).toContain("warm amber sconce glow");
  });

  it("should preserve original prompt when aesthetic score >= 0.75", () => {
    const feedback = evaluateStage1CreativeDirector("/tmp/stage1.png", 0.82, "hotel bar interior");

    expect(feedback.needsPromptPatch).toBe(false);
    expect(feedback.patchedPrompt).toBe("hotel bar interior");
  });
});
