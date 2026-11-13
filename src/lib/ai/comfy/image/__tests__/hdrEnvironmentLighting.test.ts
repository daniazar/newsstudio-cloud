import { describe, it, expect } from "vitest";
import { getHdrEnvironmentMap } from "../hdrEnvironmentLighting";

describe("hdrEnvironmentLighting (Task QX-14)", () => {
  it("should resolve HDR environment map path for bar_amber_night", () => {
    const res = getHdrEnvironmentMap("bar_amber_night");

    expect(res.hdriName).toBe("bar_amber_night");
    expect(res.hdrFilePath).toContain("bar_amber_night.hdr");
  });
});
