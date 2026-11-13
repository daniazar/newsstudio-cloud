/**
 * NewsStudio — Speech Emotion & Cadence Presets
 * 
 * Defines broadcast cadence profiles for modulating speech speed (0.85x - 1.25x),
 * pitch variance (-1.0st to +2.5st), procedural breath pauses, and instruction conditioning.
 */

import { TtsEngineType } from "./textPreprocessor";

export type CadencePresetId = 
  | "urgent_breaking" 
  | "solemn_report" 
  | "casual_banter" 
  | "standard_anchor";

export interface CadencePreset {
  id: CadencePresetId;
  name: string;
  label: string;
  description: string;
  icon: string;
  accentColor: string;
  speedMultiplier: number; // Pacing speed bounds (0.85x - 1.25x)
  pitchVarianceSemitones: number; // Pitch micro-tuning in semitones (-1.5 to +2.5)
  pauseDurationMultiplier: number; // Relative pause spacing factor (0.6x to 1.5x)
  breathPauseFrequency: "frequent" | "sparse" | "natural" | "balanced";
  energy: number; // 0.0 to 1.0 excitement scale
  promptInstruct: string; // Multi-engine instruction prompt for CosyVoice / Bark / Parler
  recommendedEngine: TtsEngineType;
}

export const CADENCE_PRESETS: Record<CadencePresetId, CadencePreset> = {
  urgent_breaking: {
    id: "urgent_breaking",
    name: "🚨 Urgent Breaking",
    label: "Urgent Breaking News",
    description: "High-energy, fast-paced breaking news bulletin with sharp staccato clauses and punchy micro-breaths.",
    icon: "🚨",
    accentColor: "#ef4444",
    speedMultiplier: 1.18, // Within 1.15x - 1.25x range
    pitchVarianceSemitones: 1.8,
    pauseDurationMultiplier: 0.65,
    breathPauseFrequency: "frequent",
    energy: 0.95,
    promptInstruct: "Urgent breaking news bulletin, fast-paced high energy delivery with sharp authoritative emphasis and rapid delivery",
    recommendedEngine: "f5_tts",
  },
  solemn_report: {
    id: "solemn_report",
    name: "🕊️ Solemn Report",
    label: "Solemn & Serious Report",
    description: "Measured, deep, reverent pacing for serious events, memorials, and solemn investigative reports.",
    icon: "🕊️",
    accentColor: "#6366f1",
    speedMultiplier: 0.88, // Within 0.85x - 0.90x range
    pitchVarianceSemitones: -1.0,
    pauseDurationMultiplier: 1.45,
    breathPauseFrequency: "sparse",
    energy: 0.25,
    promptInstruct: "Solemn and respectful news report, measured cadence with gentle, serious intonation and extended reverent pauses",
    recommendedEngine: "f5_tts",
  },
  casual_banter: {
    id: "casual_banter",
    name: "☕ Casual Banter",
    label: "Casual Morning Banter",
    description: "Warm, expressive, conversational cadence suited for morning shows, culture features, and podcast dialogues.",
    icon: "☕",
    accentColor: "#f59e0b",
    speedMultiplier: 1.04, // Within 1.00x - 1.05x range
    pitchVarianceSemitones: 0.8,
    pauseDurationMultiplier: 0.9,
    breathPauseFrequency: "natural",
    energy: 0.65,
    promptInstruct: "Casual friendly banter, warm conversational morning show tone with lively dynamic vocal inflection",
    recommendedEngine: "cosyvoice_3",
  },
  standard_anchor: {
    id: "standard_anchor",
    name: "📰 Standard Anchor",
    label: "Standard Prime-Time Anchor",
    description: "Authoritative, crisp, balanced prime-time evening news broadcast cadence.",
    icon: "📰",
    accentColor: "#10b981",
    speedMultiplier: 1.00, // 1.00x baseline
    pitchVarianceSemitones: 0.0,
    pauseDurationMultiplier: 1.0,
    breathPauseFrequency: "balanced",
    energy: 0.50,
    promptInstruct: "Professional prime-time television news anchor, clear authoritative cadence and balanced delivery",
    recommendedEngine: "f5_tts",
  },
};

export const CADENCE_PRESET_LIST: CadencePreset[] = Object.values(CADENCE_PRESETS);

/**
 * Look up a cadence preset by ID (with fallback to standard_anchor).
 */
export function getCadencePreset(id?: string | null): CadencePreset {
  if (!id) return CADENCE_PRESETS.standard_anchor;
  const key = id.toLowerCase().replace(/[^a-z_]/g, "") as CadencePresetId;
  return CADENCE_PRESETS[key] || CADENCE_PRESETS.standard_anchor;
}

export interface AppliedCadenceResult {
  processedText: string;
  speed: number;
  pitchShift: number;
  pauseMultiplier: number;
  instructText: string;
  cadence: CadencePreset;
}

/**
 * Applies cadence preset modulation to text:
 * - Modulates speed between 0.85x and 1.25x
 * - Sets pitch shift
 * - Modulates punctuation for breathing pauses according to preset frequency
 */
export function applyCadencePreset(
  text: string,
  presetInput?: CadencePresetId | CadencePreset | string
): AppliedCadenceResult {
  const preset = typeof presetInput === "object" && presetInput !== null
    ? presetInput
    : getCadencePreset(typeof presetInput === "string" ? presetInput : undefined);

  let processedText = text ? text.trim() : "";

  // Adjust breath pauses according to frequency
  if (preset.breathPauseFrequency === "frequent") {
    // Insert punchy pauses for urgent breaking news
    processedText = processedText.replace(/([.!?])\s+/g, "$1... ");
    processedText = processedText.replace(/([,:])\s*/g, " -- ");
  } else if (preset.breathPauseFrequency === "sparse") {
    // Slower, elongated pauses for solemn reporting
    processedText = processedText.replace(/([.!?])\s+/g, "$1... ... ");
  } else if (preset.breathPauseFrequency === "natural") {
    // Natural conversational commas
    processedText = processedText.replace(/([;])\s*/g, ", ");
  }

  return {
    processedText,
    speed: preset.speedMultiplier,
    pitchShift: preset.pitchVarianceSemitones,
    pauseMultiplier: preset.pauseDurationMultiplier,
    instructText: preset.promptInstruct,
    cadence: preset,
  };
}
