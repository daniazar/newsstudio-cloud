/**
 * src/lib/ai/comfy/image/stages/stageFactory.ts
 *
 * Factory Pattern implementation for multi-pass pipeline stage strategy instantiation
 * (Part 10 & Part 11 — IMAGE_ROADMAP.md).
 * Encapsulates dynamic creation of EnvironmentStage, PropsStage, PersonaStage, FaceInpaintStage, RelightingStage, and DetailerStage.
 */

import { PipelineStage } from "./baseStage";
import { EnvironmentStage } from "./environmentStage";
import { PropsStage } from "./propsStage";
import { PersonaStage } from "./personaStage";
import { FaceInpaintStage } from "./faceInpaintStage";
import { RelightingStage } from "./relightingStage";
import { DetailerStage } from "./detailerStage";

import { WardrobeStage } from "./wardrobeStage";
import { ContactCoherenceStage } from "./contactCoherenceStage";
import { CompositionFramingStage } from "./compositionFramingStage";
import { HandDetailerStage } from "./handDetailerStage";
import { BgCompletionStage } from "./bgCompletionStage";
import { AlphaMattingStage } from "./alphaMattingStage";

export class StageFactory {
  /**
   * Instantiates the appropriate PipelineStage strategy for a given stage index.
   */
  static createStage(
    stageIndex: number,
    stageName?: string,
    personaIndex: number = 0,
    totalPersonas: number = 1
  ): PipelineStage {
    const sName = stageName || "";
    if (sName.toLowerCase().includes("alpha matting") || sName.toLowerCase().includes("background isolation") || sName.toLowerCase().includes("bria")) {
      return new AlphaMattingStage();
    }
    if (sName.toLowerCase().includes("face inpaint") || sName.toLowerCase().includes("pulid")) {
      return new FaceInpaintStage(stageName, personaIndex, totalPersonas);
    }
    if (sName.toLowerCase().includes("composition") || sName.toLowerCase().includes("framing")) {
      return new CompositionFramingStage();
    }
    if (sName.toLowerCase().includes("hand") || sName.toLowerCase().includes("finger")) {
      return new HandDetailerStage();
    }
    if (sName.toLowerCase().includes("background completion")) {
      return new BgCompletionStage();
    }
    if (sName.toLowerCase().includes("wardrobe") || sName.toLowerCase().includes("outfit")) {
      return new WardrobeStage();
    }
    if (sName.toLowerCase().includes("alpha matting") || sName.toLowerCase().includes("background isolation") || sName.toLowerCase().includes("bria")) {
      return new CompositionFramingStage();
    }

    switch (stageIndex) {
      case 0.5:
        return new CompositionFramingStage();
      case 1:
        return new EnvironmentStage();
      case 2:
        return new PropsStage();
      case 2.5:
        return new BgCompletionStage();
      case 3:
        return new PersonaStage(stageName || "Primary Persona Insertion", personaIndex, totalPersonas);
      case 3.2:
        return new WardrobeStage();
      case 3.5:
        return new ContactCoherenceStage();
      case 4:
        return new RelightingStage();
      case 5:
        return new DetailerStage();
      case 6:
      case 7:
        return new CompositionFramingStage();
      default:
        throw new Error(`[StageFactory] Unsupported pipeline stage index: ${stageIndex}`);
    }
  }
}
