/**
 * scripts/gemini-cli/wizard/handlers/turntableHandler.ts
 */

import { getAttiresForPersona } from "../../personaAttires";
import { runTurntableMode } from "../../turntableGenerator";
import {
  promptPersonaSelection,
  promptAttireSelection,
  promptChromaSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleTurntableWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "blaze");
  if (!persona) return false;

  const availableAttires = await getAttiresForPersona(persona);
  const attireRes = await promptAttireSelection(persona, availableAttires);
  const selectedAttire = availableAttires.find((a) => a.id === attireRes.wardrobeKey) || availableAttires[0];

  const chroma = await promptChromaSelection();
  const engine = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Turntable 9-Panel Generation Mode:");

  await runTurntableMode({
    persona,
    attire: selectedAttire,
    chromaMode: chroma as any,
    engine,
    dryRun,
    preview: true,
  });

  return true;
}
