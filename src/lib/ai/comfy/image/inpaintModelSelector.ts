/**
 * src/lib/ai/comfy/image/inpaintModelSelector.ts
 *
 * Task EX-5 (IMAGE_ROADMAP.md Part 14).
 * Per-Stage Inpaint Checkpoint Auto-Selection Engine.
 * Automatically resolves dedicated inpaint checkpoint variants (_inpaint.safetensors) for inpainting stages
 * to eliminate seam artifacts at mask boundaries.
 */

import { comfyLog } from "../api";

export interface CheckpointResolutionResult {
  checkpointName: string;
  isInpaintVariant: boolean;
  stageIndex: number;
}

export function isInpaintStage(stageIndex: number): boolean {
  return [2, 2.5, 3, 3.2, 3.5, 5, 6].includes(stageIndex);
}

/**
 * Task EX-5: Resolves stage-appropriate checkpoint model name.
 */
export function resolveStageCheckpointModel(
  baseModelName: string,
  stageIndex: number
): CheckpointResolutionResult {
  const inpaintNeeded = isInpaintStage(stageIndex);

  if (inpaintNeeded && !baseModelName.includes("_inpaint")) {
    const ext = baseModelName.endsWith(".safetensors") ? ".safetensors" : ".ckpt";
    const rawName = baseModelName.replace(/\.(safetensors|ckpt)$/, "");
    const inpaintName = `${rawName}_inpaint${ext}`;

    comfyLog(`[InpaintModelSelector] 🎭 Stage ${stageIndex} auto-selected dedicated inpaint checkpoint: ${inpaintName}`);

    return {
      checkpointName: inpaintName,
      isInpaintVariant: true,
      stageIndex
    };
  }

  return {
    checkpointName: baseModelName,
    isInpaintVariant: baseModelName.includes("_inpaint"),
    stageIndex
  };
}
