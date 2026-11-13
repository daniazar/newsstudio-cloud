import { describe, it, expect } from "vitest";
import { getStageScopedPrompt, SceneManifestSpec } from "../promptGranularity";

describe("promptGranularity (Task XA-9)", () => {
  const manifest: SceneManifestSpec = {
    environment: "modern broadcast newsroom",
    props: "anchor desk and microphone",
    persona: "female news anchor with copper hair and blazer",
    contact: "hands resting on desk",
    faceMicro: "perfect iris detail and skin pores"
  };

  it("should extract environmental prompt for Stage 1", () => {
    expect(getStageScopedPrompt(1, manifest)).toBe("modern broadcast newsroom");
  });

  it("should extract micro-face detail prompt for Stage 5", () => {
    expect(getStageScopedPrompt(5, manifest)).toBe("perfect iris detail and skin pores");
  });
});
