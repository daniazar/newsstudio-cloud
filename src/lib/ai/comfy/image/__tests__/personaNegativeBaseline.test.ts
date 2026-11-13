import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { getPersonaLearnedNegativePromptForMode } from "../personaNegativeBaseline";

describe("personaNegativeBaseline (Task SW-8)", () => {
  const testDir = path.join(process.cwd(), "scratch", "test_baseline_mode");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should return SFW mode learned negative tags for persona", () => {
    const prompt = getPersonaLearnedNegativePromptForMode("ruby", "SFW", testDir);

    expect(prompt).toContain("(anime red hair:1.3)");
    expect(prompt).toContain("(blue eyes:1.4)");
  });

  it("should return NSFW_EXPLICIT mode learned negative tags for persona", () => {
    const prompt = getPersonaLearnedNegativePromptForMode("ruby", "NSFW_EXPLICIT", testDir);

    expect(prompt).toContain("(clothed:1.5)");
  });
});
