import { describe, it, expect } from "vitest";
import { validateScenePhysicalContinuity } from "../physicsValidator";

describe("physicsValidator (Task QX-11)", () => {
  it("should execute 5 physical continuity checks and return overall pass status", () => {
    const res = validateScenePhysicalContinuity("/tmp/output.png", "/tmp/ic_light.png");

    expect(res.checks.length).toBe(5);
    expect(res.overallPassed).toBe(true);
    expect(res.failedCheckCount).toBe(0);
  });
});
