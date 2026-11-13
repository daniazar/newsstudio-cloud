import { describe, it, expect } from "vitest";
import {
  calculateDuckingMultiplier,
  getDuckedVolume,
  calculateDynamicMusicVolume,
  findActiveInterval,
} from "@/remotion/components/AudioDuckingLayer";

describe("AudioDuckingLayer & -14dB Speech Ducking", () => {
  it("calculates exact -14dB linear gain multiplier", () => {
    const mult14 = calculateDuckingMultiplier(-14);
    // 10^(-14/20) = 10^(-0.7) ~= 0.1995262315
    expect(mult14).toBeCloseTo(0.1995, 3);

    // 0dB should be unity (1.0)
    expect(calculateDuckingMultiplier(0)).toBe(1.0);

    // -6dB should be approx half (0.501)
    expect(calculateDuckingMultiplier(-6)).toBeCloseTo(0.501, 2);
  });

  it("ducks background music by -14dB during presenter speech", () => {
    const baseVolume = 0.35;

    // When speech is inactive: full base volume
    const unducked = getDuckedVolume(baseVolume, false, -14);
    expect(unducked).toBe(0.35);

    // When speech is active: ducked by -14dB (approx 0.1995 * 0.35 = 0.0698)
    const ducked = getDuckedVolume(baseVolume, true, -14);
    expect(ducked).toBeCloseTo(0.0698, 3);
    expect(ducked).toBeLessThan(0.08);
  });

  it("smooths volume changes across attack and release frames", () => {
    const baseVolume = 0.35;
    const speechIntervals = [{ startFrame: 30, endFrame: 90 }];

    // Before speech (Frame 10): Full base volume
    const volBefore = calculateDynamicMusicVolume(10, {
      baseVolume,
      speechIntervals,
      attackFrames: 8,
      releaseFrames: 12,
    });
    expect(volBefore).toBe(baseVolume);

    // Attack ramp (Frame 34): Halfway between base volume and ducked volume
    const volAttack = calculateDynamicMusicVolume(34, {
      baseVolume,
      speechIntervals,
      attackFrames: 8,
      releaseFrames: 12,
    });
    expect(volAttack).toBeLessThan(baseVolume);
    expect(volAttack).toBeGreaterThan(baseVolume * 0.2);

    // Mid-speech (Frame 60): Fully ducked at -14dB
    const volSpeech = calculateDynamicMusicVolume(60, {
      baseVolume,
      speechIntervals,
      attackFrames: 8,
      releaseFrames: 12,
    });
    expect(volSpeech).toBeCloseTo(baseVolume * 0.1995, 3);

    // After release (Frame 110): Recovered to full base volume
    const volRecovered = calculateDynamicMusicVolume(110, {
      baseVolume,
      speechIntervals,
      attackFrames: 8,
      releaseFrames: 12,
    });
    expect(volRecovered).toBe(baseVolume);
  });

  it("efficiently resolves active interval via findActiveInterval", () => {
    const intervals = [
      { startFrame: 30, endFrame: 90 },
      { startFrame: 120, endFrame: 180 },
      { startFrame: 210, endFrame: 270 },
      { startFrame: 300, endFrame: 360 },
      { startFrame: 390, endFrame: 450 },
    ];

    // Frame before any interval
    expect(findActiveInterval(10, intervals, 12)).toBeNull();

    // Frame inside first interval
    expect(findActiveInterval(50, intervals, 12)).toEqual(intervals[0]);

    // Frame during release window of first interval (90 + 5 = 95 <= 102)
    expect(findActiveInterval(95, intervals, 12)).toEqual(intervals[0]);

    // Frame between intervals after release (frame 110 is after 102 and before 120)
    expect(findActiveInterval(110, intervals, 12)).toBeNull();

    // Frame inside middle interval (binary search verification)
    expect(findActiveInterval(330, intervals, 12)).toEqual(intervals[3]);

    // Frame past last interval
    expect(findActiveInterval(500, intervals, 12)).toBeNull();
  });
});
