/**
 * src/lib/ai/comfy/image/stageLoraRegistry.ts
 *
 * Task XA-5 (IMAGE_ROADMAP.md Part 16).
 * Architecture-Specific LoRA Registry Engine.
 * Enforces architecture-LoRA compatibility matching FLUX LoRAs to Stage 1,
 * Pony LoRAs to Stage 2.5/3/3.5, and SDXL LoRAs to Stage 5/6.
 */

import { ArchitectureType } from "./crossArchConfig";
import { comfyLog } from "../api";

export interface StageLoraSpec {
  name: string;
  strength: number;
  compatibleArch: ArchitectureType[];
}

/**
 * Task XA-5: Filters candidate LoRA stack to enforce architecture compatibility for the target stage.
 */
export function filterLorasForStageArchitecture(
  stageIndex: number,
  architecture: ArchitectureType,
  loras: StageLoraSpec[]
): StageLoraSpec[] {
  const filtered = loras.filter(l => l.compatibleArch.includes(architecture));

  comfyLog(`[StageLoraRegistry] 🛡️ Stage ${stageIndex} (${architecture}) filtered ${filtered.length}/${loras.length} architecture-compatible LoRA(s)`);
  return filtered;
}
