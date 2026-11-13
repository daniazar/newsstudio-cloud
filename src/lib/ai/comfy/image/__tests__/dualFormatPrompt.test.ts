import { describe, it, expect } from "vitest";
import { formatDualFormatPrompt, RawPromptSpec } from "../dualFormatPrompt";

describe("dualFormatPrompt (Task XA-4)", () => {
  const spec: RawPromptSpec = {
    subject: "female news anchor",
    environment: "modern broadcast newsroom studio",
    lighting: "intense studio led overhead lighting",
    tags: ["copper hair", "green eyes", "navy suit blazer"]
  };

  it("should format descriptive natural language paragraph for FLUX architecture", () => {
    const res = formatDualFormatPrompt("FLUX", spec);

    expect(res.architecture).toBe("FLUX");
    expect(res.formattedPrompt).toContain("A high quality photograph of female news anchor");
    expect(res.formattedPrompt).toContain("Shot on Canon EOS R5");
  });

  it("should format comma-separated Booru tags for PONY architecture", () => {
    const res = formatDualFormatPrompt("PONY", spec);

    expect(res.architecture).toBe("PONY");
    expect(res.formattedPrompt).toBe("female news anchor, modern broadcast newsroom studio, intense studio led overhead lighting, copper hair, green eyes, navy suit blazer");
  });
});
