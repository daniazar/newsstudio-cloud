/**
 * src/lib/ecommerce/cadenceOptimizer.ts
 *
 * Automatic Speech Cadence & Breath Optimizer for Commercial Video Ads.
 * Automatically injects natural breathing pauses ("...", "—"), sentence boundary breaks,
 * and phonetic normalization across all scene scripts for realistic neural TTS prosody.
 *
 * Runs automatically during script generation and before voice synthesis
 * with ZERO manual button clicks required.
 */

import { expandAcronyms } from "@/lib/ai/pronunciationDetector";

export interface CadenceOptimizationOptions {
  language?: string;
  enableAcronymExpansion?: boolean;
  breathPauseIntensity?: "light" | "medium" | "dramatic";
}

/**
 * Automatically injects breathing pauses ("...", "—"), sentence boundary breaks,
 * and expands acronyms into phonetic spoken words for realistic neural TTS prosody.
 */
export function optimizeSpeechCadence(
  text: string,
  options: CadenceOptimizationOptions | string = {}
): string {
  if (!text || !text.trim()) return "";

  const opts: CadenceOptimizationOptions =
    typeof options === "string" ? { language: options } : options;

  const lang = (opts.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
  const expandAcronymsEnabled = opts.enableAcronymExpansion !== false;

  let polished = text.trim();

  // 1. Phonetic Acronym Expansion (e.g. "EE.UU." -> "Estados Unidos", "AI" -> "Inteligencia Artificial")
  if (expandAcronymsEnabled) {
    try {
      polished = expandAcronyms(polished, lang);
    } catch {
      // Fallback gracefully if glossary fails
    }
  }

  // 2. Protect prices and decimal numbers (e.g. "$18.500", "3,5 mm", "99.99")
  // Replace decimal commas/periods temporarily with unique placeholders
  const numberPlaceholders: string[] = [];
  polished = polished.replace(/(\$?\d+[\.,]\d+(?:[\.,]\d+)?)/g, (match) => {
    const token = `__NUM_TOKEN_${numberPlaceholders.length}__`;
    numberPlaceholders.push(match);
    return token;
  });

  // Also protect inline sound effect tags: [sfx:whoosh]
  const sfxPlaceholders: string[] = [];
  polished = polished.replace(/\[sfx:[^\]]+\]/gi, (match) => {
    const token = `__SFX_TOKEN_${sfxPlaceholders.length}__`;
    sfxPlaceholders.push(match);
    return token;
  });

  // 3. Inject Natural Breathing Pauses for Neural TTS Prosody:
  // - Commas become breathing ellipses "... " (creates 150-250ms vocal inhale pause)
  polished = polished.replace(/,\s*/g, "... ");

  // - Semicolons become an em-dash rhythmic boundary
  polished = polished.replace(/;\s*/g, " — ");

  // - Periods followed by words become a distinct sentence boundary pause (". ... ")
  polished = polished.replace(/(?<!\.)\.\s+(?=[A-Z¡¿a-z0-9])/g, ". ... ");

  // - Exclamation marks & question marks followed by words get breathing spacing
  polished = polished.replace(/([!?])\s+(?=[A-Z¡¿a-z0-9])/g, "$1 ... ");

  // 4. Normalize and Clean Excessive Ellipses / Dots (cap at 3 dots max)
  polished = polished
    .replace(/\.{4,}/g, "...")
    .replace(/\s+\.\.\./g, "...")
    .replace(/\.\.\.\s*/g, "... ");

  // 5. Restore Protected Placeholders
  polished = polished.replace(/__NUM_TOKEN_(\d+)__/g, (_, idx) => numberPlaceholders[Number(idx)] || "");
  polished = polished.replace(/__SFX_TOKEN_(\d+)__/g, (_, idx) => sfxPlaceholders[Number(idx)] || "");

  // 6. Final whitespace normalization
  return polished.replace(/\s{2,}/g, " ").trim();
}
