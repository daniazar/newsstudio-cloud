import { describe, it, expect } from "vitest";
import { compilePresenterPrompt } from "./promptCompiler";
import { type FullPreset } from "@/data/prompt_presets";

describe("promptCompiler", () => {
  const mockPreset: FullPreset = {
    name: "Social Network Preset",
    description: "Social Network Scenario description",
    category: "Social Network",
    medium: "photorealistic video",
    action: "At 0s: Model A sits cross-legged. At 2s: Model B stands to the left.",
    scenario: "A loft with Model A and Model B adjusting equipment.",
    lighting: "warm studio lights",
    color: "vibrant colors",
    soundEffects: "soft ambient buzz"
  };

  it("should replace Model A and Model B with primary and partner names in multi-persona scenarios", () => {
    const compiled = compilePresenterPrompt({
      personaDescription: "A fitness model named Blaze",
      preset: mockPreset,
      primaryName: "Blaze",
      partnerName: "Ruby",
      partnerDescription: "A news anchor named Ruby",
      interactionRole: "primary_dominant_partner_submissive"
    });

    // Verify Model A/B replacements inside the scenario description
    expect(compiled.positivePrompt).toContain("A loft with Blaze and Ruby adjusting equipment");
    
    // Verify Model A/B replacements inside the action/timeline descriptions
    expect(compiled.videoPrompt).toContain("[0-2] Blaze sits cross-legged");
    expect(compiled.videoPrompt).toContain("[2-4] Ruby stands to the left");
  });

  it("should filter out temporal timeline modifiers from the starting frame image prompt", () => {
    const compiled = compilePresenterPrompt({
      personaDescription: "A fitness model named Blaze",
      preset: mockPreset,
      primaryName: "Blaze",
      partnerName: "Ruby",
      partnerDescription: "A news anchor named Ruby",
      extraModifiers: ["At 4s: Model A whispers to Model B", "realistic skin"]
    });

    // The starting frame positivePrompt should not contain the timeline markers
    expect(compiled.positivePrompt).not.toContain("At 4s:");
    expect(compiled.positivePrompt).not.toContain("At 0s:");
    expect(compiled.positivePrompt).not.toContain("At 2s:");
    
    // But it should retain normal visual modifiers
    expect(compiled.positivePrompt).toContain("realistic skin");
  });
  it("should fix anatomical orientation for futanari generations", () => {
    const futaPreset: FullPreset = { ...mockPreset, scenario: "futanari" };
    const compiled = compilePresenterPrompt({
      personaDescription: "A fitness model named Blaze",
      preset: futaPreset,
      primaryName: "Blaze"
    });

    expect(compiled.positivePrompt).toContain("the testicles hang below the base of the shaft");
  });
});
