import { describe, it, expect } from "vitest";
import { checkAndTriggerAutomatedLoraTraining } from "../automatedLoraTrainer";

describe("automatedLoraTrainer (Task EX-13)", () => {
  it("should trigger Kohya_ss training job and promote when dataset >= 50", () => {
    const res = checkAndTriggerAutomatedLoraTraining("ruby", Array(52).fill("/tmp/sample.png"));

    expect(res.thresholdReached).toBe(true);
    expect(res.trainingJobId).toContain("job_kohya_ruby");
    expect(res.promotedToPrimary).toBe(true);
  });

  it("should not trigger training when dataset < 50", () => {
    const res = checkAndTriggerAutomatedLoraTraining("ruby", Array(12).fill("/tmp/sample.png"));

    expect(res.thresholdReached).toBe(false);
    expect(res.trainingJobId).toBeUndefined();
  });
});
