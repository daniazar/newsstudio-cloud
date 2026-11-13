import { describe, it, expect } from "vitest";
import { filterLorasForStageArchitecture, StageLoraSpec } from "../stageLoraRegistry";

describe("stageLoraRegistry (Task XA-5)", () => {
  const candidates: StageLoraSpec[] = [
    { name: "boreal_flux.safetensors", strength: 0.5, compatibleArch: ["FLUX"] },
    { name: "ruby_pony.safetensors", strength: 0.8, compatibleArch: ["PONY"] },
    { name: "face_sdxl.safetensors", strength: 0.6, compatibleArch: ["SDXL"] }
  ];

  it("should keep only FLUX compatible LoRAs for Stage 1", () => {
    const res = filterLorasForStageArchitecture(1, "FLUX", candidates);

    expect(res.length).toBe(1);
    expect(res[0].name).toBe("boreal_flux.safetensors");
  });

  it("should keep only PONY compatible LoRAs for Stage 3", () => {
    const res = filterLorasForStageArchitecture(3, "PONY", candidates);

    expect(res.length).toBe(1);
    expect(res[0].name).toBe("ruby_pony.safetensors");
  });
});
