/**
 * scripts/gemini-cli/wizard/commonPrompts.ts
 *
 * Centralized, reusable arrow-key prompt helpers for the Gemini CLI Wizard.
 * Eliminates all manual text typing for boolean/choice prompts.
 */

import prompts from "prompts";
import { Persona, PERSONAS, getAllPersonas } from "../../../src/lib/tts/personas";
import { PersonaAttire } from "../types";
import { getAttiresForPersona } from "../personaAttires";
import { STUDIO_PLATES_CATALOG } from "../studioCatalog";
import { LIGHTING_PRESETS } from "../lightingPresets";
import { HAIRSTYLE_PRESETS } from "../hairstylePresets";

export async function promptPersonaSelection(
  initialId?: string,
  msg = "Select Anchor Persona:"
): Promise<Persona | null> {
  const allPersonas = getAllPersonas();
  const res = await prompts({
    type: "select",
    name: "personaId",
    message: msg,
    initial: initialId ? Math.max(0, allPersonas.findIndex((p) => p.id === initialId)) : 0,
    choices: allPersonas.map((p) => ({
      title: `${p.name.padEnd(20)} [${p.language.toUpperCase()}/${p.gender}] — ${p.title}`,
      value: p.id,
    })),
  });
  return allPersonas.find((p) => p.id === res.personaId) || null;
}

export async function promptStudioSelection(): Promise<string | null> {
  const res = await prompts({
    type: "select",
    name: "studioKey",
    message: "Select Studio Background or Chroma Backdrop:",
    choices: [
      ...Object.entries(STUDIO_PLATES_CATALOG).map(([k, v]) => ({
        title: v.label,
        value: k,
      })),
      { title: "✏️ Custom Studio Environment Prompt", value: "custom_backdrop" },
    ],
  });
  return res.studioKey || null;
}

export async function promptAttireSelection(
  persona: Persona,
  attires?: PersonaAttire[]
): Promise<{ wardrobeKey: string }> {
  const resolvedAttires = attires && attires.length > 0 ? attires : await getAttiresForPersona(persona);
  const res = await prompts({
    type: "select",
    name: "wardrobeKey",
    message: `Select Wardrobe / Attire for ${persona.name}:`,
    choices: [
      ...resolvedAttires.map((a) => ({
        title: a.label,
        value: a.id,
      })),
      { title: "✏️ Custom Wardrobe Description", value: "custom" },
    ],
  });
  return { wardrobeKey: res.wardrobeKey || resolvedAttires[0]?.id || "default" };
}

export async function promptChromaSelection(): Promise<"auto" | "green" | "blue" | "none"> {
  const res = await prompts({
    type: "select",
    name: "chroma",
    message: "Chroma Key Color Mode:",
    choices: [
      { title: "🤖 Auto-Detect (Selects Chroma Blue for green attire, Chroma Green for blue/other)", value: "auto" },
      { title: "🟢 Force Chroma Green (#00B140)", value: "green" },
      { title: "🔵 Force Chroma Blue (#0047BB)", value: "blue" },
      { title: "🚫 No Chroma (Use Real Studio Plate)", value: "none" },
    ],
  });
  return res.chroma || "auto";
}

export async function promptAspectSelection(
  allowed?: Array<"16:9" | "9:16" | "1:1" | "4:3">
): Promise<"16:9" | "9:16" | "1:1" | "4:3"> {
  const allChoices: Array<{ title: string; value: "16:9" | "9:16" | "1:1" | "4:3" }> = [
    { title: "📺 16:9 — Landscape 1080p Broadcast Master (YouTube / Studio)", value: "16:9" },
    { title: "📱 9:16 — Vertical 1080x1920 Mobile Story (TikTok / Shorts)", value: "9:16" },
    { title: "🟦 1:1 — Square Avatar & Vault Card", value: "1:1" },
    { title: "📻 4:3 — Traditional Broadcast Medium", value: "4:3" },
  ];

  const choices = allowed ? allChoices.filter((c) => allowed.includes(c.value)) : allChoices;

  const res = await prompts({
    type: "select",
    name: "aspect",
    message: "Select Broadcast Aspect Ratio:",
    choices,
  });
  return res.aspect || "16:9";
}

export async function promptEngineSelection(): Promise<"agy" | "api" | "tool_json"> {
  const res = await prompts({
    type: "select",
    name: "engine",
    message: "Select Execution Dispatch Engine:",
    choices: [
      { title: "🚀 Antigravity CLI (agy -p) — Autonomous background execution via AGY Agent", value: "agy" },
      { title: "⚡ Direct Google GenAI API (@google/genai) — Fast API call", value: "api" },
      { title: "📋 Output generate_image Tool Call JSON — Inspect or copy payload", value: "tool_json" },
    ],
  });
  return res.engine || "agy";
}

export async function promptDryRunSelection(
  message = "Select Generation Execution Mode:",
  initialDry = false
): Promise<boolean> {
  const res = await prompts({
    type: "select",
    name: "dryRun",
    message,
    initial: initialDry ? 1 : 0,
    choices: [
      { title: "⚡ Live Generation (Call AI generator immediately)", value: false },
      { title: "🔍 Dry-Run Preview (Preview prompt & parameters without calling AI)", value: true },
    ],
  });
  return !!res.dryRun;
}

export async function promptBooleanSelection(
  message: string,
  yesTitle = "✅ Yes",
  noTitle = "❌ No",
  initialYes = false
): Promise<boolean> {
  const res = await prompts({
    type: "select",
    name: "val",
    message,
    initial: initialYes ? 0 : 1,
    choices: [
      { title: yesTitle, value: true },
      { title: noTitle, value: false },
    ],
  });
  return typeof res.val === "boolean" ? res.val : initialYes;
}

export async function promptLightingSelection(): Promise<string> {
  const res = await prompts({
    type: "select",
    name: "lighting",
    message: "Select Studio Lighting & Atmosphere Mood:",
    choices: Object.entries(LIGHTING_PRESETS).map(([k, v]) => ({
      title: v.label,
      value: k,
    })),
  });
  return res.lighting || "prime_time_bright";
}

export async function promptHairstyleSelection(persona: Persona): Promise<{ key: string; custom?: string }> {
  const hairRes = await prompts({
    type: "select",
    name: "hairKey",
    message: `Select Hairstyle for ${persona.name}:`,
    choices: [
      ...Object.entries(HAIRSTYLE_PRESETS).map(([k, v]) => ({
        title: v.label,
        value: k,
      })),
      { title: "✏️ Custom Hairstyle Description", value: "custom" },
    ],
  });

  let hairstyleKey = hairRes.hairKey || "signature";
  let customHairstyle: string | undefined;

  if (hairstyleKey === "custom") {
    const cHair = await prompts({
      type: "text",
      name: "text",
      message: "Enter custom hairstyle description:",
      initial: "Sleek high bun with soft curtain bangs",
    });
    customHairstyle = cHair.text;
  }

  return { key: hairstyleKey, custom: customHairstyle };
}
