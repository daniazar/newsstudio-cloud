/**
 * src/lib/ai/comfy/image/modeCFGTable.ts
 *
 * Task SW-7 (IMAGE_ROADMAP.md Part 17).
 * Mode-Aware Per-Stage CFG Scale Table Engine.
 * Resolves optimal CFG scale per stage based on ContentMode (SFW, NSFW_SOFT, NSFW_EXPLICIT),
 * applying lower CFG in explicit mode to prevent anatomy distortion.
 */

import { ContentMode } from "./contentMode";
import { comfyLog } from "../api";

export interface ModeCFGResult {
  stageIndex: number;
  contentMode: ContentMode;
  cfgScale: number;
}

/**
 * Task SW-7: Resolves mode-aware CFG scale for a given stage index.
 */
export function getStageModeCFG(stageIndex: number, contentMode: ContentMode): ModeCFGResult {
  let cfgScale = 5.0;

  switch (stageIndex) {
    case 1:
      cfgScale = contentMode === "NSFW_EXPLICIT" ? 6.5 : 7.0;
      break;
    case 3:
      cfgScale = contentMode === "NSFW_EXPLICIT" ? 5.5 : contentMode === "NSFW_SOFT" ? 6.0 : 6.5;
      break;
    case 3.5:
      cfgScale = contentMode === "NSFW_EXPLICIT" ? 4.5 : 5.5;
      break;
    case 5:
      cfgScale = contentMode === "NSFW_EXPLICIT" ? 4.5 : 5.0;
      break;
    case 6:
      cfgScale = contentMode === "NSFW_EXPLICIT" ? 4.0 : 4.5;
      break;
    default:
      cfgScale = contentMode === "NSFW_EXPLICIT" ? 4.5 : 5.0;
  }

  comfyLog(`[ModeCFGTable] 🎚️ Resolved Stage ${stageIndex} CFG scale for ${contentMode}: ${cfgScale}`);

  return {
    stageIndex,
    contentMode,
    cfgScale
  };
}
