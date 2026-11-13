/**
 * scripts/gemini-cli/wizard/handlers/lookbookHandler.ts
 */

import prompts from "prompts";
import { runLookbookGenerator } from "../../lookbookGenerator";
import {
  promptPersonaSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleLookbookWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "ruby");
  if (!persona) return false;

  const countRes = await prompts({
    type: "select",
    name: "count",
    message: "Select Lookbook Size:",
    choices: [
      { title: "👗 6 Curated High-Fashion Outfits (Fast)", value: 6 },
      { title: "👑 12 Complete High-Fashion Outfits (Full Lookbook)", value: 12 },
    ],
  });

  const engine = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Lookbook Generation Mode:");

  await runLookbookGenerator({
    persona,
    count: countRes.count || 6,
    engine,
    dryRun,
    preview: true,
  });

  return true;
}
