import { describe, it, expect } from "vitest";
import { formatHeadlineTickerItems, extractHeadlinesFromSegments, calculateTickerTranslateX } from "@/remotion/layers/TickerTapeLayer";
import { calculateDuckingMultiplier, calculateDynamicMusicVolume, clampVolume } from "@/remotion/components/AudioDuckingLayer";
import { resolveActionLoopVideo } from "../../workers/pipeline-worker/tasks/videoTask";
import type { RemotionSegment } from "@/lib/types";

describe("Wave 7 Performance Optimizations Suite", () => {
  describe("AudioDuckingLayer Cached Multipliers & Interpolation", () => {
    it("should retrieve cached ducking multiplier in O(1) without NaN or precision errors", () => {
      const ducking = calculateDuckingMultiplier(-14);
      const swell = calculateDuckingMultiplier(-2);
      const unity = calculateDuckingMultiplier(0);

      expect(ducking).toBeCloseTo(0.1995, 3);
      expect(swell).toBeCloseTo(0.7943, 3);
      expect(unity).toBe(1.0);
    });

    it("should dynamically calculate smooth attack and release volume gain envelope", () => {
      const intervals = [{ startFrame: 30, endFrame: 90 }];
      // At frame 0 (outside speech interval): baseVolume * swellMultiplier
      const volAtStart = calculateDynamicMusicVolume(0, {
        baseVolume: 0.35,
        duckingDb: -14,
        swellDb: 0,
        speechIntervals: intervals,
      });
      expect(volAtStart).toBeCloseTo(0.35, 2);

      // At frame 50 (in the middle of active speech): ducked to -14dB
      const volActive = calculateDynamicMusicVolume(50, {
        baseVolume: 0.35,
        duckingDb: -14,
        swellDb: 0,
        speechIntervals: intervals,
      });
      expect(volActive).toBeCloseTo(0.35 * Math.pow(10, -14 / 20), 2);
      expect(volActive).toBeLessThan(volAtStart);
    });

    it("should strictly clamp volume between 0 and 1", () => {
      expect(clampVolume(-0.5)).toBe(0);
      expect(clampVolume(1.8)).toBe(1);
      expect(clampVolume(NaN)).toBe(0);
      expect(clampVolume(Infinity)).toBe(0);
      expect(clampVolume(0.42)).toBe(0.42);
    });
  });

  describe("TickerTapeLayer Headline Extraction & Modulo Wrapping", () => {
    it("should format headlines into structured ticker items efficiently", () => {
      const raw = ["Breaking tech announcement", "Autonomous studio reaches 4K"];
      const items = formatHeadlineTickerItems(raw, "TECH ALERT");

      expect(items).toHaveLength(2);
      expect(items[0].headline).toBe("Breaking tech announcement");
      expect(items[0].urgency).toBe("breaking");
      expect(items[1].urgency).toBe("standard");
    });

    it("should extract clean headlines from segments", () => {
      const mockSegments: RemotionSegment[] = [
        {
          index: 0,
          startFrame: 0,
          endFrame: 60,
          text: "Global markets rebound sharply today. Investors celebrate recovery.",
        },
        {
          index: 1,
          startFrame: 60,
          endFrame: 120,
          text: "Quantum computing breakthrough confirmed!",
        },
      ];

      const extracted = extractHeadlinesFromSegments(mockSegments);
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toBe("Global markets rebound sharply today");
      expect(extracted[1]).toBe("Quantum computing breakthrough confirmed");
    });

    it("should smoothly wrap horizontal translation with modulo math", () => {
      const offset0 = calculateTickerTranslateX(0, 2.5, 1000);
      const offset100 = calculateTickerTranslateX(100, 2.5, 1000);
      const offsetWrap = calculateTickerTranslateX(400, 2.5, 1000);

      expect(offset0).toBe(-0);
      expect(offset100).toBe(-250);
      expect(offsetWrap).toBe(-0);
    });
  });

  describe("VideoTask Action Loop In-Memory Caching", () => {
    it("should resolve action loop video with O(1) cache hits across repeated segment calls", () => {
      const start1 = performance.now();
      const resolvedFirst = resolveActionLoopVideo("ruby");
      const duration1 = performance.now() - start1;

      const start2 = performance.now();
      const resolvedSecond = resolveActionLoopVideo("ruby");
      const duration2 = performance.now() - start2;

      expect(resolvedFirst).toBeDefined();
      expect(resolvedSecond).toBe(resolvedFirst);
      expect(duration2).toBeLessThanOrEqual(duration1 + 1);
    });
  });
});
