import { describe, it, expect } from "vitest";
import { isInpaintStage, resolveStageCheckpointModel } from "../inpaintModelSelector";

describe("inpaintModelSelector (Task EX-5)", () => {
  it("should identify inpaint stages correctly", () => {
    expect(isInpaintStage(1)).toBe(false);
    expect(isInpaintStage(3)).toBe(true);
    expect(isInpaintStage(5)).toBe(true);
  });

  it("should auto-append _inpaint variant for Stage 3", () => {
    const res = resolveStageCheckpointModel("cyberrealisticXL_v3.safetensors", 3);
    expect(res.checkpointName).toBe("cyberrealisticXL_v3_inpaint.safetensors");
    expect(res.isInpaintVariant).toBe(true);
  });

  it("should preserve base model for Stage 1", () => {
    const res = resolveStageCheckpointModel("cyberrealisticXL_v3.safetensors", 1);
    expect(res.checkpointName).toBe("cyberrealisticXL_v3.safetensors");
    expect(res.isInpaintVariant).toBe(false);
  });
});
