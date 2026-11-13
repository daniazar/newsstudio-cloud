/**
 * src/lib/ai/viralityDetector.ts
 *
 * Gemini 2.5 Flash Virality Analyzer for AI Shorts & Auto-Reels Clipper.
 * Analyzes news scripts and transcripts, scores segments on a 0-100 Virality Index,
 * identifies curiosity gaps, conflict, and climax moments, and outputs optimized 15s-45s vertical clips.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";

export interface ViralClipMoment {
  id: string;
  rank: number;
  title: string;
  hookHeadline: string;           // Bold on-screen hook banner (e.g. "THIS CHANGES EVERYTHING")
  viralScore: number;             // 0-100
  hookScore: number;              // 0-100 (Opening 3-second retention power)
  conflictScore: number;          // 0-100 (Debate/shock/surprise factor)
  climaxScore: number;            // 0-100 (Takeaway/conclusion punch)
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  startFrame: number;
  endFrame: number;
  rationale: string;              // Why this clip is likely to perform virally
  suggestedCaptionStyle: "hormozi_glow" | "beast_pop" | "cyber_neon" | "minimal_clean";
  hashtags: string[];
  excerptText: string;
}

export interface ViralityAnalysisResult {
  overallStoryScore: number;
  primaryHook: string;
  clips: ViralClipMoment[];
}

export const ViralClipMomentSchema = z.object({
  rank: z.number().optional(),
  title: z.string().default("Viral Clip"),
  hookHeadline: z.string().default("THIS CHANGES EVERYTHING"),
  viralScore: z.number().default(85),
  hookScore: z.number().default(85),
  conflictScore: z.number().default(85),
  climaxScore: z.number().default(85),
  startTimeSeconds: z.number().optional(),
  endTimeSeconds: z.number().optional(),
  durationSeconds: z.number().optional(),
  rationale: z.string().default("High retention potential"),
  suggestedCaptionStyle: z.enum(["hormozi_glow", "beast_pop", "cyber_neon", "minimal_clean"]).catch("hormozi_glow"),
  hashtags: z.array(z.string()).default(["#BreakingNews", "#Trending"]),
  excerptText: z.string().default(""),
});

export const ViralityAnalysisSchema = z.object({
  overallStoryScore: z.number().default(85),
  primaryHook: z.string().default("Unprecedented Market Shock Revealed"),
  clips: z.array(ViralClipMomentSchema).default([]),
});

export const VIRALITY_SYSTEM_PROMPT = `You are a viral short-form video strategist and content algorithm expert (TikTok, YouTube Shorts, Instagram Reels).

## Task
Analyze the provided news story/script, identify the TOP 3 most viral 15s–45s standalone moments, and score them based on short-form retention mechanics.

## Virality Scoring Criteria (0–100)
1. **Hook Score (0–100):** Does the opening sentence trigger an irresistible curiosity gap or emotional reaction in the first 3 seconds?
2. **Conflict / Shock Score (0–100):** Does it contain stark comparisons, massive numbers, controversy, unexpected revelations, or high stakes?
3. **Climax Score (0–100):** Does it deliver a satisfying punchline, actionable takeaway, or mind-blowing conclusion?
4. **Overall Viral Score (0–100):** Weighted average (40% Hook + 40% Conflict + 20% Climax).`;

export async function analyzeScriptVirality(
  scriptText: string,
  options: { fps?: number; wpm?: number } = {}
): Promise<ViralityAnalysisResult> {
  const fps = options.fps || 30;
  const wpm = options.wpm || 150;
  const effectiveWps = wpm / 60;

  try {
    const userPrompt = `ANALYZE SCRIPT TRANSCRIPT FOR VIRAL SHORTS CLIPS:\n\n${scriptText.slice(0, 6000)}`;

    const { object: parsed } = await generateLlmObject({
      schema: ViralityAnalysisSchema,
      schemaName: "ViralityShortsAnalysis",
      system: VIRALITY_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.5,
      tier: "structured",
    });

    const clips: ViralClipMoment[] = (parsed.clips || []).map((c, idx) => {
      const startSec = c.startTimeSeconds ?? idx * 25;
      const endSec = c.endTimeSeconds ?? startSec + (c.durationSeconds ?? 30);
      const durSec = endSec - startSec;

      return {
        ...c,
        id: `viral_clip_${idx + 1}_${Date.now()}`,
        rank: c.rank ?? idx + 1,
        startTimeSeconds: startSec,
        endTimeSeconds: endSec,
        durationSeconds: durSec,
        startFrame: Math.round(startSec * fps),
        endFrame: Math.round(endSec * fps),
        suggestedCaptionStyle: c.suggestedCaptionStyle || "hormozi_glow",
        hashtags: c.hashtags && c.hashtags.length > 0 ? c.hashtags : ["#Breaking", "#News", "#Trending"],
      };
    });

    return {
      overallStoryScore: parsed.overallStoryScore || 85,
      primaryHook: parsed.primaryHook || "Unprecedented Market Shock Revealed",
      clips: clips.length > 0 ? clips : generateFallbackViralityAnalysis(scriptText, fps, effectiveWps).clips,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[analyzeScriptVirality] LLM analysis failed, using heuristic fallback:", msg);
    return generateFallbackViralityAnalysis(scriptText, fps, effectiveWps);
  }
}

/**
 * Heuristic fallback when Gemini API is offline.
 */
