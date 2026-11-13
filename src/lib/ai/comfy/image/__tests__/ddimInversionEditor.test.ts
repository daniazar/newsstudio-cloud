import { describe, it, expect } from "vitest";
import { performDDIMSurgicalEdit } from "../ddimInversionEditor";

describe("ddimInversionEditor (Task EX-1)", () => {
  it("should perform DDIM inversion surgical edit at 0.25 denoise strength", () => {
    const res = performDDIMSurgicalEdit("/tmp/image.png", "/tmp/mask.png", "fix iris detail");

    expect(res.denoiseStrength).toBe(0.25);
    expect(res.promptFix).toBe("fix iris detail");
    expect(res.outputImagePath).toContain("image_surgical_edit.png");
  });
});
