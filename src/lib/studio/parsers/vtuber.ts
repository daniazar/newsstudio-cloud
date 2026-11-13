/**
 * src/lib/studio/parsers/vtuber.ts
 *
 * System prompt + parser for VTuber React Studio.
 * Powered by unified Vercel AI SDK Gateway (Gemini ↔ Ollama mutual failover).
 * Converts a news article into a live-streamer reaction script.
 */

import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  VTuberLlmResponseSchema,
  type VTuberPayload,
  type VTuberReactionMoment,
  type ParseOptions,
} from "./types";

export const SYSTEM_PROMPT = `You are a VTuber stream director converting a news article into a live-reaction streaming script.

## Context
A VTuber (anime-style virtual streamer) is reading and reacting to a news article live on stream.
The VTuber is energetic, authentic, and occasionally surprised or emotional about the news.
There is a live chat appearing on screen with viewer reactions.

## Format Rules
- Create 6–10 reaction moments.
- Each "text" is what the VTuber says out loud (1–3 casual sentences, streamer-style).
- Each "reaction" is ONE of: [excited], [serious], [urgent], [calm]
- Each "chatLine" is a brief viewer chat message at that moment (e.g. "Pog that's crazy", "no way lol", "finally some real news").
- "timestamp" is the approximate seconds from stream start (cumulative, spaced ~10–20s apart).
- Keep it authentic — VTubers react in real-time, can be shocked, laugh, or get serious suddenly.

## Output
Return ONLY valid JSON, no markdown, no explanation:
{
  "streamTitle": "string — catchy stream title with emoji",
  "reactionMoments": [
    {
      "text": "Oh my gosh, did you guys just read that? This is insane!",
      "reaction": "[excited]",
      "chatLine": "POGGERS this is crazy",
      "timestamp": 0
    }
  ]
}`;

export type ParseVTuberOptions = ParseOptions;

export async function parseArticleAsVTuber(
  articleContent: string,
  optionsOrSlug?: string | ParseVTuberOptions
): Promise<VTuberPayload> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  const options: ParseVTuberOptions = typeof optionsOrSlug === "string"
    ? { personaSlug: optionsOrSlug }
    : optionsOrSlug || {};

  const personaId = options.personaSlug || options.personaSlugs?.[0] || "ruby";
  const userPrompt = `Streamer persona: ${personaId}\n\nARTICLE CONTENT:\n${content.slice(0, 5000)}`;

  const { object: parsed } = await generateLlmObject({
    schema: VTuberLlmResponseSchema,
    schemaName: "VTuberScript",
    schemaDescription: "A live-streamer VTuber reaction script with simulated chat",
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
    tier: "structured",
    provider: options.provider,
    model: options.model,
    companyId: options.companyId,
    storyId: options.storyId,
    allowFallback: options.allowFallback,
    customModel: options.customModel,
  });

  return normalizeVTuberPayload(parsed, personaId);
}

export function normalizeVTuberPayload(
  parsed: { streamTitle: string; reactionMoments: VTuberReactionMoment[] },
  personaId = "ruby"
): VTuberPayload {
  return {
    studioType: "vtuber",
    outputMode: "video",
    streamTitle: parsed.streamTitle,
    personaId,
    reactionMoments: parsed.reactionMoments || [],
  };
}
