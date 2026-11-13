/**
 * scripts/gemini-cli/expressionPresets.ts
 *
 * Facial Emotion & Expression Presets for Broadcast Presenters.
 */

import { ExpressionPreset } from "./types";

export const EXPRESSION_PRESETS: Record<string, ExpressionPreset> = {
  calm_authoritative: {
    id: "calm_authoritative",
    label: "🎙️ Calm & Authoritative (Prime-time prime news anchor delivery)",
    prompt: "Calm, authoritative, prime-time news anchor expression with steady confident gaze, relaxed brow, and articulate broadcast poise.",
  },
  warm_engaging_smile: {
    id: "warm_engaging_smile",
    label: "😊 Warm & Engaging Smile (Welcoming broadcast host)",
    prompt: "Warm, welcoming broadcast host smile with friendly engaged eye contact, radiant confidence, and natural subtle smile lines around eyes.",
  },
  intense_breaking_news: {
    id: "intense_breaking_news",
    label: "🚨 Intense Breaking News (Urgent headline focus)",
    prompt: "Intense, focused breaking-news expression with sharp direct eye contact into the lens, serious commanding demeanor, lips slightly parted speaking an urgent headline bulletin.",
  },
  thoughtful_analytical: {
    id: "thoughtful_analytical",
    label: "🤔 Thoughtful & Analytical (Investigative rundown)",
    prompt: "Thoughtful, analytical expression with head slightly tilted, focused investigative eye gaze, intelligent and discerning presentation.",
  },
  energetic_enthusiastic: {
    id: "energetic_enthusiastic",
    label: "⚡ Energetic & Dynamic (Tech / Market / Entertainment)",
    prompt: "Dynamic, energetic presentation expression with bright open eyes, charismatic enthusiastic smile, and lively broadcast engagement.",
  },
  serious_concerned: {
    id: "serious_concerned",
    label: "⚠️ Serious & Concerned (Crisis / Deep investigative)",
    prompt: "Grave, serious concerned expression suitable for deep investigative journalism or crisis coverage, empathetic and attentive gaze.",
  },
  neutral_professional: {
    id: "neutral_professional",
    label: "⚖️ Neutral Composed Professional",
    prompt: "Neutral, composed, professional studio broadcast expression facing forward with perfect broadcast composure.",
  },
};
