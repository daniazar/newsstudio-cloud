/**
 * scripts/gemini-cli/wizard/handlers/domainSetHandler.ts
 */

import prompts from "prompts";
import { Persona } from "../../../../src/lib/tts/personas";
import { BroadcastDomainType } from "../../../veo-cli/types";
import { getAttiresForPersona } from "../../personaAttires";
import { generateDomainMasterImageSet } from "../../domainSetGenerator";
import {
  promptPersonaSelection,
  promptAttireSelection,
  promptAspectSelection,
  promptEngineSelection,
  promptDryRunSelection,
} from "../commonPrompts";

export async function handleDomainSetWorkflow(initialPersonaId?: string): Promise<boolean> {
  const persona = await promptPersonaSelection(initialPersonaId || "ruby");
  if (!persona) return false;

  const domainRes = await prompts({
    type: "select",
    name: "domain",
    message: "Select Target Broadcast Scenario Domain:",
    choices: [
      { title: "🪑 Domain 1: Seated Broadcast Desk (Glass Desk with Laptop & Props)", value: "seated_broadcast_desk" },
      { title: "🎙️ Domain 2: Standing Broadcast Desk / Podium (Beside Desk)", value: "standing_broadcast_desk" },
      { title: "🟢 Domain 3: Chroma Wall Standing (Pure Green/Blue Screen — Zero Furniture)", value: "chroma_wall_standing" },
      { title: "🟩 Domain 4: Chroma Wall Seated Desk (Green Screen Desk Set)", value: "chroma_wall_seated_desk" },
      { title: "🛋️ Domain 5: Interview Lounge Standing (Warm Wood & Ambient Room)", value: "interview_lounge_standing" },
      { title: "🪑 Domain 6: Interview Lounge Seated Sofa (Designer Armchair)", value: "interview_lounge_seated_sofa" },
    ],
  });

  if (!domainRes.domain) return false;

  const attireStrategyRes = await prompts({
    type: "select",
    name: "strategy",
    message: "Select Attire Continuity Strategy:",
    choices: [
      { title: "👗 Select Attire from Persona Wardrobe Catalog", value: "catalog_preset" },
      { title: "🖼️ Clone Attire from an Existing Reference Image (Color & Cut Replication)", value: "reference_image" },
      { title: "✏️ Enter Custom Attire Description", value: "custom" },
    ],
  });

  let refImagePath: string | undefined;
  let selectedAttire: any;
  let customAttireText: string | undefined;

  if (attireStrategyRes.strategy === "reference_image") {
    const refRes = await prompts({
      type: "text",
      name: "path",
      message: "Enter path to reference image containing desired attire:",
      initial: "public/avatars/master_ruby_archive/outfits_and_clean_plates/outfit_01_cobalt_blue_sweetheart_dress.jpg",
    });
    refImagePath = refRes.path;
  } else if (attireStrategyRes.strategy === "catalog_preset") {
    const availableAttires = await getAttiresForPersona(persona);
    const attireRes = await promptAttireSelection(persona, availableAttires);
    if (attireRes.wardrobeKey === "custom") {
      const customRes = await prompts({
        type: "text",
        name: "text",
        message: "Enter custom attire description:",
        initial: "Cropped black moto leather jacket worn open over a tight black leather bandeau crop top, bare midriff, high-waisted black leather pants",
      });
      customAttireText = customRes.text;
      selectedAttire = undefined;
    } else {
      selectedAttire = availableAttires.find((a) => a.id === attireRes.wardrobeKey) || availableAttires[0];
    }
  } else {
    const customRes = await prompts({
      type: "text",
      name: "text",
      message: "Enter custom attire description:",
      initial: "Cropped black moto leather jacket worn open over a tight black leather bandeau crop top, bare midriff, high-waisted black leather pants",
    });
    customAttireText = customRes.text;
  }

  const aspectChoices = domainRes.domain === "chroma_wall_standing"
    ? (["16:9", "9:16", "1:1"] as Array<"16:9" | "9:16" | "1:1">)
    : (["16:9", "9:16", "1:1"] as Array<"16:9" | "9:16" | "1:1">);
  const aspect = await promptAspectSelection(aspectChoices);
  const engine = await promptEngineSelection();
  const dryRun = await promptDryRunSelection("Execution Mode for Domain Keyframe Suite:");

  await generateDomainMasterImageSet({
    persona,
    domain: domainRes.domain as BroadcastDomainType,
    attireSource: attireStrategyRes.strategy,
    refImagePath,
    attire: selectedAttire,
    customAttireText,
    aspectRatio: aspect as any,
    engine,
    dryRun,
  });

  return true;
}
