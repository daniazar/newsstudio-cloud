import { describe, it, expect } from "vitest";
import { resolveCheckpointForStageMode } from "../modeCheckpointSelector";

describe("modeCheckpointSelector (Task SW-2)", () => {
  it("should select RealVisXL for Stage 3 SFW mode", () => {
    const res = resolveCheckpointForStageMode(3, "SFW");
    expect(res.checkpointName).toBe("realvisxl_v50.safetensors");
  });

  it("should select CyberRealisticPony for Stage 3 NSFW_EXPLICIT mode", () => {
    const res = resolveCheckpointForStageMode(3, "NSFW_EXPLICIT");
    expect(res.checkpointName).toBe("cyberrealisticPony_v180Coreshift.safetensors");
  });

  it("should select CyberRealisticXL for Stage 5 FaceDetailer across all modes", () => {
    expect(resolveCheckpointForStageMode(5, "SFW").checkpointName).toBe("cyberrealisticXL_v3.safetensors");
    expect(resolveCheckpointForStageMode(5, "NSFW_EXPLICIT").checkpointName).toBe("cyberrealisticXL_v3.safetensors");
  });
});
