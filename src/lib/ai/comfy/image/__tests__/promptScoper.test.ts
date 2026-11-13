import { describe, it, expect } from "vitest";
import {
  scopePromptForStage1,
  scopePromptForStage2,
  compileEnvironmentPrompt,
  compilePropsPrompt,
  compileStage3PersonaPrompt
} from "../promptScoper";

describe("Prompt Scoper Unit Tests", () => {
  it("scopePromptForStage1 should strip persona names, physical features, clothing, and nudity", () => {
    const raw = "RubyVance, 34-year-old, green eyes, copper-red hair, wearing red silk dress, hotel bar, dim lighting, studio equipment";
    const scoped = scopePromptForStage1(raw, ["RubyVance"]);

    expect(scoped).not.toContain("RubyVance");
    expect(scoped).not.toContain("green eyes");
    expect(scoped).not.toContain("copper-red hair");
    expect(scoped).not.toContain("red silk dress");
    expect(scoped).toContain("hotel bar");
    expect(scoped).toContain("dim lighting");
    expect(scoped).toContain("studio equipment");
  });

  it("scopePromptForStage2 should preserve props and studio furniture while stripping body/persona traits", () => {
    const raw = "Ruby, voluptuous hourglass figure, seated at broadcast desk, holding microphone, professional newsroom studio background";
    const scoped = scopePromptForStage2(raw, ["Ruby"]);

    expect(scoped).not.toContain("Ruby");
    expect(scoped).not.toContain("voluptuous hourglass figure");
    expect(scoped).toContain("professional newsroom studio background");
  });

  it("compileEnvironmentPrompt should format clean Stage 1 environment prompts", () => {
    const compiled = compileEnvironmentPrompt("modern glass newsroom, blue LED accents", "Broadcast News Studio");

    expect(compiled).toContain("Broadcast News Studio");
    expect(compiled).toContain("modern glass newsroom");
    expect(compiled).toContain("blue LED accents");
  });

  it("compilePropsPrompt should format clean Stage 2 props prompts", () => {
    const compiled = compilePropsPrompt("desk counter, C-stands, softbox lighting", "Studio Equipment");

    expect(compiled).toContain("Studio Equipment");
    expect(compiled).toContain("desk counter");
    expect(compiled).toContain("C-stands");
  });

  it("compileStage3PersonaPrompt should compile clean single-subject persona prompts for Stage 3", () => {
    const compiled = compileStage3PersonaPrompt(
      "Ruby Vance",
      "34-year-old woman, green eyes, copper hair",
      "navy blue anchor blazer",
      false
    );

    expect(compiled).toContain("female news anchor");
    expect(compiled).toContain("34-year-old woman");
    expect(compiled).toContain("navy blue anchor blazer");
    expect(compiled).not.toContain("naked");
  });

  it("compileStage3PersonaPrompt should include uncensored tags when isNsfw is true", () => {
    const compiled = compileStage3PersonaPrompt(
      "Ruby Vance",
      "34-year-old woman, green eyes, copper hair",
      "standing",
      true
    );

    expect(compiled).toContain("female news anchor");
    expect(compiled).toContain("completely naked, fully nude, unclothed");
  });
});
