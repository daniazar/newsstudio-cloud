/**
 * src/lib/ai/comfy/image/metadataHarvester.ts
 *
 * Task EX-3 (IMAGE_ROADMAP.md Part 21).
 * Scene Metadata Harvesting Engine.
 * Extracts implicit scene parameters (HDRI map, Camera LUT, Pose key, Dress code, Context negatives)
 * from prompt text to auto-populate execution configuration without manual CLI flags.
 */

import { comfyLog } from "../api";

export interface HarvestedMetadata {
  promptText: string;
  autoHdriName: string;
  autoLutName: string;
  autoPoseKey: string;
  dressCode: string;
  contextNegatives: string[];
}

/**
 * Task EX-3: Implicitly extracts parameters from scene description text.
 */
export function harvestSceneMetadata(promptText: string): HarvestedMetadata {
  const text = promptText.toLowerCase();

  const autoHdriName = text.includes("bar") || text.includes("night") ? "bar_amber_night" : "office_day";
  const autoLutName = text.includes("intimate") || text.includes("moody") ? "cinematic_teal_orange" : "broadcast_studio";
  const autoPoseKey = text.includes("seated") ? "pose_seated_34" : "pose_standing_anchor";
  const dressCode = text.includes("formal") ? "charcoal_blazer" : "casual_blouse";
  const contextNegatives = text.includes("bar") ? ["hospital bed", "office desk", "daylight"] : ["bar bottles", "nightclub"];

  comfyLog(`[MetadataHarvester] 🌾 Harvested scene metadata from prompt: HDRI="${autoHdriName}", LUT="${autoLutName}", Pose="${autoPoseKey}"`);

  return {
    promptText,
    autoHdriName,
    autoLutName,
    autoPoseKey,
    dressCode,
    contextNegatives
  };
}
