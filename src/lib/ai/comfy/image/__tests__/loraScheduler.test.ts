import { describe, it, expect } from "vitest";
import { classifyLoraCategory, getStageLoraStrengthFactor, applyPerStageLoraScheduling } from "../loraScheduler";
import { LoraConfig } from "../loraManager";

describe("loraScheduler (Task PR-4)", () => {
  it("should classify LoRA adapter categories correctly", () => {
    expect(classifyLoraCategory("ruby_vance_v2.safetensors")).toBe("character");
    expect(classifyLoraCategory("cinematic_moody_style.safetensors")).toBe("style");
    expect(classifyLoraCategory("add-detail-xl.safetensors")).toBe("photorealism");
  });

  it("should turn off character LoRAs during Stage 1 and Stage 2", () => {
    expect(getStageLoraStrengthFactor(1, "character")).toBe(0.0);
    expect(getStageLoraStrengthFactor(2, "character")).toBe(0.0);
    expect(getStageLoraStrengthFactor(3, "character")).toBe(1.0);
  });

  it("should apply scheduled strength factor to workflow LoraLoader nodes", () => {
    const loras: LoraConfig[] = [
      { name: "ruby_vance_v2.safetensors", strength: 1.0 }
    ];
    const workflow: Record<string, any> = {
      "dynamic_lora_1": { inputs: { strength_model: 1.0, strength_clip: 1.0 } }
    };

    const scheduled = applyPerStageLoraScheduling(workflow, 1, loras);
    expect(scheduled[0].strength).toBe(0.0);
    expect(workflow["dynamic_lora_1"].inputs.strength_model).toBe(0.0);
  });
});
