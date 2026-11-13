/**
 * src/lib/ecommerce/__tests__/colorUtils.test.ts
 *
 * Unit tests for client-safe color contrast utility.
 */

import { describe, it, expect } from "vitest";
import { getContrastingTextColor } from "../colorUtils";

describe("colorUtils - getContrastingTextColor", () => {
  it("returns dark text for light backgrounds", () => {
    expect(getContrastingTextColor("#ffffff")).toBe("#09090b");
    expect(getContrastingTextColor("#ffe600")).toBe("#09090b");
    expect(getContrastingTextColor("#ff9900")).toBe("#09090b");
    expect(getContrastingTextColor("#06b6d4")).toBe("#09090b");
  });

  it("returns white text for dark backgrounds", () => {
    expect(getContrastingTextColor("#000000")).toBe("#ffffff");
    expect(getContrastingTextColor("#09090b")).toBe("#ffffff");
    expect(getContrastingTextColor("#1e293b")).toBe("#ffffff");
  });

  it("handles 3-digit hex, empty string, and undefined inputs", () => {
    expect(getContrastingTextColor("#fff")).toBe("#09090b");
    expect(getContrastingTextColor("#000")).toBe("#ffffff");
    expect(getContrastingTextColor("")).toBe("#ffffff");
    expect(getContrastingTextColor(undefined)).toBe("#ffffff");
  });
});
