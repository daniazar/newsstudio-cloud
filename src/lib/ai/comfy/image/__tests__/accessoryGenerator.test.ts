import { describe, it, expect } from "vitest";
import { buildAccessoryInpaintPass } from "../accessoryGenerator";

describe("accessoryGenerator (Task QX-4)", () => {
  it("should extract accessory tags and build secondary inpaint prompt", () => {
    const pass = buildAccessoryInpaintPass("ruby", "broadcast");

    expect(pass.accessoryTags.length).toBeGreaterThan(0);
    expect(pass.inpaintPrompt).toContain("small gold hoop earrings");
    expect(pass.targetRegionMask).toBe("ear_neck");
  });
});
