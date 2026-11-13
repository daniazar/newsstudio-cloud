/**
 * src/lib/studio/parsers/debate.ts
 *
 * System prompt + parser for Broadcast News Studio Debates (2 or 3 Personas).
 * Powered by unified Vercel AI SDK Gateway (Gemini ↔ Ollama mutual failover).
 * Generates an establishing desk shot, followed by dynamic split-screen multi-box
 * point-counterpoint turns and closing verdict.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  DebateLlmResponseSchema,
  type DebatePayload,
  type DebateSpeakerConfig,
  type DebateTurn,
  type ParseOptions,
} from "./types";

export const DEBATE_SYSTEM_PROMPT = `You are a prime-time television debate executive producer creating an electric, high-stakes journalistic debate from a news article or topic.

## Format & Structure
Supports either 2-Persona Duel (Pro vs Con / Opposing Viewpoints) or 3-Persona Panel (Moderator + 2 Opposing Debaters, or 3-Way Perspectives).

The debate flows through 3 dynamic broadcast rounds:
1. **ESTABLISHING & OPENING ROUND**:
   - Turn 1: Host/Moderator establishes the topic from the Wide News Desk (cameraCue: "desk_master").
   - Turn 2 & 3: Opening statements from each debater in Multi-Box Split Screen (cameraCue: "split_screen").
2. **CROSS-EXAMINATION & CLASH ROUND**:
   - Fast-paced point-counterpoint rebuttal dialogue (3 to 4 short, punchy turns) in Split Screen (cameraCue: "split_screen").
   - Sharp, direct clashes, challenging facts and premises.
3. **CLOSING & VERDICT ROUND**:
   - Final closing arguments from debaters (cameraCue: "solo_speaker" or "split_screen").
   - Final sign-off and wrap-up from the Wide News Desk (cameraCue: "desk_master").

Total turns: 6 to 8 turns.

## Dialogue & Emotion Tag Rules
- Every turn's text MUST begin with an emotion tag: [serious], [urgent], [excited], or [calm].
- Use inline pause tags for natural cadence where appropriate: [pause: 0.3s], [pause: 0.5s].
- Debaters must have distinct, passionate voices and genuine philosophical or empirical disagreements.

## Output Schema (Strict JSON only)
Return ONLY valid JSON matching this schema:
{
  "topic": "string — 1 concise high-energy debate title",
  "participantCount": 2 or 3,
  "speakers": [
    {
      "id": "ruby",
      "name": "Ruby Vance",
      "role": "Lead Anchor / Moderator",
      "stance": "MODERATOR • HOST",
      "location": "STUDIO 1 • NEW YORK",
      "accentColor": "#22d3ee"
    },
    {
      "id": "mateo",
      "name": "Mateo Rossi",
      "role": "Tech Bull Analyst",
      "stance": "PRO • AUTONOMOUS AGENTS",
      "location": "BUREAU • SILICON VALLEY",
      "accentColor": "#10b981"
    },
    {
      "id": "blaze",
      "name": "Blaze Wilder",
      "role": "Chief Risk Strategist",
      "stance": "CON • SYSTEMIC SAFETY",
      "location": "EXCHANGE • LONDON",
      "accentColor": "#f43f5e"
    }
  ],
  "turns": [
    {
      "id": "turn-1",
      "speakerId": "ruby",
      "speakerName": "Ruby Vance",
      "stance": "MODERATOR",
      "text": "[urgent] Welcome to tonight's prime-time debate on NewsStudio. Tonight we confront a pivotal question: Will AI agents replace corporate knowledge work by 2028?",
      "emotion": "[urgent]",
      "cameraCue": "desk_master",
      "roundName": "OPENING • STUDIO ESTABLISHING"
    }
  ]
}`;

export const SYSTEM_PROMPT = DEBATE_SYSTEM_PROMPT;

export type ParseDebateOptions = ParseOptions;

export async function parseArticleAsDebate(
  articleContent: string,
  options: ParseDebateOptions = {}
): Promise<DebatePayload> {
  const content = (articleContent || "").trim();
  if (!content) throw new Error("Article content cannot be empty");

  const requestedCount: 2 | 3 = options.participantCount || (options.personaSlugs?.length === 2 ? 2 : 3);
  const personaSlugs = options.personaSlugs?.length
    ? options.personaSlugs
    : options.personaSlug
    ? [options.personaSlug, "tomas"]
    : requestedCount === 2
    ? ["ruby", "tomas"]
    : ["ruby", "mateo", "blaze"];

  const slugContext = `Participants: ${requestedCount} personas (${personaSlugs.join(", ")}).`;
  const userPrompt = `${slugContext}\n\nARTICLE / TOPIC CONTENT:\n${content.slice(0, 5000)}`;

  const { object: parsed } = await generateLlmObject({
    schema: DebateLlmResponseSchema,
    schemaName: "DebateScript",
    schemaDescription: "A structured news debate broadcast script with speakers and turns",
    system: DEBATE_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.75,
    tier: "reasoning",
    provider: options.provider,
    model: options.model,
    companyId: options.companyId,
    storyId: options.storyId,
    allowFallback: options.allowFallback,
    customModel: options.customModel,
  });

  return normalizeDebatePayload(parsed, {
    participantCount: options.participantCount,
    personaSlugs,
    layoutKey: options.layoutKey,
  });
}

export function normalizeDebatePayload(
  parsed: z.infer<typeof DebateLlmResponseSchema>,
  options: {
    participantCount?: 2 | 3;
    personaSlugs?: string[];
    layoutKey?: string;
  } = {}
): DebatePayload {
  const requestedCount: 2 | 3 = options.participantCount || (options.personaSlugs?.length === 2 ? 2 : 3);
  const personaSlugs = options.personaSlugs?.length
    ? options.personaSlugs
    : requestedCount === 2
    ? ["ruby", "tomas"]
    : ["ruby", "mateo", "blaze"];

  // Ensure default speaker images
  const speakers: DebateSpeakerConfig[] = (parsed.speakers || []).map((s: DebateSpeakerConfig, idx: number) => ({
    ...s,
    avatarUrl: s.avatarUrl || `/avatars/${s.id || personaSlugs[idx] || "ruby"}.png`,
  }));

  const turns: DebateTurn[] = (parsed.turns || []).map((t: { id?: string; speakerId: string; speakerName: string; stance: string; text: string; emotion: string; cameraCue: "split_screen" | "desk_master" | "solo_speaker"; roundName: string; pacing?: "Solemn" | "Standard" | "Urgent" | "Casual"; audioPath?: string; videoPath?: string; generatedImageUrl?: string }, idx: number) => ({
    ...t,
    id: t.id || `turn-${idx + 1}`,
  }));

  const resolvedParticipantCount: 2 | 3 =
    options.participantCount ??
    parsed.participantCount ??
    (personaSlugs.length === 2 ? 2 : 3);

  return {
    studioType: "debate",
    outputMode: "video",
    topic: parsed.topic || "THE GREAT AI DEBATE",
    participantCount: resolvedParticipantCount,
    layoutKey: options.layoutKey || (resolvedParticipantCount === 2 ? "split_duel" : "crescent_debate_desk"),
    deskMasterImageSrc: resolvedParticipantCount === 2
      ? "/studio_environments/composited_scenes/dual_ruby_tomas_desk_master.jpg"
      : "/studio_environments/composited_scenes/roundtable_ruby_mateo_blaze_crescent_master.jpg",
    speakers,
    turns,
  };
}
