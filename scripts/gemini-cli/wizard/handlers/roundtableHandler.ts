/**
 * scripts/gemini-cli/wizard/handlers/roundtableHandler.ts
 */

import prompts from "prompts";
import { ROUNDTABLE_LAYOUTS, runRoundtableMode } from "../../roundtableGenerator";
import {
  promptPersonaSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleRoundtableWorkflow(): Promise<boolean> {
  console.log("\n--- Select 3 Anchor Personas for Roundtable Panel ---");
  const p1 = await promptPersonaSelection("ruby", "Select Left Anchor (Analyst):");
  const p2 = await promptPersonaSelection("mateo", "Select Center Anchor (Lead Host / Moderator):");
  const p3 = await promptPersonaSelection("blaze", "Select Right Anchor (Analyst):");
  if (!p1 || !p2 || !p3) return false;

  const layoutRes = await prompts({
    type: "select",
    name: "layoutKey",
    message: "Select Studio Layout & Table Style:",
    choices: Object.entries(ROUNDTABLE_LAYOUTS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const engineRes = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Roundtable Generation Mode:");

  await runRoundtableMode({
    persona1: p1,
    persona2: p2,
    persona3: p3,
    layoutKey: layoutRes.layoutKey,
    aspectRatio: "16:9",
    engine: engineRes,
    dryRun,
    preview: true,
  });

  return true;
}
