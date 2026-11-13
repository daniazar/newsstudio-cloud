/**
 * src/lib/ecommerce/promptModifierReconciler.ts
 *
 * Intelligent reconciliation engine for additive prompt modifiers (lighting, atmosphere, camera motion).
 * Prevents contradictory prompt accumulation (e.g. "Sunlit Daylight" + "Moody Twilight" + "Studio Softbox").
 *
 * Features:
 * 1. Mutually Exclusive Lighting Families: Ensures only one dominant lighting scheme is active at a time.
 * 2. Base Prompt Ambient Normalization: When switching to an evening/twilight scheme, dynamically neutralizes
 *    and replaces daylight adjectives (e.g. "sunlit", "natural morning sunlight", "sun-drenched") in the base text.
 * 3. Toggle-Off Support: Clicking an already active modifier cleanly removes it from the prompt.
 * 4. Camera Motion Cue Reconciliation: Replaces previous camera motion cues cleanly without duplicating "Camera: ...".
 */

import { ENVIRONMENT_LIGHTING_MODIFIERS } from "./productMediaPresets";
import { cleanPromptSyntax } from "./promptSafetyFilter";

/**
 * Known lighting conflict patterns in base prompts that must be neutralized when switching schemes
 */
const DAYLIGHT_CONFLICT_PATTERNS: RegExp[] = [
  /\b(in\s+)?bright\s+natural\s+morning\s+sunlight(\s+through\s+floor-to-ceiling\s+windows)?(\s+with\s+soft\s+diffuse\s+illumination)?\b/gi,
  /\bnatural\s+daylight\s+reflections(\s+on\s+the\s+material)?\b/gi,
  /\bsoft\s+morning\s+sunlight\b/gi,
  /\bvolumetric\s+sunlight\b/gi,
  /\bbright\s+daylight\b/gi,
  /\bsun-drenched\b/gi,
  /\bmorning\s+sunlight\b/gi,
  /\bdaylight\s+reflections\b/gi,
];

const TWILIGHT_CONFLICT_PATTERNS: RegExp[] = [
  /\bdramatic\s+low-key\s+cinematic\s+lighting(\s+with\s+rich\s+contrast)?(\s*,\s*deep\s+architectural\s+shadows)?(\s*,\s*and\s+warm\s+tungsten\s+ambient\s+highlights)?\b/gi,
  /\bdeep\s+architectural\s+shadows\b/gi,
  /\bwarm\s+tungsten\s+ambient\s+highlights\b/gi,
  /\bmoody\s+twilight\b/gi,
  /\bat\s+twilight\b/gi,
  /\bat\s+dusk\b/gi,
];

const _GOLDEN_HOUR_CONFLICT_PATTERNS: RegExp[] = [
  /\bwarm\s+golden\s+hour\s+sunlight(\s+at\s+dusk)?(\s*,\s*sun\s+flares)?(\s*,\s*long\s+cinematic\s+amber\s+shadows)?(\s*,\s*and\s+cozy\s+warm\s+color\s+temperature)?\b/gi,
  /\blong\s+cinematic\s+amber\s+shadows\b/gi,
  /\bgolden\s+hour\s+sunlight\b/gi,
];

const STUDIO_SOFTBOX_CONFLICT_PATTERNS: RegExp[] = [
  /\bcommercial\s+3-point\s+softbox\s+studio\s+lighting(\s*,\s*neutral\s+white\s+balanced)?(\s*,\s*subtle\s+specular\s+reflections)?(\s*,\s*8k\s+luxury\s+catalog\s+look)?\b/gi,
  /\b3-point\s+softbox\s+studio\s+lighting\b/gi,
  /\bneutral\s+white\s+balanced\b/gi,
];

const NEON_CYBERPUNK_CONFLICT_PATTERNS: RegExp[] = [
  /\batmospheric\s+neon\s+rim\s+lighting(\s+in\s+glowing\s+cyan\s+and\s+magenta)?(\s*,\s*sleek\s+dark\s+reflections)?(\s*,\s*high-tech\s+futuristic\s+aesthetic)?\b/gi,
  /\bneon\s+rim\s+lighting\b/gi,
  /\bglowing\s+cyan\s+and\s+magenta\b/gi,
];

/**
 * Strips all known canonical environment lighting phrases from a prompt
 */
export function stripAllCanonicalLightingPhrases(prompt: string): string {
  let cleaned = prompt;
  for (const mod of ENVIRONMENT_LIGHTING_MODIFIERS) {
    if (cleaned.includes(mod.phrase)) {
      cleaned = cleaned.replace(mod.phrase, "");
    }
  }
  return cleanPromptSyntax(cleaned);
}

/**
 * Checks if a specific lighting modifier is currently active in the prompt
 */
export function isLightingModifierActive(prompt: string, modifierId: string, modifierPhrase?: string): boolean {
  if (!prompt) return false;
  const mod = ENVIRONMENT_LIGHTING_MODIFIERS.find((m) => m.id === modifierId);
  const phrase = modifierPhrase || mod?.phrase;
  if (!phrase) return false;
  return prompt.includes(phrase);
}

/**
 * Reconciles lighting modifiers on a prompt:
 * - If already active -> toggles off (strips modifier phrase).
 * - If applying new modifier -> strips conflicting modifier phrases and neutralizes contradictory ambient light in base text.
 */
