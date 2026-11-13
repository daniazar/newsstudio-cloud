/**
 * scripts/gemini-cli/wizard/handlers/magazineHandler.ts
 */

import prompts from "prompts";
import { MAGAZINE_PRESETS, runMagazineCoverGenerator } from "../../magazineCoverGenerator";
import {
  promptPersonaSelection,
  promptEngineSelection,
} from "../commonPrompts";

export async function handleMagazineWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "ruby");
  if (!persona) return false;

  const themeRes = await prompts({
    type: "select",
    name: "theme",
    message: "Select Magazine Editorial Publication Theme:",
    choices: Object.entries(MAGAZINE_PRESETS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const headlineRes = await prompts({
    type: "text",
    name: "headline",
    message: "Enter custom cover story headline (or leave blank for theme default):",
    initial: "",
  });

  const engine = await promptEngineSelection();

  await runMagazineCoverGenerator({
    persona,
    presetKey: themeRes.theme,
    customHeadline: headlineRes.headline,
    aspectRatio: "3:4",
    engine,
  });

  return true;
}
