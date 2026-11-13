import { describe, it, expect } from "vitest";
import { chainLatentBetweenStages } from "../workflowMutator";

describe("chainLatentBetweenStages (Task QA-5)", () => {
  it("should connect source KSampler latent output directly to target KSampler latent_image input", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "KSampler", inputs: { latent_image: ["7", 0] } },
      "88": { class_type: "KSampler", inputs: { latent_image: ["1", 0] } }
    };

    const success = chainLatentBetweenStages(workflow, "8", "88");

    expect(success).toBe(true);
    expect(workflow["88"].inputs.latent_image).toEqual(["8", 0]);
  });

  it("should return false if source KSampler node does not exist in workflow graph", () => {
    const workflow: Record<string, any> = {
      "88": { class_type: "KSampler", inputs: { latent_image: ["1", 0] } }
    };

    const success = chainLatentBetweenStages(workflow, "non_existent_node", "88");
    expect(success).toBe(false);
  });
});
