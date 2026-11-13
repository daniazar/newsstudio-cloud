/**
 * src/lib/ai/comfy/image/booruScorePrefix.ts
 *
 * Task SW-5 (IMAGE_ROADMAP.md Part 17).
 * Booru Score/Rating Prefix Selector Engine.
 * Auto-selects score_9 / rating_safe vs rating_questionable vs rating_explicit prefixes
 * per ContentMode for Pony-family conditioning.
 */

import { ContentMode } from "./contentMode";
import { comfyLog } from "../api";

export interface BooruScorePrefixResult {
  contentMode: ContentMode;
  prefix: string;
  ratingTag: string;
}

/**
 * Task SW-5: Resolves Booru score and rating prefix string based on ContentMode.
 */
export function resolveScorePrefix(contentMode: ContentMode): BooruScorePrefixResult {
  let ratingTag = "rating_safe";
  if (contentMode === "NSFW_EXPLICIT") ratingTag = "rating_explicit";
  else if (contentMode === "NSFW_SOFT") ratingTag = "rating_questionable";

  const prefix = `score_9, score_8_up, score_7_up, ${ratingTag}, source_photo, photorealistic`;

  comfyLog(`[BooruScorePrefix] 🏷️ Resolved Booru rating prefix for ${contentMode}: "${ratingTag}"`);

  return {
    contentMode,
    prefix,
    ratingTag
  };
}
