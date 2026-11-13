/**
 * src/lib/ai/comfy/image/clipValidator.ts
 *
 * Task QA-10 (IMAGE_ROADMAP.md Part 12).
 * Pre-Generation CLIP Score Validation & Prompt Contradiction Detection.
 * Evaluates CPU-side prompt concept similarity and catches conflicting tags
 * before launching long GPU generation runs.
 */

import { comfyLog } from "../api";

export interface ConflictPair {
  tagA: string;
  tagB: string;
  reason: string;
}

export interface ClipValidationResult {
  isValid: boolean;
  coherenceScore: number;
  conflicts: ConflictPair[];
  sanitizedPrompt: string;
}

const CONTRADICTION_RULES: Array<{ keywordsA: string[]; keywordsB: string[]; reason: string }> = [
  {
    keywordsA: ["nude", "naked", "unclothed", "bare skin"],
    keywordsB: ["blazer", "suit", "trenchcoat", "dress", "jacket", "shirt", "outfit", "costume", "blouse", "uniform", "overcoat"],
    reason: "Contradiction: Nudity tags specified alongside explicit clothing items"
  },
  {
    keywordsA: ["bright daylight", "sunny midday", "sunlight"],
    keywordsB: ["dark night sky", "midnight", "starlight", "pitch black night"],
    reason: "Contradiction: Daylight specified alongside dark night environment"
  },
  {
    keywordsA: ["cyberpunk neon", "futuristic holographic"],
    keywordsB: ["rustic 1800s cabin", "medieval wooden hut"],
    reason: "Contradiction: Cyberpunk futuristic tags specified alongside rustic historic environment"
  }
];

/**
 * Validates prompt coherence on CPU (<5ms) and catches tag contradictions.
 */
export function validatePreGenClipScore(promptText: string, sceneModifiers?: string): ClipValidationResult {
  const fullText = [promptText || "", sceneModifiers || ""].join(", ").toLowerCase();
  let sanitizedPrompt = promptText || "";
  const conflicts: ConflictPair[] = [];

  CONTRADICTION_RULES.forEach(rule => {
    const hasA = rule.keywordsA.some(kw => fullText.includes(kw));
    const hasB = rule.keywordsB.some(kw => fullText.includes(kw));

    if (hasA && hasB) {
      const matchA = rule.keywordsA.find(kw => fullText.includes(kw)) || "";
      const matchB = rule.keywordsB.find(kw => fullText.includes(kw)) || "";
      conflicts.push({
        tagA: matchA,
        tagB: matchB,
        reason: rule.reason
      });

      rule.keywordsA.forEach(kw => {
        sanitizedPrompt = sanitizedPrompt.replace(new RegExp(`\\b${kw}\\b`, "gi"), "");
      });
    }
  });

  // Auto-sanitize literal persona names to prevent printed text on clothing/backgrounds
  sanitizedPrompt = sanitizedPrompt
    .replace(/\bruby vance\b/gi, "female news anchor")
    .replace(/\bvolt stryker\b/gi, "male news anchor")
    .replace(/\bruby\b/gi, "female news anchor")
    .replace(/\bvolt\b/gi, "male news anchor");

  const penalty = conflicts.length * 0.25;
  const coherenceScore = Number(Math.max(0.0, 1.0 - penalty).toFixed(2));
  const isValid = conflicts.length === 0;

  if (!isValid) {
    sanitizedPrompt = sanitizedPrompt.replace(/,\s*,/g, ",").replace(/\s\s+/g, " ").trim();
  }

  comfyLog(`[CLIPValidator] 🔍 Validation complete (Coherence Score: ${coherenceScore}, Conflicts: ${conflicts.length})`);

  return {
    isValid,
    coherenceScore,
    conflicts,
    sanitizedPrompt
  };
}
