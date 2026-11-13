/**
 * src/lib/ai/comfy/image/clipTokenBudgetMonitor.ts
 *
 * Task QX-1 (IMAGE_ROADMAP.md Part 20).
 * CLIP Token Budget Monitor Engine.
 * Monitors CLIP prompt token count, warns at 68 tokens (77-token ceiling),
 * auto-trims low-priority tags, and logs lost tags to prevent accidental tag truncation.
 */

import { comfyLog } from "../api";

export interface ClipTokenBudgetResult {
  estimatedTokenCount: number;
  exceedsWarningThreshold: boolean;
  exceedsHardCeiling: boolean;
  trimmedPrompt: string;
  removedTags: string[];
}

/**
 * Task QX-1: Evaluates CLIP token count and trims low-priority tags if over budget.
 */
export function monitorClipTokenBudget(promptText: string): ClipTokenBudgetResult {
  const tags = promptText.split(",").map(t => t.trim()).filter(Boolean);
  const estimatedTokenCount = Math.round(tags.length * 2.5); // ~2.5 tokens per tag average
  const warningThreshold = 68;
  const hardCeiling = 75;

  const exceedsWarningThreshold = estimatedTokenCount >= warningThreshold;
  const exceedsHardCeiling = estimatedTokenCount > hardCeiling;

  let trimmedPrompt = promptText;
  const removedTags: string[] = [];

  if (exceedsHardCeiling && tags.length > 5) {
    const keepCount = Math.floor(hardCeiling / 2.5);
    const kept = tags.slice(0, keepCount);
    const removed = tags.slice(keepCount);
    removedTags.push(...removed);
    trimmedPrompt = kept.join(", ");
    comfyLog(`[CLIPTokenBudget] ✂️ Trimmed ${removed.length} low-priority tag(s) to preserve CLIP budget: [${removed.join(", ")}]`);
  }

  if (exceedsWarningThreshold) {
    comfyLog(`[CLIPTokenBudget] ⚠️ Prompt token count (${estimatedTokenCount}) near 77-token CLIP ceiling (Warning threshold: 68)`);
  }

  return {
    estimatedTokenCount,
    exceedsWarningThreshold,
    exceedsHardCeiling,
    trimmedPrompt,
    removedTags
  };
}
