import { describe, it, expect } from "vitest";
import { translateDirectorsPrompt } from "../directorsTranslator";

describe("directorsTranslator (Task EX-2)", () => {
  it("should translate natural language director prompt into weighted diffusion tags", () => {
    const res = translateDirectorsPrompt("moody lighting, concerned look");

    expect(res.translatedTags.length).toBeGreaterThan(0);
    expect(res.injectedPrompt).toContain("concerned expression");
    expect(res.injectedPrompt).toContain("moody lighting");
  });
});
