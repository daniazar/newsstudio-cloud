import { describe, it, expect } from "vitest";
import { buildModeNegativePrompt } from "../modeNegativeBuilder";

describe("modeNegativeBuilder (Task SW-4)", () => {
  it("should include explicit exclusion tags for SFW mode", () => {
    const prompt = buildModeNegativePrompt("SFW", "bad anatomy");

    expect(prompt).toContain("nsfw");
    expect(prompt).toContain("nudity");
    expect(prompt).toContain("revealing clothing");
  });

  it("should NEVER include clothed or covered tags in NSFW_EXPLICIT mode", () => {
    const prompt = buildModeNegativePrompt("NSFW_EXPLICIT", "bad anatomy");

    expect(prompt).not.toContain("clothed");
    expect(prompt).not.toContain("covered");
    expect(prompt).not.toContain("nsfw");
  });
});
