import { describe, it, expect } from "vitest";
import { performImagePromptArchaeology } from "../promptArchaeology";

describe("promptArchaeology (Task OB-9)", () => {
  it("should generate attribution report and return exceptional config saved path", () => {
    const report = performImagePromptArchaeology("/tmp/ruby_exceptional.png", "ruby");

    expect(report.attributionScore).toBeGreaterThanOrEqual(0.85);
    expect(report.keyDrivers.length).toBeGreaterThan(0);
    expect(report.configSavedPath).toContain("exceptional_configs");
  });
});
