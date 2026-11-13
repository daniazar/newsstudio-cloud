import { describe, it, expect } from "vitest";
import { StageFactory } from "../stages/stageFactory";
import { EnvironmentStage } from "../stages/environmentStage";
import { PropsStage } from "../stages/propsStage";
import { PersonaStage } from "../stages/personaStage";
import { RelightingStage } from "../stages/relightingStage";
import { DetailerStage } from "../stages/detailerStage";

describe("StageFactory Unit Tests", () => {
  it("should instantiate EnvironmentStage for stageIndex 1", () => {
    const stage = StageFactory.createStage(1);
    expect(stage).toBeInstanceOf(EnvironmentStage);
    expect(stage.stageIndex).toBe(1);
  });

  it("should instantiate PropsStage for stageIndex 2", () => {
    const stage = StageFactory.createStage(2);
    expect(stage).toBeInstanceOf(PropsStage);
    expect(stage.stageIndex).toBe(2);
  });

  it("should instantiate PersonaStage for stageIndex 3", () => {
    const stage = StageFactory.createStage(3, "Primary Persona Insertion", 0, 1);
    expect(stage).toBeInstanceOf(PersonaStage);
    expect(stage.stageIndex).toBe(3);
  });

  it("should instantiate RelightingStage for stageIndex 4", () => {
    const stage = StageFactory.createStage(4);
    expect(stage).toBeInstanceOf(RelightingStage);
    expect(stage.stageIndex).toBe(4);
  });

  it("should instantiate DetailerStage for stageIndex 5", () => {
    const stage = StageFactory.createStage(5);
    expect(stage).toBeInstanceOf(DetailerStage);
    expect(stage.stageIndex).toBe(5);
  });

  it("should throw error for unsupported stage index", () => {
    expect(() => StageFactory.createStage(99)).toThrowError(/Unsupported pipeline stage index/);
  });
});
