/**
 * src/lib/studio/parsers/interview.ts
 *
 * System prompt + parser for Interview Studio.
 * Powered by unified Vercel AI SDK Gateway (Gemini ↔ Ollama mutual failover).
 * Converts a news article into a 3-camera dual-presenter dialogue script.
 */

import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  InterviewLlmResponseSchema,
  type InterviewPayload,
  type InterviewTurn,
  type ParseOptions,
} from "./types";

export const SYSTEM_PROMPT = `You are a news director adapting a news article into a 3-camera dual-presenter interview/talk-show script.

## Roles
- You will create a 6–12 turn dialogue between TWO presenters: a HOST and an EXPERT GUEST.
- The HOST drives the conversation, asks probing questions, and responds with energy.
- The EXPERT provides depth, data, and nuanced analysis.

## Dialogue Format Rules
- Each turn's "text" field MUST include ONE inline emotion tag at the START.
- Available emotion tags: [urgent], [excited], [whisper], [serious], [calm], [pause: 0.5s], [pause: 1s]
- Use [urgent] for breaking news moments, [excited] for positive developments, [serious] for grave topics, [calm] for analytical segments, [whisper] for dramatic reveals.
- Keep each turn to 1–3 natural spoken sentences. Short, punchy, broadcast style.

## Camera Angles
- "host_solo" — tight frame on host only
- "guest_solo" — tight frame on guest only  
- "dual_shot" — wide shot showing both presenters

## Pacing
- "Solemn" — slow, grave delivery
- "Standard" — normal news broadcast pace
- "Urgent" — fast, breaking-news pace
- "Casual" — conversational, relaxed

## Persona Slugs Available
Use the persona slugs from the article context if provided. Default to: "ruby" (host, female), "tomas" (guest, male analyst).

## Output
Return ONLY valid JSON, no markdown, no explanation:
{
  "topic": "string — 1 sentence topic",
  "turns": [
    {
      "speakerId": "persona_slug",
      "text": "[emotion_tag] Spoken dialogue text here.",
      "cameraAngle": "host_solo|guest_solo|dual_shot",
      "emotion": "[serious]",
      "pacing": "Standard"
    }
  ]
}`;

export type ParseInterviewOptions = ParseOptions;

export async function parseArticleAsInterview(
  articleContent: string,
  optionsOrSlugs?: string[] | ParseInterviewOptions
): Promise<InterviewPayload> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  const options: ParseInterviewOptions = Array.isArray(optionsOrSlugs)
    ? { personaSlugs: optionsOrSlugs }
    : optionsOrSlugs || {};

  const personaSlugs = options.personaSlugs?.length
    ? options.personaSlugs
    : options.personaSlug
    ? [options.personaSlug, "tomas"]
    : ["ruby", "tomas"];

  const slugContext = `Available persona slugs: ${personaSlugs.join(", ")}. Use these for speakerId.`;
  const userPrompt = `${slugContext}\n\nARTICLE CONTENT:\n${content.slice(0, 6000)}`;

  const { object: parsed } = await generateLlmObject({
    schema: InterviewLlmResponseSchema,
    schemaName: "InterviewScript",
    schemaDescription: "A 3-camera dual-presenter interview script",
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

  return normalizeInterviewPayload(parsed, personaSlugs);
}

export function normalizeInterviewPayload(
  parsed: { topic: string; turns: InterviewTurn[] },
  personaSlugs: string[] = ["ruby", "tomas"]
): InterviewPayload {
  const turns: InterviewTurn[] = (parsed.turns || []).map((t, i) => ({
    ...t,
    speakerId: t.speakerId || personaSlugs[i % personaSlugs.length],
  }));

  return {
    studioType: "interview",
    outputMode: "video",
    topic: parsed.topic,
    turns,
  };
}
