/**
 * scripts/gemini-cli/wizard/handlers/storyboardHandler.ts
 */

import prompts from "prompts";
import { getAttiresForPersona } from "../../personaAttires";
import { runStoryboardGenerator } from "../../storyboardGenerator";
import {
  promptPersonaSelection,
  promptAttireSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleStoryboardWorkflow(initialStoryId?: string): Promise<boolean> {
  let storyId = initialStoryId;
  if (!storyId) {
    const sRes = await prompts({
      type: "text",
      name: "storyId",
      message: "Enter Story ID from Database to storyboard:",
      initial: "test-story-01",
    });
    storyId = sRes.storyId;
  }

  const personaRes = await promptPersonaSelection("ruby");
  if (!personaRes) return false;

  const availableAttires = await getAttiresForPersona(personaRes);
  const attireRes = await promptAttireSelection(personaRes, availableAttires);
  const engineRes = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Storyboard Scene Generation Mode:");

  await runStoryboardGenerator({
    storyId: storyId || "test-story-01",
    persona: personaRes,
    wardrobeKey: attireRes.wardrobeKey,
    engine: engineRes,
    dryRun,
    preview: true,
    saveToDb: true,
  });

  return true;
}
