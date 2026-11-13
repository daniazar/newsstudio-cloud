import { describe, it, expect } from "vitest";
import { buildEmotionalArcSchedule } from "../emotionalArc";

describe("emotionalArc (Task QX-12)", () => {
  it("should generate linearly interpolated parameter schedule across 5 shots", () => {
    const schedule = buildEmotionalArcSchedule("professional_to_intimate", 5);

    expect(schedule.totalShots).toBe(5);
    expect(schedule.schedule[0].colorTemperatureK).toBe(6200);
    expect(schedule.schedule[4].colorTemperatureK).toBe(2800);
    expect(schedule.schedule[0].focalLengthMM).toBe(85);
    expect(schedule.schedule[4].focalLengthMM).toBe(35);
  });
});
