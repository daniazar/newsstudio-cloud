import { describe, it, expect } from "vitest";
import { getStageModeCFG } from "../modeCFGTable";

describe("modeCFGTable (Task SW-7)", () => {
  it("should return CFG 6.5 for Stage 3 SFW mode", () => {
    const res = getStageModeCFG(3, "SFW");
    expect(res.cfgScale).toBe(6.5);
  });

  it("should return CFG 5.5 for Stage 3 NSFW_EXPLICIT mode", () => {
    const res = getStageModeCFG(3, "NSFW_EXPLICIT");
    expect(res.cfgScale).toBe(5.5);
  });

  it("should return lower CFG 4.0 for Stage 6 HandDetailer in NSFW_EXPLICIT mode", () => {
    const res = getStageModeCFG(6, "NSFW_EXPLICIT");
    expect(res.cfgScale).toBe(4.0);
  });
});
