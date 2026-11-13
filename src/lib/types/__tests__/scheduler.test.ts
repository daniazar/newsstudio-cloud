import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getNextRunEstimate, CRON_PRESETS, cronToHumanLabel } from "../scheduler";

describe("scheduler", () => {
  describe("getNextRunEstimate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 1 hour from now for invalid cron expressions", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
      const estimate = getNextRunEstimate("invalid cron");
      expect(estimate.toISOString()).toBe("2024-01-01T13:00:00.000Z");
    });

    describe("Daily at specific hour (e.g. 0 9 * * *)", () => {
      it("should schedule for tomorrow if target hour has passed", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("0 9 * * *");
        expect(estimate.toISOString()).toBe("2024-01-02T09:00:00.000Z");
      });

      it("should schedule for today if target hour is in the future", () => {
        vi.setSystemTime(new Date("2024-01-01T08:00:00Z"));
        const estimate = getNextRunEstimate("0 9 * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T09:00:00.000Z");
      });

      it("should schedule for tomorrow if it is currently exactly the target hour", () => {
        vi.setSystemTime(new Date("2024-01-01T09:00:00Z"));
        const estimate = getNextRunEstimate("0 9 * * *");
        expect(estimate.toISOString()).toBe("2024-01-02T09:00:00.000Z");
      });
    });

    describe("Interval minutes (e.g. */15 * * * *)", () => {
      it("should schedule to the next interval if time is between intervals", () => {
        vi.setSystemTime(new Date("2024-01-01T12:05:00Z"));
        const estimate = getNextRunEstimate("*/15 * * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T12:15:00.000Z");
      });

      it("should schedule to the next interval if time is exactly on an interval", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("*/15 * * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T12:15:00.000Z");
      });

      it("should rollover to the next hour correctly", () => {
        vi.setSystemTime(new Date("2024-01-01T12:55:00Z"));
        const estimate = getNextRunEstimate("*/15 * * * *");
        // Math.ceil(55 / 15) * 15 = 4 * 15 = 60
        // Setting minutes to 60 rolls over to next hour
        expect(estimate.toISOString()).toBe("2024-01-01T13:00:00.000Z");
      });
    });

    describe("Interval hours (e.g. 0 */3 * * *)", () => {
      it("should schedule to the next interval if time is between intervals", () => {
        vi.setSystemTime(new Date("2024-01-01T13:00:00Z"));
        const estimate = getNextRunEstimate("0 */3 * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T15:00:00.000Z");
      });

      it("should schedule to the next interval if time is exactly on an interval", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("0 */3 * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T15:00:00.000Z");
      });

      it("should rollover to the next day correctly", () => {
        vi.setSystemTime(new Date("2024-01-01T23:00:00Z"));
        const estimate = getNextRunEstimate("0 */3 * * *");
        // Math.ceil(23 / 3) * 3 = 8 * 3 = 24
        // Setting hours to 24 rolls over to next day
        expect(estimate.toISOString()).toBe("2024-01-02T00:00:00.000Z");
      });
    });

    describe("Unsupported / complex expressions", () => {
      it("should parse 0 0 1 * * as daily at 0 hour (due to matching '0' and /^\d{1,2}$/)", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("0 0 1 * *"); // First of every month
        // Since hour is '0', it matches Daily at specific hour pattern!
        expect(estimate.toISOString()).toBe("2024-01-02T00:00:00.000Z");
      });

      it("should parse 0 9 * * 1-5 as daily at 9 hour (due to matching '0' and /^\d{1,2}$/)", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("0 9 * * 1-5"); // Weekdays
        // Since hour is '9', it matches Daily at specific hour pattern!
        expect(estimate.toISOString()).toBe("2024-01-02T09:00:00.000Z");
      });

      it("should return 1 hour from now for actually unsupported pattern like * * * * *", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("* * * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T13:00:00.000Z");
      });

      it("should handle malformed interval strings gracefully and fallback", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("*/abc * * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T13:00:00.000Z"); // Should ideally not crash and use a fallback or NaN logic
      });

      it("should handle malformed hour interval strings gracefully and fallback", () => {
        vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
        const estimate = getNextRunEstimate("0 */abc * * *");
        expect(estimate.toISOString()).toBe("2024-01-01T13:00:00.000Z"); // Fallback
      });
    });
  });

  describe("CRON_PRESETS and cronToHumanLabel", () => {
    it("should define valid CRON_PRESETS", () => {
      expect(Array.isArray(CRON_PRESETS)).toBe(true);
      expect(CRON_PRESETS.length).toBeGreaterThan(0);
      CRON_PRESETS.forEach((preset) => {
        expect(typeof preset.label).toBe("string");
        expect(typeof preset.expression).toBe("string");
        expect(typeof preset.description).toBe("string");
        expect(preset.expression.split(" ").length).toBe(5);
      });
    });

    it("should contain expected default presets", () => {
      const labels = CRON_PRESETS.map((p) => p.label);
      expect(labels).toContain("Every hour");
      expect(labels).toContain("Daily at 9 AM");
      expect(labels).toContain("Daily at 6 PM");
      expect(labels).toContain("Twice daily (9 AM & 6 PM)");
      expect(labels).toContain("Weekdays at 8 AM");
    });

    it("should map every preset expression to its label via cronToHumanLabel", () => {
      CRON_PRESETS.forEach((preset) => {
        expect(cronToHumanLabel(preset.expression)).toBe(preset.label);
      });
    });

    it("should format cron expressions to human labels accurately", () => {
      expect(cronToHumanLabel("0 * * * *")).toBe("Every hour");
      expect(cronToHumanLabel("0 9 * * *")).toBe("Daily at 9 AM");
      expect(cronToHumanLabel("*/15 * * * *")).toBe("Every 15 minutes");
      expect(cronToHumanLabel("0 */2 * * *")).toBe("Every 2 hours");
      expect(cronToHumanLabel("0 14 * * *")).toBe("Daily at 2:00 PM");
      expect(cronToHumanLabel("0 0 * * *")).toBe("Daily at 12:00 AM");
      expect(cronToHumanLabel("0 12 * * *")).toBe("Daily at 12:00 PM");
      expect(cronToHumanLabel("0 14 * * 1-5")).toBe("Weekdays at 2:00 PM");
      expect(cronToHumanLabel("0 9 * * 0,6")).toBe("Weekends at 9:00 AM");
      expect(cronToHumanLabel("0 8 * * 1")).toBe("Mon at 8:00 AM");
      expect(cronToHumanLabel("0 8 * * 0")).toBe("Sun at 8:00 AM");
      expect(cronToHumanLabel("0 8 * * 2")).toBe("Tue at 8:00 AM");
      expect(cronToHumanLabel("0 8 * * 3")).toBe("Wed at 8:00 AM");
      expect(cronToHumanLabel("0 8 * * 4")).toBe("Thu at 8:00 AM");
      expect(cronToHumanLabel("0 8 * * 5")).toBe("Fri at 8:00 AM");
      expect(cronToHumanLabel("0 8 * * 6")).toBe("Sat at 8:00 AM");
      expect(cronToHumanLabel("0 12 * * 1")).toBe("Mon at 12:00 PM");
      expect(cronToHumanLabel("0 0 * * 1")).toBe("Mon at 12:00 AM");
      expect(cronToHumanLabel("0 9 * * 7")).toBe("Day 7 at 9:00 AM");
      expect(cronToHumanLabel("0 23 * * *")).toBe("Daily at 11:00 PM");
      expect(cronToHumanLabel("1 2 3 4 5")).toBe("1 2 3 4 5");
      expect(cronToHumanLabel("invalid")).toBe("invalid");
      expect(cronToHumanLabel("* * * * *")).toBe("* * * * *");
      expect(cronToHumanLabel("")).toBe("");
    });
  });
});

