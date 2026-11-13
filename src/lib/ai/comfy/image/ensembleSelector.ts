/**
 * src/lib/ai/comfy/image/ensembleSelector.ts
 *
 * Task EX-12 (IMAGE_ROADMAP.md Part 14).
 * Ensemble Generation & Auto-Best-Selection Engine.
 * Generates N seed variants per stage, scores each via CLIP/similarity metrics,
 * and automatically advances the highest-scoring winner to eliminate bad seed lotteries.
 */

import { comfyLog } from "../api";

export interface StageEnsembleVariant {
  seed: number;
  imagePath: string;
  clipScore: number; // 0.0 to 1.0
}

export interface EnsembleSelectionResult {
  winningVariant: StageEnsembleVariant;
  stageIndex: number;
  totalVariantsEvaluated: number;
}

/**
 * Task EX-12: Evaluates ensemble variants and selects the winning candidate with highest CLIP score.
 */
export function selectBestEnsembleVariant(
  stageIndex: number,
  variants: StageEnsembleVariant[]
): EnsembleSelectionResult {
  if (!variants || variants.length === 0) {
    throw new Error(`[EnsembleSelector] No variants provided for Stage ${stageIndex}`);
  }

  const sorted = [...variants].sort((a, b) => b.clipScore - a.clipScore);
  const winner = sorted[0];

  comfyLog(`[EnsembleSelector] 🏆 Stage ${stageIndex} Ensemble Auto-Best-Selection: Selected seed ${winner.seed} (CLIP Score: ${(winner.clipScore * 100).toFixed(1)}% across ${variants.length} variant(s))`);

  return {
    winningVariant: winner,
    stageIndex,
    totalVariantsEvaluated: variants.length
  };
}
