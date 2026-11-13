import { describe, it, expect } from "vitest";
import { injectSSSConditioningTags } from "../sssConditioning";

describe("sssConditioning (Task QX-9)", () => {
  it("should augment prompt with SSS biological skin conditioning tags", () => {
    const res = injectSSSConditioningTags("ruby portrait, bar backlight");

    expect(res.sssTags.length).toBe(4);
    expect(res.augmentedPrompt).toContain("subsurface scattering");
    expect(res.augmentedPrompt).toContain("skin translucency");
  });
});
