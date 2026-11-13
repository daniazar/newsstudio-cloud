/**
 * src/lib/ai/comfy/image/rerollSelector.ts
 *
 * Task QA-12 (IMAGE_ROADMAP.md Part 12).
 * Smart Re-Roll Targeting & Stage Jump Selector.
 * Analyzes changed prompt aspects and selects the optimal entry stage index,
 * re-using upstream cached stage images to eliminate redundant rendering time.
 */

import { comfyLog } from "../api";

export type PromptAspectTarget = "environment" | "props" | "persona" | "wardrobe" | "lighting" | "face_detail" | "hands";

export interface ReRollTargetResult {
  entryStageIndex: number;
  entryStageName: string;
  cachedStagesToReuse: number[];
  estimatedTimeSavedSeconds: number;
}

/**
 * Task QA-12: Determines optimal entry stage index for selective re-roll targeting based on changed aspect.
 */
export function determineReRollEntryStage(changedAspect: PromptAspectTarget): ReRollTargetResult {
  switch (changedAspect) {
    case "environment":
      return {
        entryStageIndex: 1,
        entryStageName: "Environment & Architecture",
        cachedStagesToReuse: [],
        estimatedTimeSavedSeconds: 0
      };
    case "props":
      return {
        entryStageIndex: 2,
        entryStageName: "Props & Foreground Elements",
        cachedStagesToReuse: [1],
        estimatedTimeSavedSeconds: 10
      };
    case "persona":
      return {
        entryStageIndex: 3,
        entryStageName: "Primary Persona Insertion",
        cachedStagesToReuse: [1, 2],
        estimatedTimeSavedSeconds: 20
      };
    case "wardrobe":
      return {
        entryStageIndex: 3.2,
        entryStageName: "Wardrobe & Outfit Styling",
        cachedStagesToReuse: [1, 2, 3],
        estimatedTimeSavedSeconds: 30
      };
    case "lighting":
      return {
        entryStageIndex: 4,
        entryStageName: "Relighting & Shadow Harmonization",
        cachedStagesToReuse: [1, 2, 3, 3.2],
        estimatedTimeSavedSeconds: 40
      };
    case "face_detail":
      return {
        entryStageIndex: 5,
        entryStageName: "Micro-Anatomy & FaceDetailer",
        cachedStagesToReuse: [1, 2, 3, 3.2, 4],
        estimatedTimeSavedSeconds: 48
      };
    case "hands":
      return {
        entryStageIndex: 6,
        entryStageName: "Hand & Anatomy Detailer",
        cachedStagesToReuse: [1, 2, 3, 3.2, 4, 5],
        estimatedTimeSavedSeconds: 55
      };
    default:
      return {
        entryStageIndex: 1,
        entryStageName: "Environment & Architecture",
        cachedStagesToReuse: [],
        estimatedTimeSavedSeconds: 0
      };
  }
}

/**
 * Logs re-roll jump strategy to CLI.
 */
export function logReRollStrategy(aspect: PromptAspectTarget): ReRollTargetResult {
  const result = determineReRollEntryStage(aspect);
  comfyLog(`⚡ [SmartReRoll] Target Aspect: "${aspect}" → Fast Jump to Stage ${result.entryStageIndex} (${result.entryStageName})`);
  comfyLog(`   └─ Re-using cached stages: [${result.cachedStagesToReuse.join(", ")}] (Est. Time Saved: ~${result.estimatedTimeSavedSeconds}s)`);
  return result;
}