export function generateFallbackViralityAnalysis(
  scriptText: string,
  fps = 30,
  effectiveWps = 2.5
): ViralityAnalysisResult {
  const sentences = scriptText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const totalWords = scriptText.split(/\s+/).filter(Boolean).length;
  const totalDurationSec = totalWords / effectiveWps;

  // Generate 3 clip windows
  const clip1End = Math.min(30, totalDurationSec * 0.4);
  const clip2Start = Math.min(totalDurationSec * 0.3, totalDurationSec - 30);
  const clip2End = Math.min(clip2Start + 30, totalDurationSec * 0.75);
  const clip3Start = Math.max(0, totalDurationSec - 30);

  const clips: ViralClipMoment[] = [
    {
      id: `fallback_clip_1_${Date.now()}`,
      rank: 1,
      title: "Opening Shock Revelation",
      hookHeadline: "THIS CHANGES EVERYTHING",
      viralScore: 92,
      hookScore: 95,
      conflictScore: 90,
      climaxScore: 88,
      startTimeSeconds: 0,
      endTimeSeconds: clip1End,
      durationSeconds: clip1End,
      startFrame: 0,
      endFrame: Math.round(clip1End * fps),
      rationale: "High curiosity gap in opening thesis.",
      suggestedCaptionStyle: "hormozi_glow",
      hashtags: ["#BreakingNews", "#Viral", "#Tech"],
      excerptText: sentences.slice(0, 3).join(". "),
    },
    {
      id: `fallback_clip_2_${Date.now()}`,
      rank: 2,
      title: "Core Conflict & Numbers",
      hookHeadline: "THE NUMBERS DON'T LIE",
      viralScore: 86,
      hookScore: 84,
      conflictScore: 90,
      climaxScore: 85,
      startTimeSeconds: clip2Start,
      endTimeSeconds: clip2End,
      durationSeconds: clip2End - clip2Start,
      startFrame: Math.round(clip2Start * fps),
      endFrame: Math.round(clip2End * fps),
      rationale: "Sharp data contrast and central debate point.",
      suggestedCaptionStyle: "beast_pop",
      hashtags: ["#DataShock", "#Trending", "#Insights"],
      excerptText: sentences.slice(Math.floor(sentences.length / 3), Math.floor(sentences.length / 3) + 3).join(". "),
    },
    {
      id: `fallback_clip_3_${Date.now()}`,
      rank: 3,
      title: "Final Takeaway Verdict",
      hookHeadline: "WHAT HAPPENS NEXT",
      viralScore: 81,
      hookScore: 80,
      conflictScore: 78,
      climaxScore: 92,
      startTimeSeconds: clip3Start,
      endTimeSeconds: totalDurationSec,
      durationSeconds: totalDurationSec - clip3Start,
      startFrame: Math.round(clip3Start * fps),
      endFrame: Math.round(totalDurationSec * fps),
      rationale: "Strong final conclusion and forward-looking prediction.",
      suggestedCaptionStyle: "cyber_neon",
      hashtags: ["#FutureTech", "#Verdict", "#MustWatch"],
      excerptText: sentences.slice(-3).join(". "),
    },
  ];

  return {
    overallStoryScore: 86,
    primaryHook: sentences[0] || "Major news update unveiled.",
    clips,
  };
}
