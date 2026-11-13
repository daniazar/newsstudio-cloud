import { describe, it, expect } from "vitest";
import { parseContentMode } from "../contentMode";

describe("contentMode (Task SW-1)", () => {
  it("should default to SFW mode when input is omitted or invalid", () => {
    expect(parseContentMode()).toBe("SFW");
    expect(parseContentMode("invalid_mode")).toBe("SFW");
  });

  it("should parse NSFW_SOFT and NSFW_EXPLICIT correctly", () => {
    expect(parseContentMode("NSFW_SOFT")).toBe("NSFW_SOFT");
    expect(parseContentMode("NSFW_EXPLICIT")).toBe("NSFW_EXPLICIT");
  });
});
