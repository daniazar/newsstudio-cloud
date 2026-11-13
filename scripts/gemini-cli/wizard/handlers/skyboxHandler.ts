/**
 * scripts/gemini-cli/wizard/handlers/skyboxHandler.ts
 */

import prompts from "prompts";
import { SKYBOX_PRESETS, runSkyboxGenerator } from "../../skyboxGenerator";
import { promptEngineSelection } from "../commonPrompts";

export async function handleSkyboxWorkflow(): Promise<boolean> {
  const setRes = await prompts({
    type: "select",
    name: "preset",
    message: "Select 360° Studio Cyclorama Environment Preset:",
    choices: Object.entries(SKYBOX_PRESETS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const aspectRes = await prompts({
    type: "select",
    name: "aspect",
    message: "Select Aspect Ratio:",
    choices: [
      { title: "📺 16:9 — Standard Broadcast Studio (1920x1080 / 3840x2160)", value: "16:9" },
      { title: "📷 3:2 — Ultra-Wide Lens Field", value: "3:2" },
    ],
  });

  const engine = await promptEngineSelection();

  await runSkyboxGenerator({
    presetKey: setRes.preset,
    aspectRatio: aspectRes.aspect,
    engine,
  });

  return true;
}
