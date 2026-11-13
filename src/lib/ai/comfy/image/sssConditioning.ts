/**
 * src/lib/ai/comfy/image/sssConditioning.ts
 *
 * Task QX-9 (IMAGE_ROADMAP.md Part 20).
 * Subsurface Scattering (SSS) Biological Skin Conditioning Engine.
 * Injects SSS prompt conditioning tags ((subsurface scattering:1.4), (skin translucency:1.3))
 * and IC-Light rim lighting configuration to promote warm light transmission through skin tissue.
 */

import { comfyLog } from "../api";

export interface SSSConditioningResult {
  originalPrompt: string;
  sssTags: string[];
  augmentedPrompt: string;
}

/**
 * Task QX-9: Augments prompt with Subsurface Scattering biological skin conditioning tags.
 */
export function injectSSSConditioningTags(originalPrompt: string): SSSConditioningResult {
  const sssTags = [
    "(subsurface scattering:1.4)",
    "(skin translucency:1.3)",
    "(warm skin glow in backlight:1.2)",
    "(biological skin texture:1.3)"
  ];

  const augmentedPrompt = `${originalPrompt}, ${sssTags.join(", ")}`;

  comfyLog(`[SSSConditioning] 🩸 Injected ${sssTags.length} Subsurface Scattering biological skin tags into prompt`);

  return {
    originalPrompt,
    sssTags,
    augmentedPrompt
  };
}
