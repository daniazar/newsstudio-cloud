import { describe, it, expect } from "vitest";
import { generateI2VClip } from "../i2vPipeline";

describe("i2vPipeline (Task QX-13)", () => {
  it("should generate I2V clip spec with 72 frames for 3s @ 24fps", () => {
    const res = generateI2VClip("/tmp/keyframe.png", "cogvideox_5b", 3);

    expect(res.durationSec).toBe(3);
    expect(res.fps).toBe(24);
    expect(res.totalFrameCount).toBe(72);
    expect(res.outputVideoPath).toContain("keyframe_i2v.mp4");
  });
});
