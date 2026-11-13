import { describe, it, expect } from "vitest";
import { evolvePromptGenetics } from "../promptGenetics";

describe("promptGenetics (Task EX-12)", () => {
  it("should evolve seed prompt over 5 generations and achieve high fitness score", () => {
    const res = evolvePromptGenetics("ruby at hotel bar", "ruby");

    expect(res.generationCount).toBe(5);
    expect(res.fitnessScore).toBeGreaterThanOrEqual(0.85);
    expect(res.evolvedPrompt).toContain("masterpiece composition");
  });
});
