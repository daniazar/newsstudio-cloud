import { describe, it, expect } from "vitest";
import { buildOutpaintConfig } from "../outpaintEngine";

describe("outpaintEngine (Task AD-12)", () => {
  it("should calculate correct extended dimensions for left extension", () => {
    const res = buildOutpaintConfig("left", 320, "studio wall", 1024, 1024);

    expect(res.newWidth).toBe(1344);
    expect(res.newHeight).toBe(1024);
    expect(res.direction).toBe("left");
  });

  it("should calculate correct extended dimensions for all-sides extension", () => {
    const res = buildOutpaintConfig("all", 256, "background", 1024, 1024);

    expect(res.newWidth).toBe(1536);
    expect(res.newHeight).toBe(1536);
  });
});
