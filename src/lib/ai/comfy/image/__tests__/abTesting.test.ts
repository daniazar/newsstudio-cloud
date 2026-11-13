import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { runABTestExperiment } from "../abTesting";

describe("abTesting (Task AD-13)", () => {
  const testDir = path.join(process.cwd(), "scratch", "test_ab_runs");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should run A/B test suite and generate comparison markdown report card", () => {
    const report = runABTestExperiment({
      id: "pag_vs_cfg_test",
      description: "Testing PAG vs CFG Rescale at Stage 3",
      variable: "guidance_method",
      conditions: [
        { label: "CFG_6.0", params: { cfg: 6.0 } },
        { label: "PAG_6.0", params: { pag: 6.0 } }
      ],
      runsPerCondition: 3,
      outDir: testDir
    });

    expect(report.testId).toBe("pag_vs_cfg_test");
    expect(report.results.length).toBe(2);
    expect(report.markdownReport).toContain("A/B Test Experiment");
    expect(fs.existsSync(path.join(testDir, "pag_vs_cfg_test_report.md"))).toBe(true);
  });
});
