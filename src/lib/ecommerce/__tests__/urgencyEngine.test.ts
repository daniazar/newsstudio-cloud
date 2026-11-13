import { describe, it, expect } from "vitest";
import {
  computeFrameCountdown,
  computeStockProgress,
  getUrgencyThemeStyles,
  generateUrgencyPresets,
} from "../urgencyEngine";
import { ProductSpec } from "@/lib/types/ecommerce";

describe("urgencyEngine", () => {
  describe("computeFrameCountdown", () => {
    it("computes exact initial hours, minutes, seconds, and centiseconds at frame 0", () => {
      const countdown = computeFrameCountdown(7200, 0, 30, true);
      expect(countdown.hours).toBe(2);
      expect(countdown.minutes).toBe(0);
      expect(countdown.seconds).toBe(0);
      expect(countdown.hoursStr).toBe("02");
      expect(countdown.minutesStr).toBe("00");
      expect(countdown.secondsStr).toBe("00");
      expect(countdown.formattedClock).toContain("02:00:00");
    });

    it("decrements deterministically as frames advance", () => {
      // 90 frames at 30fps = 3.0 seconds elapsed
      const countdown = computeFrameCountdown(7200, 90, 30, true);
      expect(countdown.hours).toBe(1);
      expect(countdown.minutes).toBe(59);
      expect(countdown.seconds).toBe(57);
      expect(countdown.formattedClock).toContain("01:59:57");
    });

    it("clamps at 00:00:00 when time runs out", () => {
      const countdown = computeFrameCountdown(10, 600, 30, false);
      expect(countdown.hours).toBe(0);
      expect(countdown.minutes).toBe(0);
      expect(countdown.seconds).toBe(0);
      expect(countdown.formattedClock).toBe("00:00:00");
    });

    it("formats clock without milliseconds when showMilliseconds is false", () => {
      const countdown = computeFrameCountdown(3665, 0, 30, false);
      expect(countdown.formattedClock).toBe("01:01:05");
    });
  });

  describe("computeStockProgress", () => {
    it("computes remaining stock and claimed percentage", () => {
      const result = computeStockProgress({
        enabled: true,
        totalStock: 100,
        remainingStock: 15,
        lowStockThreshold: 20,
      });

      expect(result.remainingStock).toBe(15);
      expect(result.totalStock).toBe(100);
      expect(result.claimedPercentage).toBe(85);
      expect(result.isLowStock).toBe(true);
      expect(result.stockLabel).toContain("15 UNITS REMAINING");
    });

    it("triggers urgent warning label when 3 or fewer units remain", () => {
      const result = computeStockProgress({
        enabled: true,
        remainingStock: 2,
        totalStock: 50,
      });

      expect(result.stockLabel).toContain("ALMOST GONE: ONLY 2 LEFT!");
    });

    it("simulates dynamic inventory depletion during playback", () => {
      const scarcity = {
        enabled: true,
        totalStock: 50,
        remainingStock: 10,
        dynamicDepletion: true,
      };

      // Frame 0 (start of video)
      const start = computeStockProgress(scarcity, 0, 600);
      expect(start.remainingStock).toBe(10);

      // Frame 240 (40% of 600 frames: drop 1)
      const mid = computeStockProgress(scarcity, 240, 600);
      expect(mid.remainingStock).toBe(9);

      // Frame 480 (80% of 600 frames: drop 2)
      const end = computeStockProgress(scarcity, 480, 600);
      expect(end.remainingStock).toBe(8);
    });
  });

  describe("getUrgencyThemeStyles", () => {
    it("returns correct styles for neon_fire", () => {
      const styles = getUrgencyThemeStyles("neon_fire");
      expect(styles.primaryColor).toBe("#ef4444");
      expect(styles.iconSymbol).toBe("🔥");
      expect(styles.badgeLabel).toBe("FLASH SALE");
    });

    it("returns correct styles for cyber_amber", () => {
      const styles = getUrgencyThemeStyles("cyber_amber");
      expect(styles.primaryColor).toBe("#f59e0b");
      expect(styles.iconSymbol).toBe("⚡");
    });

    it("falls back to neon_fire for unknown theme", () => {
      const styles = getUrgencyThemeStyles("unknown" as any);
      expect(styles.primaryColor).toBe("#ef4444");
    });
  });

  describe("generateUrgencyPresets", () => {
    it("generates 4 curated urgency presets with computed discount", () => {
      const mockProduct: Partial<ProductSpec> = {
        price: 50,
        compareAtPrice: 100,
      };

      const presets = generateUrgencyPresets(mockProduct as ProductSpec);
      expect(presets.length).toBe(4);

      const flashSale = presets.find((p) => p.id === "flash_sale_tonight");
      expect(flashSale).toBeDefined();
      expect(flashSale?.config.headline).toContain("50% OFF");
      expect(flashSale?.config.theme).toBe("neon_fire");
      expect(flashSale?.config.stockScarcity?.dynamicDepletion).toBe(true);
    });
  });
});
