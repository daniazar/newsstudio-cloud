/**
 * scripts/gemini-cli/wizard/handlers/studioHandler.ts
 */

import prompts from "prompts";
import { STUDIO_SET_PRESETS, runStudioGeneratorMode } from "../../studioGenerator";
import { promptEngineSelection } from "../commonPrompts";

export async function handleStudioWorkflow(): Promise<boolean> {
  const setRes = await prompts({
    type: "select",
    name: "preset",
    message: "Select Virtual Studio Architectural Preset:",
    choices: Object.entries(STUDIO_SET_PRESETS).map(([k, v]) => ({
      title: v.label,
      value: k,
    })),
  });

  const aspectRes = await prompts({
    type: "select",
    name: "aspect",
    message: "Select Studio Plate Aspect Ratio:",
    choices: [
      { title: "📺 16:9 — Standard Broadcast Studio (1920x1080 / 3840x2160)", value: "16:9" },
      { title: "🖥️ 32:9 — Ultra-Wide Panoramic Curved Video Wall Backdrop", value: "32:9" },
      { title: "📱 9:16 — Vertical Live Stream Background", value: "9:16" },
    ],
  });

  const engine = await promptEngineSelection();

  await runStudioGeneratorMode({
    presetKey: setRes.preset,
    aspectRatio: aspectRes.aspect,
    engine,
  });

  return true;
}
