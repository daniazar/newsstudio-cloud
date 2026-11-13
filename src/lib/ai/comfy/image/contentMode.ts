/**
 * src/lib/ai/comfy/image/contentMode.ts
 *
 * Task SW-1 (IMAGE_ROADMAP.md Part 17).
 * Content Mode Type Definition & CLI Parser Engine.
 * Defines 3-level content mode system (SFW, NSFW_SOFT, NSFW_EXPLICIT).
 */

import { comfyLog } from "../api";

export type ContentMode = "SFW" | "NSFW_SOFT" | "NSFW_EXPLICIT";

export function parseContentMode(input?: string): ContentMode {
  if (!input) return "SFW";

  const upper = input.toUpperCase().trim();
  if (upper === "NSFW_EXPLICIT" || upper === "EXPLICIT") {
    comfyLog(`[ContentMode] 🔥 Selected mode: NSFW_EXPLICIT`);
    return "NSFW_EXPLICIT";
  }
  if (upper === "NSFW_SOFT" || upper === "SOFT") {
    comfyLog(`[ContentMode] 💋 Selected mode: NSFW_SOFT`);
    return "NSFW_SOFT";
  }

  comfyLog(`[ContentMode] 🛡️ Selected mode: SFW (Editorial Photography)`);
  return "SFW";
}
