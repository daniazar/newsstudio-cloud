import { describe, it, expect } from "vitest";
import { calibrateColorTemperature } from "../colorTempCalibrator";

describe("colorTempCalibrator (Task XA-7)", () => {
  it("should generate warm amber skin tone tags for 3800K environment", () => {
    const res = calibrateColorTemperature(3800);

    expect(res.isWarmTone).toBe(true);
    expect(res.promptTag).toContain("warm amber skin tone");
  });

  it("should generate cool daylight skin tone tags for 6500K environment", () => {
    const res = calibrateColorTemperature(6500);

    expect(res.isWarmTone).toBe(false);
    expect(res.promptTag).toContain("cool daylight skin tone");
  });
});
