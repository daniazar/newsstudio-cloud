/**
 * src/lib/teleprompter/speechCoachEngine.ts
 *
 * Speech Coach & Teleprompter Timing Engine.
 * Computes real-time Words Per Minute (WPM), pace stability, pause adherence,
 * auto-scroll velocities, and AI broadcast phrasing polish via unified AI SDK gateway.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";

export interface SpeechCadenceMetrics {
  currentWpm: number;
  targetWpm: number;
  status: "too_slow" | "optimal" | "too_fast";
  paceScore: number; // 0-100
  pauseAdherenceScore: number; // 0-100
  totalSpokenWords: number;
  totalRemainingWords: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
}

export interface TeleprompterConfig {
  targetWpm: number; // default: 150
  fontSizePx: number; // default: 42
  isMirrored: boolean; // For optical beam-splitter glass
  colorTheme: "dark_studio" | "high_contrast" | "neon_cyber" | "soft_warm";
  lineHeightMultiplier: number; // default: 1.6
}

export const DEFAULT_TELEPROMPTER_CONFIG: TeleprompterConfig = {
  targetWpm: 150,
  fontSizePx: 42,
  isMirrored: false,
  colorTheme: "dark_studio",
  lineHeightMultiplier: 1.6,
};

export const SCRIPT_POLISHER_SYSTEM_PROMPT = `You are a legendary broadcast television vocal coach and executive speechwriter.

## Task
Take the user's raw script or article text and rewrite it into punchy, highly readable broadcast teleprompter copy.

## Rules
1. Break long complex sentences into short, rhythmic broadcast phrasing (10-16 words per sentence).
2. Insert strategic breathing pause markers: [pause: 0.3s] or [pause: 0.5s] before key numbers or revelations.
3. Insert natural emotion tags: [urgent], [excited], [serious], [calm], [storyteller].
4. Spell out large numbers phonetically for seamless pronunciation (e.g. "$138.5 Billion" -> "one hundred thirty-eight point five billion dollars").
5. Return ONLY valid JSON:
{
  "polishedText": "Polished script with tags...",
  "suggestedWpm": 150,
  "estimatedDurationSeconds": 45.0,
  "keyTips": ["Emphasize the 84% statistic", "Take a full breath before the conclusion"]
}`;

export const PolishedSpeechSchema = z.object({
  polishedText: z.string().default("").catch(""),
  suggestedWpm: z.number().default(150).catch(150),
  estimatedDurationSeconds: z.number().default(45).catch(45),
  keyTips: z.array(z.string()).default([]).catch([]),
});

/**
 * Calculates current WPM and pace health.
 */
export function calculateCadenceMetrics(
  spokenWordsCount: number,
  totalWordsCount: number,
  elapsedSeconds: number,
  targetWpm = 150
): SpeechCadenceMetrics {
  const safeSeconds = Math.max(1, elapsedSeconds);
  const currentWpm = Math.round((spokenWordsCount / safeSeconds) * 60);

  let status: "too_slow" | "optimal" | "too_fast" = "optimal";
  if (currentWpm < targetWpm - 25) status = "too_slow";
  else if (currentWpm > targetWpm + 25) status = "too_fast";

  // Pace score calculation (100 is exact match with targetWpm)
  const diff = Math.abs(currentWpm - targetWpm);
  const paceScore = Math.max(0, Math.min(100, Math.round(100 - diff * 1.5)));

  const remainingWords = Math.max(0, totalWordsCount - spokenWordsCount);
  const estimatedRemainingSeconds = Math.round((remainingWords / Math.max(80, targetWpm)) * 60);

  return {
    currentWpm,
    targetWpm,
    status,
    paceScore,
    pauseAdherenceScore: Math.min(100, paceScore + 5),
    totalSpokenWords: spokenWordsCount,
    totalRemainingWords: remainingWords,
    elapsedSeconds,
    estimatedRemainingSeconds,
  };
}

/**
 * Calculates pixel auto-scroll velocity (pixels per second).
 */
export function calculateScrollVelocity(
  targetWpm: number,
  fontSizePx: number,
  containerWidthPx = 800,
  lineHeightMultiplier = 1.6
): number {
  // Average characters per word = 5, average char width ≈ fontSize * 0.55
  const avgCharWidth = fontSizePx * 0.55;
  const charsPerLine = Math.max(20, Math.floor(containerWidthPx / avgCharWidth));
  const wordsPerLine = Math.max(3, charsPerLine / 5.5);
  const lineHeightPx = fontSizePx * lineHeightMultiplier;

  const linesPerMinute = targetWpm / wordsPerLine;
  const pixelsPerMinute = linesPerMinute * lineHeightPx;
  return Math.max(10, pixelsPerMinute / 60);
}

/**
 * AI Script Polisher for Broadcast Phrasing via unified AI SDK gateway.
 */
export async function polishScriptForSpeech(
  rawText: string,
  targetWpm = 150
): Promise<{
  polishedText: string;
  suggestedWpm: number;
  estimatedDurationSeconds: number;
  keyTips: string[];
}> {
  try {
    const { object } = await generateLlmObject({
      schema: PolishedSpeechSchema,
      schemaName: "PolishedSpeech",
      system: SCRIPT_POLISHER_SYSTEM_PROMPT,
      prompt: `POLISH SCRIPT FOR TELEPROMPTER SPEECH:\n\n${rawText.slice(0, 4000)}`,
      temperature: 0.4,
      tier: "structured",
      allowFallback: true,
    });

    if (!object.polishedText) {
      return generateFallbackPolishedScript(rawText, targetWpm);
    }

    return object;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[polishScriptForSpeech] LLM generation failed, using fallback:", msg);
    return generateFallbackPolishedScript(rawText, targetWpm);
  }
}

/**
 * Heuristic script polisher when offline.
 */
export function generateFallbackPolishedScript(
  rawText: string,
  targetWpm = 150
): {
  polishedText: string;
  suggestedWpm: number;
  estimatedDurationSeconds: number;
  keyTips: string[];
} {
  const sentences = rawText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const polished = sentences
    .map((s, idx) => {
      const tag = idx === 0 ? "[urgent] " : idx % 3 === 0 ? "[pause: 0.4s] [serious] " : "";
      return `${tag}${s}.`;
    })
    .join("\n\n");

  const wordCount = polished.split(/\s+/).filter(Boolean).length;
  const durationSec = Math.round(wordCount / (targetWpm / 60));

  return {
    polishedText: polished || rawText,
    suggestedWpm: targetWpm,
    estimatedDurationSeconds: durationSec,
    keyTips: [
      "Pace steady at 150 WPM for crisp anchor authority.",
      "Observe the 0.4-second breath pauses before major numbers.",
      "Keep eye contact aligned with the center glass guideline.",
    ],
  };
}
