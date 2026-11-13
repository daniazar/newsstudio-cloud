import { describe, it, expect } from "vitest";
import { getStageSamplerAndScheduler, applyPerStageSamplerAndScheduler } from "../samplerScheduler";

describe("samplerScheduler (Task PR-1)", () => {
  it("should return optimal sampler and scheduler per stage index", () => {
    expect(getStageSamplerAndScheduler(1).samplerName).toBe("dpmpp_2m");
    expect(getStageSamplerAndScheduler(3).samplerName).toBe("dpmpp_2m_sde");
    expect(getStageSamplerAndScheduler(4).samplerName).toBe("ddim");
    expect(getStageSamplerAndScheduler(6).samplerName).toBe("uni_pc");
  });

  it("should mutate KSampler nodes in workflow graph with stage-specific sampler and scheduler", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: { sampler_name: "euler", scheduler: "normal" } }
    };

    const config = applyPerStageSamplerAndScheduler(workflow, 4);
    expect(config.samplerName).toBe("ddim");
    expect(workflow["8"].inputs.sampler_name).toBe("ddim");
    expect(workflow["8"].inputs.scheduler).toBe("ddim_uniform");
  });
});
