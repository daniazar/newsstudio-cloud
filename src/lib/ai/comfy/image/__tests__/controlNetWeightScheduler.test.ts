import { describe, it, expect } from "vitest";
import { injectControlNetWeightSchedule } from "../controlNetWeightScheduler";

describe("controlNetWeightScheduler (Task EX-5)", () => {
  it("should inject scheduled ControlNetApplyAdvanced node into workflow graph", () => {
    const workflow: Record<string, any> = {};

    const injected = injectControlNetWeightSchedule(workflow, { startPercent: 0.0, endPercent: 0.8, strength: 0.85 });

    expect(injected).toBe(true);
    expect(workflow["scheduled_control_net"]).toBeDefined();
    expect(workflow["scheduled_control_net"].inputs.end_percent).toBe(0.8);
  });
});
