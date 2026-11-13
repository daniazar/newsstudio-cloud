/**
 * scripts/gemini-cli/wizard/handlers/loraDatasetHandler.ts
 */

import prompts from "prompts";
import { runLoRADatasetGenerator } from "../../loraDatasetGenerator";
import {
  promptPersonaSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleLoRADatasetWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "ruby");
  if (!persona) return false;

  const countRes = await prompts({
    type: "select",
    name: "count",
    message: "Select Dataset Scenario Matrix Count:",
    choices: [
      { title: "⚡ 28 Core Poses & Angles (Standard LoRA Training Set)", value: 28 },
      { title: "🌟 48 Comprehensive Studio Scenarios (Full Comprehensive Dataset)", value: 48 },
    ],
  });

  const engine = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("LoRA Dataset Scenario Mode:", true);

  await runLoRADatasetGenerator({
    persona,
    count: countRes.count || 28,
    engine,
    dryRun,
  });

  return true;
}
