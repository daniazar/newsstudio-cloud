/**
 * scripts/gemini-cli/wizard/handlers/warMapHandler.ts
 */

import prompts from "prompts";
import { WAR_MAP_PRESETS, runWarMapGenerator } from "../../warMapGenerator";
import { promptAspectSelection, promptEngineSelection } from "../commonPrompts";

export async function handleWarMapWorkflow(): Promise<boolean> {
  const mapRes = await prompts({
    type: "select",
    name: "preset",
    message: "Select 3D Geopolitical / Tactical Map Scenario:",
    choices: Object.entries(WAR_MAP_PRESETS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const topicRes = await prompts({
    type: "text",
    name: "topic",
    message: "Enter custom situation topic or leave blank for default:",
    initial: "",
  });

  const aspect = await promptAspectSelection(["16:9", "9:16"]);
  const engine = await promptEngineSelection();

  await runWarMapGenerator({
    presetKey: mapRes.preset,
    customTopic: topicRes.topic,
    aspectRatio: aspect as any,
    engine,
  });

  return true;
}
