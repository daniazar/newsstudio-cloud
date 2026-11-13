import { describe, it, expect } from "vitest";
import { evolveNegativePrompt } from "../negativeFeedbackLoop";

describe("negativeFeedbackLoop (Task EX-7)", () => {
  it("should return base negative prompt unchanged when no artifacts detected", () => {
    const res = evolveNegativePrompt(3, "blurry, low quality", []);
    expect(res.evolvedNegativePrompt).toBe("blurry, low quality");
    expect(res.addedExclusions.length).toBe(0);
  });

  it("should append weighted exclusion tags for detected artifacts to downstream negative prompt", () => {
    const res = evolveNegativePrompt(4, "blurry, low quality", ["extra fingers", "anime eye glow"]);
    expect(res.addedExclusions.length).toBe(2);
    expect(res.evolvedNegativePrompt).toContain("(extra fingers:1.4)");
    expect(res.evolvedNegativePrompt).toContain("(anime eye glow:1.4)");
  });
});
