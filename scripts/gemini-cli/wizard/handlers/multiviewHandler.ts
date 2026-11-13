/**
 * scripts/gemini-cli/wizard/handlers/multiviewHandler.ts
 */

import prompts from "prompts";
import { getAttiresForPersona } from "../../personaAttires";
import { runMultiviewSuiteGenerator } from "../../multiviewStripGenerator";
import {
  promptPersonaSelection,
  promptAttireSelection,
  promptHairstyleSelection,
  promptChromaSelection,
  promptEngineSelection,
} from "../commonPrompts";

export async function handleMultiviewWorkflow(initialPersonaId?: string): Promise<boolean> {
  const targetPersona = await promptPersonaSelection(initialPersonaId);
  if (!targetPersona) return false;

  const availableAttires = await getAttiresForPersona(targetPersona);
  const attireRes = await promptAttireSelection(targetPersona, availableAttires);
  const targetAttire = availableAttires.find((a) => a.id === attireRes.wardrobeKey) || availableAttires[0];

  const hairRes = await promptHairstyleSelection(targetPersona);
  const chroma = await promptChromaSelection();

  const synthModeRes = await prompts({
    type: "select",
    name: "synthMode",
    message: "Select Strip Synthesis Engine Mode:",
    choices: [
      { title: "⚡ Single-Pass 4-Panel Master Strip (Fast single 16:9 generation pass)", value: "single_pass_strip" },
      { title: "🧩 4-Shot Discrete Generation + Sharp Seamless Stitching (Ultra-high HD detail)", value: "discrete_4shot_stitch" },
    ],
  });

  const engine = await promptEngineSelection();

  await runMultiviewSuiteGenerator({
    persona: targetPersona,
    attire: targetAttire,
    hairstyleKey: hairRes.key,
    chromaMode: chroma as any,
    mode: synthModeRes.synthMode as any,
    engine,
    saveToDb: true,
  });

  return true;
}
