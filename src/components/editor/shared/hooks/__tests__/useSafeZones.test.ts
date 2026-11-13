import { describe, it, expect } from "vitest";
import { calculateSafeZones } from "../useSafeZones";

describe("calculateSafeZones Pure Function Tests", () => {
  it("calculates correct 16:9 widescreen broadcast safe margins", () => {
    const margins = calculateSafeZones("16:9");
    expect(margins.topPercent).toBe(5);
    expect(margins.bottomPercent).toBe(8);
    expect(margins.leftPercent).toBe(5);
    expect(margins.rightPercent).toBe(5);
    expect(margins.rightInteractionGutterPercent).toBe(0);
  });

  it("calculates correct 1:1 square margins", () => {
    const margins = calculateSafeZones("1:1");
    expect(margins.topPercent).toBe(4);
    expect(margins.bottomPercent).toBe(6);
  });

  it("calculates TikTok Shop safe margins with product card and caption allowances", () => {
    const margins = calculateSafeZones("9:16", "tiktok_shop");
    expect(margins.topPercent).toBe(8);
    expect(margins.bottomPercent).toBe(24);
    expect(margins.rightPercent).toBe(18);
    expect(margins.rightInteractionGutterPercent).toBe(18);
  });

  it("calculates Instagram Reels safe margins", () => {
    const margins = calculateSafeZones("9:16", "reels");
    expect(margins.topPercent).toBe(7);
    expect(margins.bottomPercent).toBe(20);
    expect(margins.rightPercent).toBe(16);
  });
});
