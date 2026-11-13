import { describe, it, expect } from "vitest";
import { applyFilmGrainPass } from "../filmGrainCompositor";

describe("filmGrainCompositor (Task EV-9)", () => {
  it("should composite photographic film grain for SFW mode", () => {
    const res = applyFilmGrainPass("/tmp/ruby_final.png", "SFW");

    expect(res.applied).toBe(true);
    expect(res.config.isoSimulation).toBe(800);
    expect(res.durationMs).toBeLessThan(50);
  });

  it("should skip film grain pass for NSFW_EXPLICIT mode", () => {
    const res = applyFilmGrainPass("/tmp/ruby_explicit.png", "NSFW_EXPLICIT");

    expect(res.applied).toBe(false);
  });
});
