/**
 * scripts/gemini-cli/wizard/handlers/thumbnailHandler.ts
 */

import prompts from "prompts";
import { getAttiresForPersona } from "../../personaAttires";
import { THUMBNAIL_HOOK_PRESETS, runThumbnailMode } from "../../thumbnailGenerator";
import {
  promptPersonaSelection,
  promptAttireSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleThumbnailWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "ruby");
  if (!persona) return false;

  const availableAttires = await getAttiresForPersona(persona);
  const attireRes = await promptAttireSelection(persona, availableAttires);
  const attire = availableAttires.find((a) => a.id === attireRes.wardrobeKey) || availableAttires[0];

  const hookRes = await prompts({
    type: "select",
    name: "hook",
    message: "Select Viral Thumbnail Emotional Hook:",
    choices: Object.entries(THUMBNAIL_HOOK_PRESETS).map(([k, v]) => ({
      title: v.name,
      value: k,
    })),
  });

  const headlineRes = await prompts({
    type: "text",
    name: "headline",
    message: "Enter Thumbnail News Headline / Subject Topic:",
    initial: "NVIDIA REVEALS NEXT-GEN QUANTUM AI CHIP",
  });

  const engine = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Thumbnail Generation Mode:");

  await runThumbnailMode({
    persona,
    attire,
    hookPresetKey: hookRes.hook,
    headlineTopic: headlineRes.headline,
    aspectRatio: "16:9",
    engine,
    dryRun,
  });

  return true;
}
