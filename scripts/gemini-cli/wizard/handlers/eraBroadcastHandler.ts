/**
 * scripts/gemini-cli/wizard/handlers/eraBroadcastHandler.ts
 */

import prompts from "prompts";
import { ERA_PRESETS, runEraBroadcastGenerator } from "../../eraBroadcastGenerator";
import {
  promptPersonaSelection,
  promptEngineSelection,
} from "../commonPrompts";

export async function handleEraBroadcastWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "ruby");
  if (!persona) return false;

  const eraRes = await prompts({
    type: "select",
    name: "era",
    message: "Select Historical Broadcast Television Era:",
    choices: Object.entries(ERA_PRESETS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const aspectRes = await prompts({
    type: "select",
    name: "aspect",
    message: "Select Era Aspect Ratio:",
    choices: [
      { title: "📻 4:3 — Authentic Vintage CRT Television Format", value: "4:3" },
      { title: "📺 16:9 — Modern Widescreen Remaster", value: "16:9" },
    ],
  });

  const engine = await promptEngineSelection();

  await runEraBroadcastGenerator({
    persona,
    presetKey: eraRes.era,
    aspectRatio: aspectRes.aspect,
    engine,
  });

  return true;
}
