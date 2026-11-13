/**
 * src/lib/ai/comfy/image/contextNegativeInjector.ts
 *
 * Task QX-2 (IMAGE_ROADMAP.md Part 20).
 * Context-Aware Negative Prompt Injector Engine.
 * Auto-injects scene-specific environmental exclusion tags based on environmentType
 * to prevent out-of-context hallucinations (e.g. hospital bed in a bar) with 0 compute cost.
 */

import { comfyLog } from "../api";

export const CONTEXT_NEGATIVES_BY_SCENE_TYPE: Record<string, string[]> = {
  bar_interior: [
    "office furniture", "classroom", "hospital bed", "outdoor daylight", "sunlight", "grass", "beach"
  ],
  office: [
    "bar bottles", "candles", "nightclub", "restaurant", "outdoor elements", "beach", "grass"
  ],
  bedroom_intimate: [
    "office desk", "classroom chairs", "restaurant tables", "outdoor elements", "crowd", "public space"
  ],
  studio_portrait: [
    "landscape background", "wide exterior establishing shot", "multiple background people", "crowd"
  ],
  outdoor_day: [
    "fluorescent light", "office interior", "nightclub", "bar", "dark room", "artificial light only"
  ]
};

/**
 * Task QX-2: Resolves scene-specific context negative tags based on environmentType.
 */
export function getSceneContextNegativePrompt(environmentType: string = "bar_interior"): string {
  const tags = CONTEXT_NEGATIVES_BY_SCENE_TYPE[environmentType.toLowerCase()] || [];
  const joined = tags.join(", ");

  comfyLog(`[ContextNegativeInjector] 🚫 Loaded ${tags.length} scene context negative tag(s) for "${environmentType}": ${joined}`);
  return joined;
}
