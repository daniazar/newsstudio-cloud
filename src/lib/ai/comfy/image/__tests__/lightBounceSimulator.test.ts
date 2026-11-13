import { describe, it, expect } from "vitest";
import { simulateLightBounceColor } from "../lightBounceSimulator";

describe("lightBounceSimulator (Task EX-8)", () => {
  it("should extract dominant colors and compute secondary bounce light prompt", () => {
    const res = simulateLightBounceColor("/tmp/stage1.png");

    expect(res.dominantHexColors.length).toBe(3);
    expect(res.bouncePrompt).toContain("ambient warm amber bounce fill light");
  });
});
