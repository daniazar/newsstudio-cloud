import { describe, it, expect } from "vitest";
import { encodeGenerationProvenance, decodeGenerationProvenance } from "../steganographicProvenance";

describe("steganographicProvenance (Task EX-11)", () => {
  it("should encode and decode invisible LSB generation provenance", () => {
    const originalProv = {
      personaId: "ruby",
      sessionId: "session_test",
      seed: 3001,
      checkpointHash: "sha256_d58a12bc8f42",
      loraStack: ["Boreal-SDXL-v2.safetensors"],
      pipelineVersion: "6-stage-v2.3",
      timestamp: new Date().toISOString()
    };

    const encoded = encodeGenerationProvenance("/tmp/output.png", originalProv);
    expect(encoded).toBe(true);

    const decoded = decodeGenerationProvenance("/tmp/output.png");
    expect(decoded.personaId).toBe("ruby");
    expect(decoded.seed).toBe(3001);
  });
});
