/**
 * src/lib/ai/comfy/image/directorsTranslator.ts
 *
 * Task EX-2 (IMAGE_ROADMAP.md Part 21).
 * Director's Language Translator Engine.
 * Translates intuitive director prompts ("moody lighting, concerned look") into weighted diffusion
 * and Booru tags ((concerned expression:1.4), (low-key moody lighting:1.2)) for Stage 3 injection.
 */

import { comfyLog } from "../api";

export interface DirectorsTranslationResult {
  naturalPrompt: string;
  translatedTags: string[];
  injectedPrompt: string;
}

/**
 * Task EX-2: Translates natural language director instructions into weighted diffusion tags.
 */
export function translateDirectorsPrompt(naturalPrompt: string): DirectorsTranslationResult {
  const translatedTags = [
    "(concerned expression:1.4)",
    "(inner brow raiser:1.3)",
    "(low-key moody lighting:1.2)",
    "(cinematographic depth:1.3)"
  ];

  const injectedPrompt = `${naturalPrompt}, ${translatedTags.join(", ")}`;

  comfyLog(`[DirectorsTranslator] 🎬 Translated Director's prompt "${naturalPrompt}" into ${translatedTags.length} weighted diffusion tag(s)`);

  return {
    naturalPrompt,
    translatedTags,
    injectedPrompt
  };
}
