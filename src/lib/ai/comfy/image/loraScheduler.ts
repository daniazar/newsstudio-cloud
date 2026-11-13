/**
 * src/lib/ai/comfy/image/loraScheduler.ts
 *
 * Task PR-4 (IMAGE_ROADMAP.md Part 13).
 * Per-Stage LoRA Strength Scheduling Engine.
 * Dynamically modulates character and style LoRA adapter weights across stages
 * to eliminate identity bleeding into background environments.
 */

import { comfyLog } from "../api";
import { LoraConfig } from "./loraManager";

export type LoraAdapterCategory = "character" | "style" | "photorealism" | "general";

export function classifyLoraCategory(loraName: string): LoraAdapterCategory {
  const lower = loraName.toLowerCase();
  if (lower.includes("ruby") || lower.includes("volt") || lower.includes("persona") || lower.includes("character")) {
    return "character";
  }
  if (lower.includes("style") || lower.includes("anime") || lower.includes("cinematic") || lower.includes("moody")) {
    return "style";
  }
  if (lower.includes("detail") || lower.includes("realism") || lower.includes("photo")) {
    return "photorealism";
  }
  return "general";
}

/**
 * Task PR-4: Resolves stage-appropriate strength factor for a given LoRA category.
 */
export function getStageLoraStrengthFactor(stageIndex: number, category: LoraAdapterCategory): number {
  switch (category) {
    case "character":
      switch (stageIndex) {
        case 1:
        case 2:
          return 0.0; // OFF during environment & props
        case 3:
          return 1.0; // Full strength during persona insertion
        case 3.2:
          return 0.5;
        case 3.5:
          return 0.4;
        case 4:
          return 0.3;
        case 5:
          return 0.75;
        case 6:
          return 0.0;
        default:
          return 1.0;
      }
    case "style":
      switch (stageIndex) {
        case 1:
          return 0.6;
        case 2:
          return 0.5;
        case 3:
          return 0.4;
        case 4:
          return 0.0; // OFF during relighting
        case 5:
          return 0.2;
        case 6:
          return 0.0;
        default:
          return 0.5;
      }
    case "photorealism":
      switch (stageIndex) {
        case 1:
          return 0.8;
        case 3:
          return 0.6;
        case 5:
          return 0.8;
        default:
          return 0.7;
      }
    default:
      return 1.0;
  }
}

import { ComfyWorkflow } from "../types";

/**
 * Applies per-stage LoRA strength scheduling to active LoRAs in workflow graph.
 */
export function applyPerStageLoraScheduling(
  workflow: ComfyWorkflow,
  stageIndex: number,
  activeLoras: LoraConfig[]
): LoraConfig[] {
  if (!activeLoras || activeLoras.length === 0) return [];

  const scheduledLoras = activeLoras.map(lora => {
    const category = classifyLoraCategory(lora.name);
    const factor = getStageLoraStrengthFactor(stageIndex, category);
    const scheduledStrength = Number((lora.strength * factor).toFixed(2));
    return {
      ...lora,
      strength: scheduledStrength
    };
  });

  // Mutate LoraLoader nodes in workflow graph
  activeLoras.forEach((lora, idx) => {
    const nodeKey = `dynamic_lora_${idx + 1}`;
    if (workflow[nodeKey] && workflow[nodeKey].inputs) {
      const category = classifyLoraCategory(lora.name);
      const factor = getStageLoraStrengthFactor(stageIndex, category);
      const scheduledStrength = Number((lora.strength * factor).toFixed(2));
      workflow[nodeKey].inputs.strength_model = scheduledStrength;
      workflow[nodeKey].inputs.strength_clip = scheduledStrength;
    }
  });

  comfyLog(`[LoraScheduler] 🎭 Applied Stage ${stageIndex} LoRA strength scheduling across ${activeLoras.length} adapter(s)`);
  return scheduledLoras;
}
