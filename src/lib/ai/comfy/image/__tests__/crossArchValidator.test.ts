import { describe, it, expect } from "vitest";
import { validateCrossArchPipeline } from "../crossArchValidator";

describe("crossArchValidator (Task XA-12)", () => {
  it("should validate all 9 stages successfully for RUBY_SOLO scenario", () => {
    const res = validateCrossArchPipeline("RUBY_SOLO");

    expect(res.allStagesPassed).toBe(true);
    expect(res.stagesValidatedCount).toBe(9);
  });

  it("should validate DUAL_PERSONA_CONTACT scenario", () => {
    const res = validateCrossArchPipeline("DUAL_PERSONA_CONTACT");

    expect(res.allStagesPassed).toBe(true);
    expect(res.scenario).toBe("DUAL_PERSONA_CONTACT");
  });
});
