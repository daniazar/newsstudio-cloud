import { describe, it, expect } from "vitest";
import { generateContactZoneBounds } from "../contactZoneManager";

describe("contactZoneManager (Task CC-7)", () => {
  it("should classify full contact scenes and return center-lower bounds", () => {
    const bounds = generateContactZoneBounds("couple in doggystyle position on bed", 1024, 1024);
    expect(bounds.contactType).toBe("FULL_CONTACT");
    expect(bounds.pixelXMin).toBe(256);
    expect(bounds.pixelWidth).toBe(512);
  });

  it("should classify moderate contact scenes for hugging/kissing", () => {
    const bounds = generateContactZoneBounds("two personas hugging intimately", 1024, 1024);
    expect(bounds.contactType).toBe("MODERATE_CONTACT");
    expect(bounds.pixelXMin).toBe(307);
  });

  it("should classify soft contact for leaning/shoulder touching", () => {
    const bounds = generateContactZoneBounds("presenters standing side by side leaning toward each other", 1024, 1024);
    expect(bounds.contactType).toBe("SOFT_CONTACT");
  });

  it("should return NONE fallback for non-contact text", () => {
    const bounds = generateContactZoneBounds("newsroom studio setup", 1024, 1024);
    expect(bounds.contactType).toBe("NONE");
    expect(bounds.pixelWidth).toBe(1024);
  });
});
