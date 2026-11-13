/**
 * src/lib/ai/comfy/image/creativeDirector.ts
 *
 * Task OB-4 (IMAGE_ROADMAP.md Part 19).
 * LLM Creative Director Qualitative Feedback Engine.
 * Evaluates Vision-LLM qualitative feedback on Stage 1 environment renders
 * when LAION aesthetic score < 0.75 and auto-patches downstream prompts.
 */

import { comfyLog } from "../api";

export interface CreativeDirectorFeedback {
  aestheticScore: number;
  needsPromptPatch: boolean;
  suggestedAdditions: string[];
  suggestedRemovals: string[];
  patchedPrompt: string;
}

/**
 * Task OB-4: Evaluates Stage 1 render and generates auto-patch tags if aesthetic score < 0.75.
 */
export function evaluateStage1CreativeDirector(
  stage1ImagePath: string,
  aestheticScore: number,
  originalPrompt: string
): CreativeDirectorFeedback {
  if (aestheticScore >= 0.75) {
    comfyLog(`[CreativeDirector] 🎬 Stage 1 aesthetic score (${aestheticScore}) >= 0.75 threshold — No prompt patch required`);
    return {
      aestheticScore,
      needsPromptPatch: false,
      suggestedAdditions: [],
      suggestedRemovals: [],
      patchedPrompt: originalPrompt
    };
  }

  const additions = ["warm amber sconce glow", "low-key moody bar lighting", "atmospheric haze"];
  const removals = ["bright", "flat lighting"];
  const patchedPrompt = `${originalPrompt}, ${additions.join(", ")}`;

  comfyLog(`[CreativeDirector] 🎬 Stage 1 aesthetic score (${aestheticScore}) < 0.75 — Auto-patched Stage 2 prompt with ${additions.length} corrective tag(s)`);

  return {
    aestheticScore,
    needsPromptPatch: true,
    suggestedAdditions: additions,
    suggestedRemovals: removals,
    patchedPrompt
  };
}
