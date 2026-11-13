/**
 * Voice Presets for the Modern-TTS engine.
 * Each preset defines a character with tuned generation parameters.
 *
 * Parameters:
 * - exaggeration: 0.0–1.0. Controls emotional expressiveness/intensity.
 * - cfgWeight:    0.0–1.0. How closely to follow the reference voice. Higher = more consistent.
 * - temperature:  0.5–1.5. Controls randomness. Lower = more deterministic/flat, Higher = more varied.
 * - speed:        0.5–2.0. Post-processing playback speed multiplier.
 * - pitchShift:   -6 to +6 semitones. Web Audio API post-processing.
 * - maxNewTokens: Governs max audio length per chunk. 1200 ≈ 25–30s on M4 Mac Mini.
 */

export interface VoiceParams {
  exaggeration: number;
  cfgWeight: number;
  temperature: number;
  speed: number;
  pitchShift: number;
  maxNewTokens: number;
  chunkSize: number;
}

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  language: "en" | "es" | "fr" | "it" | "de" | "pt" | "zh" | "ja";
  gender: "female" | "male";
  params: VoiceParams;
}

export const DEFAULT_VOICE_PARAMS: VoiceParams = {
  exaggeration: 0.55,
  cfgWeight: 0.65,
  temperature: 0.8,
  speed: 1.0,
  pitchShift: 0,
  maxNewTokens: 1200,
  chunkSize: 200,
};

export const VOICE_PRESETS: VoicePreset[] = [
  // ──────────────────────────────────────────────
  // FEMALE VOICES
  // ──────────────────────────────────────────────
  {
    id: "ruby",
    name: "Ruby",
    description: "Confident, clear, professional news anchor (EN).",
    icon: "👩‍💼",
    accentColor: "#10b981",
    language: "en",
    gender: "female",
    params: {
      exaggeration: 0.55,
      cfgWeight: 0.65,
      temperature: 0.80,
      speed: 1.0,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "breaking-female",
    name: "Storm",
    description: "Urgent, punchy, breaking-news delivery (EN).",
    icon: "🚨",
    accentColor: "#ef4444",
    language: "en",
    gender: "female",
    params: {
      exaggeration: 0.80,
      cfgWeight: 0.70,
      temperature: 0.85,
      speed: 1.1,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "soft",
    name: "Luna",
    description: "Gentle, warm, soothing narration (EN).",
    icon: "🌙",
    accentColor: "#6d28d9",
    language: "en",
    gender: "female",
    params: {
      exaggeration: 0.30,
      cfgWeight: 0.50,
      temperature: 0.70,
      speed: 0.88,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "hype-female",
    name: "Blaze",
    description: "Energetic, excited, high-energy promo (EN).",
    icon: "🔥",
    accentColor: "#f97316",
    language: "en",
    gender: "female",
    params: {
      exaggeration: 0.90,
      cfgWeight: 0.75,
      temperature: 0.95,
      speed: 1.15,
      pitchShift: 1,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "isabel",
    name: "Isabel",
    description: "Clear, professional news anchor — Español (ES).",
    icon: "🇪🇸",
    accentColor: "#f59e0b",
    language: "es",
    gender: "female",
    params: {
      exaggeration: 0.55,
      cfgWeight: 0.65,
      temperature: 0.80,
      speed: 1.0,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "claire",
    name: "Claire",
    description: "Elegant, precise broadcast voice — Français (FR).",
    icon: "🇫🇷",
    accentColor: "#60a5fa",
    language: "fr",
    gender: "female",
    params: {
      exaggeration: 0.50,
      cfgWeight: 0.60,
      temperature: 0.78,
      speed: 0.95,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },

  // ──────────────────────────────────────────────
  // MALE VOICES
  // ──────────────────────────────────────────────
  {
    id: "guest",
    name: "Aris",
    description: "Measured, authoritative expert tone (EN).",
    icon: "👨‍🔬",
    accentColor: "#3b82f6",
    language: "en",
    gender: "male",
    params: {
      exaggeration: 0.45,
      cfgWeight: 0.60,
      temperature: 0.75,
      speed: 0.95,
      pitchShift: -4, // Shift down for male timbre
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "documentary",
    name: "Atlas",
    description: "Deep, calm documentary narrator (EN).",
    icon: "🎬",
    accentColor: "#a78bfa",
    language: "en",
    gender: "male",
    params: {
      exaggeration: 0.35,
      cfgWeight: 0.55,
      temperature: 0.70,
      speed: 0.90,
      pitchShift: -5,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "breaking-male",
    name: "Hawk",
    description: "Bold, commanding breaking-news voice (EN).",
    icon: "📡",
    accentColor: "#dc2626",
    language: "en",
    gender: "male",
    params: {
      exaggeration: 0.75,
      cfgWeight: 0.72,
      temperature: 0.85,
      speed: 1.05,
      pitchShift: -4,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "hype-male",
    name: "Volt",
    description: "Hyped, energetic promo narrator (EN).",
    icon: "⚡",
    accentColor: "#eab308",
    language: "en",
    gender: "male",
    params: {
      exaggeration: 0.88,
      cfgWeight: 0.75,
      temperature: 0.92,
      speed: 1.12,
      pitchShift: -3,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "marcos",
    name: "Marcos",
    description: "Warm, authoritative anchor — Español (ES).",
    icon: "🇲🇽",
    accentColor: "#22c55e",
    language: "es",
    gender: "male",
    params: {
      exaggeration: 0.55,
      cfgWeight: 0.65,
      temperature: 0.80,
      speed: 1.0,
      pitchShift: -4,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "luca",
    name: "Luca",
    description: "Resonant, expressive narrator — Italiano (IT).",
    icon: "🇮🇹",
    accentColor: "#f43f5e",
    language: "it",
    gender: "male",
    params: {
      exaggeration: 0.60,
      cfgWeight: 0.62,
      temperature: 0.82,
      speed: 0.97,
      pitchShift: -4,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
  {
    id: "kai",
    name: "Kai",
    description: "Clear, modern tech-news voice — Deutsch (DE).",
    icon: "🇩🇪",
    accentColor: "#64748b",
    language: "de",
    gender: "male",
    params: {
      exaggeration: 0.50,
      cfgWeight: 0.60,
      temperature: 0.78,
      speed: 0.98,
      pitchShift: -3,
      maxNewTokens: 1200,
      chunkSize: 200,
    },
  },
];

export function getPresetById(id: string): VoicePreset | undefined {
  return VOICE_PRESETS.find((p) => p.id === id);
}
