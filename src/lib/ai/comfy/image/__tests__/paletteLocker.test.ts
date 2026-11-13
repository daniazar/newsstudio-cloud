import { describe, it, expect } from "vitest";
import { hexToSDXLColorTag, injectColorPaletteLock } from "../paletteLocker";

describe("paletteLocker (Task PR-8)", () => {
  it("should map hex colors to SDXL color tags", () => {
    expect(hexToSDXLColorTag("#D4A017")).toContain("warm amber lighting");
    expect(hexToSDXLColorTag("#00FFFF")).toContain("cyan neon lighting");
    expect(hexToSDXLColorTag("#8B4513")).toContain("mahogany wood tones");
  });

  it("should inject palette color tags into Stage 1 and Stage 4 prompts", () => {
    const res = injectColorPaletteLock(
      ["#D4A017", "#8B4513"],
      "newsroom studio",
      "relighting pass"
    );

    expect(res.colorTags.length).toBe(2);
    expect(res.injectedStage1Prompt).toContain("warm amber lighting");
    expect(res.injectedStage4Prompt).toContain("mahogany wood tones");
  });
});
