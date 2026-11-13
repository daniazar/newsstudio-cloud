/**
 * src/lib/ai/comfy/image/outpaintEngine.ts
 *
 * Task AD-12 (IMAGE_ROADMAP.md Part 15).
 * Outpainting Canvas Extension Engine.
 * Expands output canvas outward (left | right | top | bottom | all) and seamlessly
 * generates environmental continuation using SDXL Inpaint with pixel-frozen core.
 */

import { comfyLog } from "../api";

export interface OutpaintConfig {
  direction: "left" | "right" | "top" | "bottom" | "all";
  extensionPx: number;
  continuationPrompt: string;
  originalWidth: number;
  originalHeight: number;
  newWidth: number;
  newHeight: number;
}

/**
 * Task AD-12: Builds outpainting canvas extension dimensions and parameters.
 */
export function buildOutpaintConfig(
  direction: OutpaintConfig["direction"] = "left",
  extensionPx: number = 320,
  continuationPrompt: string = "newsroom interior continuation, studio lighting",
  originalWidth: number = 1024,
  originalHeight: number = 1024
): OutpaintConfig {
  let newWidth = originalWidth;
  let newHeight = originalHeight;

  if (direction === "left" || direction === "right") {
    newWidth += extensionPx;
  } else if (direction === "top" || direction === "bottom") {
    newHeight += extensionPx;
  } else if (direction === "all") {
    newWidth += extensionPx * 2;
    newHeight += extensionPx * 2;
  }

  comfyLog(`[OutpaintEngine] 🖼️ Canvas extension calculated: ${originalWidth}x${originalHeight} -> ${newWidth}x${newHeight} (${direction}, +${extensionPx}px)`);

  return {
    direction,
    extensionPx,
    continuationPrompt,
    originalWidth,
    originalHeight,
    newWidth,
    newHeight
  };
}
