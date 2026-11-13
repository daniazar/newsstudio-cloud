/**
 * src/lib/studio/parsers/podcast.ts
 *
 * System prompt + parser for Podcast Studio.
 * Powered by unified Vercel AI SDK Gateway (Gemini ↔ Ollama mutual failover).
 * Converts a news article into a casual multi-speaker podcast dialogue.
 */

import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  PodcastLlmResponseSchema,
  type PodcastPayload,
  type PodcastLine,
  type ParseOptions,
} from "./types";

export const SYSTEM_PROMPT = `You are a podcast producer converting a news article into a natural, engaging multi-speaker podcast script.

## Format Rules
- Create 8–16 dialogue lines between TWO OR THREE speakers.
- Each line must be conversational, warm, and relatable — NOT formal news broadcast language.
- Inline pacing tokens allowed inside text: [pause: 0.5s] for dramatic beats.
- Speakers react to each other, build on each other's points, and occasionally disagree.
- Keep each line to 1–4 spoken sentences.
- Mix languages if the article and personas warrant it (en/es bilingual).

## Available Pacing Presets
- "solemn" — slow, contemplative
- "standard" — normal conversation pace  
- "urgent" — excited, fast
- "casual" — relaxed, warm

## Persona Slugs
Default to: "ruby" (host, en), "mateo" (co-host, es). Use provided slugs if available.

## Output
Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "string — catchy podcast episode title",
  "lines": [
    {
      "id": "line-1",
      "speakerId": "persona_slug",
      "text": "Spoken dialogue here. [pause: 0.5s] Can include natural pauses.",
      "language": "en",
      "pacing": "standard"
    }
  ]
}`;

export type ParsePodcastOptions = ParseOptions;

export async function parseArticleAsPodcast(
  articleContent: string,
  optionsOrSlugs?: string[] | ParsePodcastOptions
): Promise<PodcastPayload> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  const options: ParsePodcastOptions = Array.isArray(optionsOrSlugs)
    ? { personaSlugs: optionsOrSlugs }
    : optionsOrSlugs || {};

  const personaSlugs = options.personaSlugs?.length
    ? options.personaSlugs
    : options.personaSlug
    ? [options.personaSlug, "mateo"]
    : ["ruby", "mateo"];

  const slugContext = `Use these persona slugs: ${personaSlugs.join(", ")}.`;
  const userPrompt = `${slugContext}\n\nARTICLE CONTENT:\n${content.slice(0, 6000)}`;

  const { object: parsed } = await generateLlmObject({
    schema: PodcastLlmResponseSchema,
    schemaName: "PodcastScript",
    schemaDescription: "Casual multi-speaker podcast script",
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

  return normalizePodcastPayload(parsed, personaSlugs);
}

export function normalizePodcastPayload(
  parsed: {
    title: string;
    lines: Array<{
      id?: string;
      speakerId: string;
      text: string;
      language: "en" | "es";
      pacing: "solemn" | "standard" | "urgent" | "casual";
      audioPath?: string;
      videoPath?: string;
    }>;
  },
  personaSlugs: string[] = ["ruby", "mateo"]
): PodcastPayload {
  const lines: PodcastLine[] = (parsed.lines || []).map((l, i) => ({
    ...l,
    id: l.id || `line-${i + 1}`,
    speakerId: l.speakerId || personaSlugs[i % personaSlugs.length],
  }));

  return {
    studioType: "podcast",
    outputMode: "video",
    title: parsed.title,
    lines,
  };
}
