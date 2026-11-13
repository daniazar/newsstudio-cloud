import { describe, it, expect } from "vitest";
import { getSceneContextNegativePrompt } from "../contextNegativeInjector";

describe("contextNegativeInjector (Task QX-2)", () => {
  it("should return context negative tags for bar_interior scene type", () => {
    const prompt = getSceneContextNegativePrompt("bar_interior");

    expect(prompt).toContain("office furniture");
    expect(prompt).toContain("hospital bed");
  });

  it("should return context negative tags for office scene type", () => {
    const prompt = getSceneContextNegativePrompt("office");

    expect(prompt).toContain("bar bottles");
    expect(prompt).toContain("nightclub");
  });
});
