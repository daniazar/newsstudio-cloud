import { describe, it, expect } from "vitest";
import { getStageNoiseType, injectNoiseLatentTypeNode } from "../noiseLatentSelector";

describe("noiseLatentSelector (Task XA-8)", () => {
  it("should assign fractal noise to Stage 1 Environment", () => {
    const config = getStageNoiseType(1);
    expect(config.noiseType).toBe("fractal");
  });

  it("should assign directional noise to Stage 3 Primary Persona", () => {
    const config = getStageNoiseType(3);
    expect(config.noiseType).toBe("directional");
  });

  it("should inject LatentNoise node into workflow graph", () => {
    const workflow: Record<string, any> = {};

    const success = injectNoiseLatentTypeNode(workflow, 1);

    expect(success).toBe(true);
    expect(workflow["structured_latent_noise"]).toBeDefined();
    expect(workflow["structured_latent_noise"].inputs.noise_type).toBe("fractal");
  });
});
