/**
 * src/lib/ai/comfy/image/negativeFeedbackLoop.ts
 *
 * Task EX-7 (IMAGE_ROADMAP.md Part 14).
 * Dynamic Negative Prompt Feedback Loop Engine.
 * Takes detected artifacts from prior stages and dynamically appends them
 * to downstream stage negative prompts as self-learning exclusion tags.
 */

import { comfyLog } from "../api";

export interface NegativeEvolutionResult {
  evolvedNegativePrompt: string;
  addedExclusions: string[];
  stageIndex: number;
}

/**
 * Task EX-7: Evolves negative prompt by appending weighted exclusion tags for detected artifacts.
 */
export function evolveNegativePrompt(
  stageIndex: number,
  baseNegativePrompt: string,
  detectedArtifacts: string[]
): NegativeEvolutionResult {
  if (!detectedArtifacts || detectedArtifacts.length === 0) {
    return {
      evolvedNegativePrompt: baseNegativePrompt,
      addedExclusions: [],
      stageIndex
    };
  }

  const addedExclusions = detectedArtifacts.map(art => `(${art.trim()}:1.4)`);
  const joinedExclusions = addedExclusions.join(", ");

  const evolvedNegativePrompt = [baseNegativePrompt, joinedExclusions].filter(Boolean).join(", ");

  comfyLog(`[NegativeFeedbackLoop] 🔄 Stage ${stageIndex} evolved negative prompt with ${addedExclusions.length} self-learned exclusion(s): ${joinedExclusions}`);

  return {
    evolvedNegativePrompt,
    addedExclusions,
    stageIndex
  };
}
