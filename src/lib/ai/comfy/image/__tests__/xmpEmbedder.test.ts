import { describe, it, expect } from "vitest";
import { formatXMPMetadataString, parseXMPMetadataString, GenerationMetadataPayload } from "../xmpEmbedder";

describe("xmpEmbedder (Task EX-10)", () => {
  it("should format metadata into XMP string and parse it back accurately", () => {
    const payload: GenerationMetadataPayload = {
      masterSeed: 1234567,
      pipelineMode: "SEQUENTIAL",
      contentMode: "NSFW_EXPLICIT",
      stageCount: 6,
      personaKey: "ruby",
      prompts: { stage1: "newsroom" },
      loras: [{ name: "ruby.safetensors", strength: 1.0 }],
      generatedAt: new Date().toISOString()
    };

    const xml = formatXMPMetadataString(payload);
    expect(xml).toContain("x:xmpmeta");
    expect(xml).toContain("newsstudio:GenerationState");

    const restored = parseXMPMetadataString(xml);
    expect(restored).not.toBeNull();
    expect(restored?.masterSeed).toBe(1234567);
    expect(restored?.contentMode).toBe("NSFW_EXPLICIT");
    expect(restored?.personaKey).toBe("ruby");
  });
});
