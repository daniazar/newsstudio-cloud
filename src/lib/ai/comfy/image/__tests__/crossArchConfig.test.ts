import { describe, it, expect } from "vitest";
import { getCrossArchStageConfig } from "../crossArchConfig";

describe("crossArchConfig (Task XA-1)", () => {
  it("should assign FLUX 16-channel VAE architecture to Stage 1 Environment", () => {
    const config = getCrossArchStageConfig(1);
    expect(config.architecture).toBe("FLUX");
    expect(config.vaeChannelCount).toBe(16);
    expect(config.requiresVaeBridge).toBe(true);
  });

  it("should assign PONY 4-channel VAE architecture to Stage 3 Primary Persona", () => {
    const config = getCrossArchStageConfig(3);
    expect(config.architecture).toBe("PONY");
    expect(config.vaeChannelCount).toBe(4);
    expect(config.requiresVaeBridge).toBe(false);
  });

  it("should assign SDXL architecture to Stage 5 FaceDetailer", () => {
    const config = getCrossArchStageConfig(5);
    expect(config.architecture).toBe("SDXL");
  });
});
