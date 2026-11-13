/**
 * scripts/gemini-cli/wizard/handlers/incidentBlueprintHandler.ts
 */

import prompts from "prompts";
import { INCIDENT_PRESETS, runIncidentBlueprintGenerator } from "../../incidentBlueprintGenerator";
import { promptEngineSelection } from "../commonPrompts";

export async function handleIncidentBlueprintWorkflow(): Promise<boolean> {
  const presetRes = await prompts({
    type: "select",
    name: "preset",
    message: "Select Technical Architectural / Forensic Cutaway Preset:",
    choices: Object.entries(INCIDENT_PRESETS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const topicRes = await prompts({
    type: "text",
    name: "topic",
    message: "Enter custom facility/incident name or leave blank for default:",
    initial: "",
  });

  const engine = await promptEngineSelection();

  await runIncidentBlueprintGenerator({
    presetKey: presetRes.preset,
    customTopic: topicRes.topic,
    aspectRatio: "16:9",
    engine,
  });

  return true;
}
