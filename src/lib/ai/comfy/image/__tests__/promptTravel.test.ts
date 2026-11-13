import { describe, it, expect } from "vitest";
import { compile3PhasePromptTravelSchedule, injectPromptTravelSchedule } from "../promptTravel";

describe("promptTravel (Task PR-2)", () => {
  it("should compile 3-phase prompt travel step schedule accurately", () => {
    const sched = compile3PhasePromptTravelSchedule(28);

    expect(sched.layoutStepEnd).toBe(8);
    expect(sched.subjectStepEnd).toBe(20);
    expect(sched.scheduleMap[0]).toContain("establishing broadcast studio");
    expect(sched.scheduleMap[8]).toContain("female news presenter");
    expect(sched.scheduleMap[20]).toContain("photorealistic");
  });

  it("should inject CLIPTextEncodeSequence node into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: { positive: ["6", 0] } }
    };
    const sched = compile3PhasePromptTravelSchedule(28);
    const success = injectPromptTravelSchedule(workflow, sched, ["2", 1]);

    expect(success).toBe(true);
    expect(workflow["prompt_travel_schedule"]).toBeDefined();
    expect(workflow["prompt_travel_schedule"].class_type).toBe("CLIPTextEncodeSequence");
    expect(workflow["8"].inputs.positive).toEqual(["prompt_travel_schedule", 0]);
  });
});
