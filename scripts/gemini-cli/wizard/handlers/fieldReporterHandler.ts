/**
 * scripts/gemini-cli/wizard/handlers/fieldReporterHandler.ts
 */

import prompts from "prompts";
import { FIELD_ENVIRONMENTS, runFieldReporterMode } from "../../fieldReporterGenerator";
import {
  promptPersonaSelection,
  promptAspectSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleFieldReporterWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "storm");
  if (!persona) return false;

  const envRes = await prompts({
    type: "select",
    name: "envKey",
    message: "Select Outdoor Environment & Weather Event:",
    choices: Object.entries(FIELD_ENVIRONMENTS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const aspectRes = await promptAspectSelection();
  const engineRes = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Field Reporter Generation Mode:");

  await runFieldReporterMode({
    persona,
    environmentKey: envRes.envKey,
    aspectRatio: aspectRes,
    engine: engineRes,
    dryRun,
    preview: true,
  });

  return true;
}
