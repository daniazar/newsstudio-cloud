/**
 * scripts/gemini-cli/wizard/handlers/seasonalWardrobeHandler.ts
 */

import prompts from "prompts";
import { SEASON_PRESETS, runSeasonalWardrobeGenerator } from "../../seasonalWardrobeGenerator";
import {
  promptPersonaSelection,
  promptEngineSelection,
} from "../commonPrompts";

export async function handleSeasonalWardrobeWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "ruby");
  if (!persona) return false;

  const seasonRes = await prompts({
    type: "select",
    name: "season",
    message: "Select Seasonal & Red Carpet Wardrobe Theme:",
    choices: Object.entries(SEASON_PRESETS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const countRes = await prompts({
    type: "select",
    name: "count",
    message: "Select Number of Outfits to Synthesize:",
    choices: [
      { title: "👗 4 Essential Season Looks", value: 4 },
      { title: "👑 8 Full Designer Capsule Collection", value: 8 },
    ],
  });

  const engine = await promptEngineSelection();

  await runSeasonalWardrobeGenerator({
    persona,
    seasonKey: seasonRes.season,
    count: countRes.count || 4,
    aspectRatio: "9:16",
    engine,
  });

  return true;
}
