import { describe, it, expect } from "vitest";
import { injectRegionalPrompterNode } from "../regionalPrompter";

describe("regionalPrompter (Task EV-6)", () => {
  it("should inject RegionalPrompter node when contact intensity score < 15", () => {
    const workflow: Record<string, any> = {};

    const injected = injectRegionalPrompterNode(workflow, {
      zoneAPrompt: "female anchor on left",
      zoneBPrompt: "male anchor on right",
      splitRatio: "1:1",
      contactIntensityScore: 5
    });

    expect(injected).toBe(true);
    expect(workflow["regional_prompter"]).toBeDefined();
    expect(workflow["regional_prompter"].inputs.prompt_left).toBe("female anchor on left");
  });

  it("should block RegionalPrompter injection when contact intensity score >= 15", () => {
    const workflow: Record<string, any> = {};

    const injected = injectRegionalPrompterNode(workflow, {
      zoneAPrompt: "female anchor on left",
      zoneBPrompt: "male anchor on right",
      splitRatio: "1:1",
      contactIntensityScore: 40
    });

    expect(injected).toBe(false);
    expect(workflow["regional_prompter"]).toBeUndefined();
  });
});