export function reconcileLightingModifier(
  currentPrompt: string,
  modifierId: string,
  modifierPhrase?: string
): string {
  if (!currentPrompt) return modifierPhrase || "";

  const mod = ENVIRONMENT_LIGHTING_MODIFIERS.find((m) => m.id === modifierId);
  const phrase = modifierPhrase || mod?.phrase;
  if (!phrase) return currentPrompt;

  // 1. Toggle Off: If user clicks the currently active modifier, cleanly remove it
  if (currentPrompt.includes(phrase)) {
    const toggled = currentPrompt.replace(phrase, "");
    return cleanPromptSyntax(toggled);
  }

  // 2. Strip all other canonical lighting modifier phrases first
  let cleaned = stripAllCanonicalLightingPhrases(currentPrompt);

  // 3. Reconcile base prompt ambient light adjectives depending on the target scheme
  if (modifierId === "moody_twilight") {
    // Strip daylight references
    for (const pattern of DAYLIGHT_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    // Replace "sunlit" with "ambiently lit" or "expansive"
    cleaned = cleaned
      .replace(/\ban\s+expansive\s+sunlit\b/gi, "an expansive architectural")
      .replace(/\bsunlit\s+luxury\b/gi, "luxury evening")
      .replace(/\bsunlit\s+Scandinavian\b/gi, "Nordic twilight")
      .replace(/\bsunlit\b/gi, "atmospheric");
  } else if (modifierId === "sunlit_daylight") {
    // Strip twilight & low-key references
    for (const pattern of TWILIGHT_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    for (const pattern of NEON_CYBERPUNK_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    // Restore "sunlit" if previously replaced with atmospheric/twilight
    cleaned = cleaned
      .replace(/\ban\s+expansive\s+architectural\b/gi, "an expansive sunlit")
      .replace(/\bluxury\s+evening\b/gi, "sunlit luxury")
      .replace(/\bNordic\s+twilight\b/gi, "sunlit Scandinavian");
  } else if (modifierId === "golden_hour") {
    // Golden hour handles dusk sunlight; strip harsh softbox and cool cyan/magenta
    for (const pattern of STUDIO_SOFTBOX_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    for (const pattern of NEON_CYBERPUNK_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    cleaned = cleaned
      .replace(/\ban\s+expansive\s+sunlit\b/gi, "an expansive golden-hour")
      .replace(/\bsunlit\b/gi, "golden-hour");
  } else if (modifierId === "studio_softbox") {
    // Neutral studio catalog: strip outdoor sunlight and moody dramatic shadows
    for (const pattern of DAYLIGHT_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    for (const pattern of TWILIGHT_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    for (const pattern of NEON_CYBERPUNK_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    cleaned = cleaned.replace(/\bsunlit\b/gi, "studio staged");
  } else if (modifierId === "neon_cyberpunk") {
    // Cyberpunk: strip natural daylight and neutral softbox
    for (const pattern of DAYLIGHT_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    for (const pattern of STUDIO_SOFTBOX_CONFLICT_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    cleaned = cleaned.replace(/\bsunlit\b/gi, "dark reflective");
  }

  // 4. Append the selected modifier phrase
  cleaned = cleanPromptSyntax(cleaned);
  const finalPrompt = cleaned ? `${cleaned}, ${phrase}` : phrase;
  return cleanPromptSyntax(finalPrompt);
}

/**
 * Reconciles camera motion presets on a prompt:
 * Replaces any existing "Camera: ..." or known camera motion phrases with the new camera cue phrase.
 */
const KNOWN_CAMERA_PHRASES: RegExp[] = [
  /Camera:\s*[^,.]*(\.|$)/gi,
  /Cinematic\s+(FPV\s+drone|drone\s+flyover|floating\s+aerial\s+glide)\s+[^,.]*(\.|$)/gi,
  /Smooth\s+floating\s+airborne\s+tracking\s+[^,.]*(\.|$)/gi,
  /Smooth\s+3D\s+push-in\s+[^,.]*(\.|$)/gi,
  /Very\s+subtle\s+continuous\s+3D\s+arc\s+orbit\s+[^,.]*(\.|$)/gi,
  /Smooth\s+robotic\s+studio\s+crane\s+shot\s+[^,.]*(\.|$)/gi,
  /Smooth\s+continuous\s+dolly\s+pull-back\s+[^,.]*(\.|$)/gi,
  /Continuous\s+subtle\s+3D\s+orbital\s+camera\s+[^,.]*(\.|$)/gi,
  /Slow\s+cinematic\s+3D\s+dolly\s+push-in\s+[^,.]*(\.|$)/gi,
];

export function reconcileCameraCue(currentPrompt: string, newCuePhrase: string): string {
  if (!currentPrompt) return `Camera: ${newCuePhrase}`;

  let cleaned = currentPrompt;
  for (const pat of KNOWN_CAMERA_PHRASES) {
    cleaned = cleaned.replace(pat, "");
  }

  cleaned = cleanPromptSyntax(cleaned);
  const finalPrompt = cleaned ? `${cleaned} Camera: ${newCuePhrase}` : `Camera: ${newCuePhrase}`;
  return cleanPromptSyntax(finalPrompt);
}
