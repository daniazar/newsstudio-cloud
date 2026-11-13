/**
 * src/lib/ai/comfy/image/personaNegativeBaseline.ts
 *
 * Task AD-11 (IMAGE_ROADMAP.md Part 15).
 * Persona-Specific Learned Negative Baseline Engine.
 * Loads persona-specific failure mode exclusions from personas/{personaId}/negative_baseline.json
 * and auto-prepends them to negative conditioning for every run.
 */

import fs from "fs";
import path from "path";
import { comfyLog } from "../api";

export interface PersonaNegativeTag {
  tag: string;
  weight: number;
  reason: string;
}

export interface PersonaModeNegativeSchema {
  personaId: string;
  version: number;
  modeNegatives: Record<string, PersonaNegativeTag[]>;
}

/**
 * Task SW-8: Loads persona negative baseline tags for specific ContentMode and prepends to negative prompt.
 */
export function getPersonaLearnedNegativePromptForMode(
  personaId: string,
  contentMode: string = "SFW",
  baseDir: string = path.join(process.cwd(), "public", "avatars")
): string {
  const file = path.join(baseDir, `${personaId.toLowerCase()}_negative_baseline.json`);

  let baseline: PersonaModeNegativeSchema = {
    personaId: personaId.toLowerCase(),
    version: 2,
    modeNegatives: {
      SFW: [
        { tag: "anime red hair", weight: 1.3, reason: "copper-red mistranslation" },
        { tag: "blue eyes", weight: 1.4, reason: "model defaults to blue eyes for redheads" }
      ],
      NSFW_EXPLICIT: [
        { tag: "anime red hair", weight: 1.3, reason: "copper-red mistranslation" },
        { tag: "clothed", weight: 1.5, reason: "prevent partially clothed artifacts in explicit mode" },
        { tag: "covered", weight: 1.5, reason: "prevent covered artifacts" }
      ]
    }
  };

  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (parsed.modeNegatives) baseline = parsed;
    } catch {}
  }

  const tagsList = baseline.modeNegatives[contentMode] || baseline.modeNegatives["SFW"] || [];
  const tags = tagsList.map(t => `(${t.tag}:${t.weight})`);
  const joined = tags.join(", ");

  comfyLog(`[PersonaNegativeBaseline] 🛡️ Loaded ${tags.length} learned exclusion tag(s) for persona "${personaId}" (${contentMode}): ${joined}`);
  return joined;
}

export function getPersonaLearnedNegativePrompt(personaId: string, baseDir?: string): string {
  return getPersonaLearnedNegativePromptForMode(personaId, "SFW", baseDir);
}
