import { describe, it, expect } from "vitest";
import { comfyGenerationLock } from "../generationLock";

describe("GenerationLock (Concurrency Shield)", () => {
  it("should serialize concurrent execution jobs", async () => {
    const executionOrder: string[] = [];

    const job1 = comfyGenerationLock.withLock("job-1", async () => {
      executionOrder.push("job-1-start");
      await new Promise((r) => setTimeout(r, 50));
      executionOrder.push("job-1-end");
    });

    const job2 = comfyGenerationLock.withLock("job-2", async () => {
      executionOrder.push("job-2-start");
      await new Promise((r) => setTimeout(r, 20));
      executionOrder.push("job-2-end");
    });

    await Promise.all([job1, job2]);

    expect(executionOrder).toEqual([
      "job-1-start",
      "job-1-end",
      "job-2-start",
      "job-2-end",
    ]);
  });

  it("should report idle status after jobs complete", () => {
    const status = comfyGenerationLock.getStatus();
    expect(status.isLocked).toBe(false);
    expect(status.currentJobId).toBe(null);
    expect(status.queueLength).toBe(0);
  });
});
