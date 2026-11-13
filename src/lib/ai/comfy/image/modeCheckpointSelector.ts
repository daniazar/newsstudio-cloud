/**
 * src/lib/ai/comfy/image/modeCheckpointSelector.ts
 *
 * Task SW-2 (IMAGE_ROADMAP.md Part 17).
 * Mode-Aware Checkpoint Model Selection Engine.
 * Resolves optimal checkpoint model per stage based on ContentMode (SFW, NSFW_SOFT, NSFW_EXPLICIT).
 */

import { ContentMode } from "./contentMode";
import { comfyLog } from "../api";

export interface ModeCheckpointResult {
  stageIndex: number;
  contentMode: ContentMode;
  checkpointName: string;
  reasoning: string;
}

/**
 * Task SW-2: Resolves stage-appropriate checkpoint model based on contentMode.
 */
export function resolveCheckpointForStageMode(
  stageIndex: number,
  contentMode: ContentMode
): ModeCheckpointResult {
  if (stageIndex === 3) {
    if (contentMode === "NSFW_EXPLICIT") {
      comfyLog(`[ModeCheckpointSelector] 🎯 Stage 3 (NSFW_EXPLICIT) -> Selected Pony explicit checkpoint: cyberrealisticPony_v180Coreshift.safetensors`);
      return {
        stageIndex: 3,
        contentMode,
        checkpointName: "cyberrealisticPony_v180Coreshift.safetensors",
        reasoning: "Pony-based model required for explicit anatomical accuracy"
      };
    }
    if (contentMode === "NSFW_SOFT") {
      comfyLog(`[ModeCheckpointSelector] 🎯 Stage 3 (NSFW_SOFT) -> Selected CyberRealisticXL suggestive checkpoint: cyberrealisticXL_v3.safetensors`);
      return {
        stageIndex: 3,
        contentMode,
        checkpointName: "cyberrealisticXL_v3.safetensors",
        reasoning: "Photorealistic SDXL model with soft unlocker LoRA"
      };
    }
    comfyLog(`[ModeCheckpointSelector] 🎯 Stage 3 (SFW) -> Selected RealVisXL editorial checkpoint: realvisxl_v50.safetensors`);
    return {
      stageIndex: 3,
      contentMode,
      checkpointName: "realvisxl_v50.safetensors",
      reasoning: "Trained on clean photographic data for editorial quality"
    };
  }

  if (stageIndex === 5 || stageIndex === 6) {
    comfyLog(`[ModeCheckpointSelector] 🎯 Stage ${stageIndex} -> Selected CyberRealisticXL face/hand photorealism checkpoint`);
    return {
      stageIndex,
      contentMode,
      checkpointName: "cyberrealisticXL_v3.safetensors",
      reasoning: "FaceDetailer uses SFW-quality photorealism across all content modes"
    };
  }

  return {
    stageIndex,
    contentMode,
    checkpointName: "cyberrealisticPony_v180Coreshift.safetensors",
    reasoning: "Default multi-pass checkpoint"
  };
}
