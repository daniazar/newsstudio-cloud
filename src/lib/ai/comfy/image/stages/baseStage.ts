/**
 * src/lib/ai/comfy/image/stages/baseStage.ts
 *
 * Base interface and context definitions for Multi-Pass Pipeline Stage Strategies (Part 10 — IMAGE_ROADMAP.md).
 * Implements Strategy Pattern for modular, single-responsibility pipeline stages.
 */

import { StageConfig, StageResult } from "../../types";
import { LoraConfig } from "../loraManager";

export interface PipelineContext {
  masterSeed: number;
  personaKey: string;
  partnerPersonaKey?: string;
  unetName: string;
  modelChoice: string;
  width: number;
  height: number;
  activeLoras: LoraConfig[];
  faceReferenceAbsPath?: string | string[];
  referenceImageAbsPath?: string;
  negativePromptText?: string;
  promptText: string;
  sceneModifiers?: string;
  cacheDir: string;
  outputDir: string;
  isNsfw: boolean;
  currentInputImagePath?: string;
  depthMapPath?: string;
}

export interface PipelineStage {
  readonly stageIndex: number;
  readonly stageName: string;
  execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult>;
}
