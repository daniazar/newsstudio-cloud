/**
 * src/lib/ai/comfy/image/personaStyleVariant.ts
 *
 * Task QX-7 (IMAGE_ROADMAP.md Part 20).
 * Persona Style Variant Engine.
 * Provides controlled visual variation (hairstyles, makeup, styling) within rigid identity lock,
 * injecting style overrides into prompt tags while preserving base PuLID/InstantID face identity.
 */

import { comfyLog } from "../api";

export interface PersonaStyleVariant {
  variantId: string; // "ruby_updo"
  basePersona: string; // "ruby"
  hairOverride: string;
  makeupOverride: string;
  contextHint: string;
  injectedStyleTags: string;
}

export const PRESET_STYLE_VARIANTS: Record<string, PersonaStyleVariant> = {
  ruby_updo: {
    variantId: "ruby_updo",
    basePersona: "ruby",
    hairOverride: "elegant updo, hair pinned up, nape and neck exposed",
    makeupOverride: "bold red lip, evening makeup",
    contextHint: "formal, glamorous",
    injectedStyleTags: "(elegant updo:1.5), (hair pinned up:1.4), (bold red lip:1.3)"
  },
  ruby_ponytail: {
    variantId: "ruby_ponytail",
    basePersona: "ruby",
    hairOverride: "high sleek ponytail",
    makeupOverride: "natural light makeup",
    contextHint: "athletic, casual",
    injectedStyleTags: "(high sleek ponytail:1.5), (natural makeup:1.3)"
  }
};

/**
 * Task QX-7: Resolves persona style variant definition.
 */
export function getPersonaStyleVariant(variantId: string = "ruby_updo"): PersonaStyleVariant {
  const variant = PRESET_STYLE_VARIANTS[variantId.toLowerCase()] || PRESET_STYLE_VARIANTS["ruby_updo"];

  comfyLog(`[PersonaStyleVariant] 💄 Resolved Style Variant "${variant.variantId}" for persona "${variant.basePersona}": ${variant.injectedStyleTags}`);

  return variant;
}
