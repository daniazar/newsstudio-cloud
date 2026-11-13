/**
 * src/lib/ai/comfy/image/modeNegativeBuilder.ts
 *
 * Task SW-4 (IMAGE_ROADMAP.md Part 17).
 * Mode-Specific Negative Prompt Builder Engine.
 * Assembles mode-tuned negative prompts, strictly prohibiting "clothed/covered" tags
 * in NSFW_EXPLICIT mode to avoid prompt contradiction artifacts.
 */

import { ContentMode } from "./contentMode";
import { comfyLog } from "../api";

/**
 * Task SW-4: Assembles mode-tuned negative prompt string.
 */
export function buildModeNegativePrompt(contentMode: ContentMode, baseNegative: string = "bad anatomy, low quality, worst quality"): string {
  if (contentMode === "SFW") {
    const prompt = `nsfw, nudity, explicit, sexual, suggestive, revealing clothing, ${baseNegative}`;
    comfyLog(`[ModeNegativeBuilder] 🛡️ Assembled SFW negative prompt with explicit exclusion tags`);
    return prompt;
  }

  if (contentMode === "NSFW_SOFT") {
    const prompt = `fully nude, explicit sexual content, hardcore, ${baseNegative}`;
    comfyLog(`[ModeNegativeBuilder] 💋 Assembled NSFW_SOFT negative prompt`);
    return prompt;
  }

  // NSFW_EXPLICIT — NEVER add "clothed, covered, dressed, safe"
  comfyLog(`[ModeNegativeBuilder] 🔥 Assembled NSFW_EXPLICIT negative prompt (prohibited clothed/covered tags)`);
  return baseNegative;
}
