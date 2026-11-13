/**
 * scripts/gemini-cli/wizard/handlers/dualAnchorHandler.ts
 */

import prompts from "prompts";
import { DUAL_ANCHOR_SCENARIOS, runDualAnchorMode } from "../../dualAnchorGenerator";
import {
  promptPersonaSelection,
  promptAspectSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleDualAnchorWorkflow(): Promise<boolean> {
  const persona1 = await promptPersonaSelection("ruby", "Select Left Anchor Persona:");
  const persona2 = await promptPersonaSelection("blaze", "Select Right Anchor Persona:");
  if (!persona1 || !persona2) return false;

  const scenarioRes = await prompts({
    type: "select",
    name: "scenario",
    message: "Select Co-Anchor Studio Interaction Scenario:",
    choices: Object.entries(DUAL_ANCHOR_SCENARIOS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const aspect = await promptAspectSelection(["16:9", "9:16"]);
  const engine = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Dual-Anchor Scene Generation Mode:");

  await runDualAnchorMode({
    persona1,
    persona2,
    scenarioKey: scenarioRes.scenario || "desk_dialogue_formal",
    aspectRatio: aspect as any,
    engine,
    dryRun,
    preview: true,
  });

  return true;
}
