/**
 * scripts/gemini-cli/hairstylePresets.ts
 *
 * Comprehensive Hairstyle & Hair Cut Presets for Broadcast Anchors.
 */

import { HairstylePreset } from "./types";
import { Persona } from "../../src/lib/tts/personas";

export const HAIRSTYLE_PRESETS: Record<string, HairstylePreset> = {
  signature: {
    id: "signature",
    label: "⭐ Signature Character Hair (From Persona Traits)",
    prompt: "", // Resolved dynamically from persona.traits.hair
    category: "signature",
  },
  voluminous_waves: {
    id: "voluminous_waves",
    label: "🌊 Voluminous Cascading Waves (Prime-Time Anchor)",
    prompt: "Voluminous, wavy glossy hair falling gracefully past shoulders with rich salon bounce, soft face-framing layers, and natural hair shine.",
    category: "waves",
  },
  asymmetrical_straight_bob: {
    id: "asymmetrical_straight_bob",
    label: "💇 Sharp Asymmetrical Straight Bob (Modern Edgy)",
    prompt: "Sharp, asymmetrical bob haircut, perfectly straightened with precision angled razor finish framing jawline.",
    category: "straight",
  },
  high_snatched_ponytail: {
    id: "high_snatched_ponytail",
    label: "👱 Sleek High Snatched Ponytail (Clean Executive)",
    prompt: "Sleek high snatched ponytail pulled back smoothly with wrapped base, completely clear forehead and jawline, glossy polished finish.",
    category: "updo",
  },
  hollywood_side_swept: {
    id: "hollywood_side_swept",
    label: "🏆 Glamorous Hollywood Side-Swept Waves",
    prompt: "Glamorous side-swept cascading Hollywood waves draped elegantly over one shoulder with deep side part and luminous shine.",
    category: "waves",
  },
  french_twist_updo: {
    id: "french_twist_updo",
    label: "👑 Sophisticated French Twist Anchor Updo",
    prompt: "Sophisticated French twist broadcast updo with subtle volume at the crown and delicate soft wisps framing temples.",
    category: "updo",
  },
  shoulder_layered_curls: {
    id: "shoulder_layered_curls",
    label: "🌀 Natural Layered Curls (Shoulder-Length)",
    prompt: "Natural bouncy shoulder-length textured curls with rich dimensional highlights, soft halo volume, and defined curl pattern.",
    category: "waves",
  },
  pin_straight_curtain_bangs: {
    id: "pin_straight_curtain_bangs",
    label: "✨ Pin-Straight Hair with Soft Curtain Bangs",
    prompt: "Sleek pin-straight long hair falling past collarbones with soft airy curtain bangs framing cheekbones.",
    category: "straight",
  },
  textured_chic_pixie: {
    id: "textured_chic_pixie",
    label: "✂️ Chic Textured Short Pixie Cut",
    prompt: "Chic modern textured pixie cut with soft piecey layers on top, tapered clean neckline, and subtle side-swept fringe.",
    category: "short",
  },
};

export function resolveHairstylePrompt(persona: Persona, hairstyleKey?: string, customHairstyle?: string): string {
  if (customHairstyle) {
    return customHairstyle;
  }

  if (!hairstyleKey || hairstyleKey === "signature") {
    return persona.traits.hair || "Professionally styled broadcast news anchor hair.";
  }

  const preset = HAIRSTYLE_PRESETS[hairstyleKey];
  return preset?.prompt || persona.traits.hair || "Professionally styled hair.";
}
