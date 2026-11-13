/**
 * src/lib/ai/comfy/image/interactionDetector.ts
 *
 * Scene Contact Classification & Interaction Intensity Engine (Part 11 — IMAGE_ROADMAP.md).
 * Computes numerical interaction intensity score (0-100) and maps to pipeline execution modes
 * (SEQUENTIAL, HYBRID, SIMULTANEOUS, TANDEM_SKELETON).
 */

import { PipelineMode } from "../types";

/**
 * Computes continuous interaction intensity score (0–100) from scene text keywords.
 */
export function computeInteractionIntensity(sceneText?: string): number {
  if (!sceneText || !sceneText.trim()) return 15; // Default low contact
  const lower = sceneText.toLowerCase();

  // Full contact keywords → 71–100
  const fullContact = [
    "intercourse", "penetration", "doggystyle", "cowgirl", "missionary",
    "blowjob", "fellatio", "anal", "kneeling submissive", "titfuck", "paizuri", "creampie"
  ];
  if (fullContact.some(k => lower.includes(k))) return 85;

  // Moderate contact keywords → 41–70
  const moderateContact = [
    "kissing", "hugging", "embracing", "lap sitting", "hand on chest",
    "holding back of head", "dominant hands", "submissive", "kneeling", "pressed against"
  ];
  if (moderateContact.some(k => lower.includes(k))) return 55;

  // Soft contact keywords → 21–40
  const softContact = [
    "leaning toward", "shoulder touching", "close together", "side by side",
    "inches apart", "faces close", "almost touching"
  ];
  if (softContact.some(k => lower.includes(k))) return 30;

  // No contact keywords → 0–20
  const noContact = [
    "across the room", "opposite sofa", "separate chairs", "standing apart",
    "different corners", "facing camera", "anchor desk", "news desk"
  ];
  if (noContact.some(k => lower.includes(k))) return 5;

  return 15;
}

/**
 * Maps numerical interaction intensity score (0–100) to pipeline execution mode.
 */
export function selectPipelineMode(intensityScore: number): PipelineMode {
  if (intensityScore >= 71) {
    return "TANDEM_SKELETON";
  } else if (intensityScore >= 41) {
    return "SIMULTANEOUS";
  } else if (intensityScore >= 21) {
    return "HYBRID";
  } else {
    return "SEQUENTIAL";
  }
}

/**
 * Returns true if prompt text contains physical contact or intimate interaction keywords.
 */
export function hasPhysicalContact(promptText: string): boolean {
  return computeInteractionIntensity(promptText) >= 41;
}

/**
 * Automatically determines optimal pipeline mode (SEQUENTIAL, HYBRID, SIMULTANEOUS, TANDEM_SKELETON)
 * based on dual-persona scene text and contact intensity.
 */
export function determineSmartPipelineMode(promptText: string, isDualPersona: boolean): PipelineMode {
  if (!isDualPersona) {
    return "SEQUENTIAL";
  }

  const score = computeInteractionIntensity(promptText);
  return selectPipelineMode(score);
}

/**
 * Task CC-10: Returns true if scene text unambiguously matches a contact tier,
 * enabling auto-selection and skipping CLI wizard mode questions.
 */
export function isUnambiguousInteraction(sceneText?: string): boolean {
  if (!sceneText || !sceneText.trim()) return true;
  const score = computeInteractionIntensity(sceneText);
  return score <= 10 || score >= 75;
}
