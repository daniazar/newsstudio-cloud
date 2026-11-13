/**
 * src/lib/studio/parsers/narrative_matrix.ts
 *
 * System prompt + parser for Narrative Matrix ("What If?" 3-Way Debate).
 * Powered by unified Vercel AI SDK Gateway (Gemini ↔ Ollama mutual failover).
 * Generates 3 distinct perspectives on an article topic delivered as sequential turns.
 */

import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  NarrativeMatrixLlmResponseSchema,
  type NarrativeMatrixPayload,
  type NarrativePerspective,
  type ParseOptions,
} from "./types";

export const SYSTEM_PROMPT = `You are a political debate director creating a structured 3-perspective debate segment from a news article.

## Debate Format
Three presenters each represent a distinct ideological/analytical angle on the same news topic.
They speak sequentially (not simultaneously). After the initial 3-argument round, each gives a brief rebuttal.
Total: 6 speaking turns (3 arguments + 3 rebuttals).

## Perspective Archetypes (adapt to the specific article topic)
1. **Progressive / Reform-minded**: Emphasizes social impact, systemic change, marginalized groups.
2. **Conservative / Traditionalist**: Emphasizes stability, precedent, economic caution, individual responsibility.
3. **Centrist / Technocratic**: Data-driven, pragmatic, avoids extremes, proposes compromise.

If the article is not political, adapt to relevant analytical angles (e.g. for tech: Optimist/Skeptic/Pragmatist).

## Dialogue Rules
- Each "argumentText" starts with an emotion tag: [serious], [urgent], [excited], or [calm].
- Each argument is 2–4 sentences, spoken in the persona's characteristic voice.
- Each "rebuttal" is 1–2 sentences max.
- Perspectives should genuinely disagree — not give watered-down middle ground on every point.
- Camera angle alternates: persona 1 = "host_solo", persona 2 = "guest_solo", persona 3 = "wide_shot".

## Default Persona Slugs
- Progressive: "ruby" (female, passionate)
- Conservative: "tomas" (male, authoritative)  
- Centrist: "aris" (male, analytical)
Use provided slugs if available.

## Output
Return ONLY valid JSON, no markdown, no explanation:
{
  "topic": "string — 1 sentence debate topic statement",
  "perspectives": [
    {
      "role": "Progressive",
      "personaId": "ruby",
      "argumentText": "[serious] Argument here...",
      "rebuttal": "Brief rebuttal here...",
      "cameraAngle": "host_solo"
    }
  ]
}`;

export type ParseNarrativeMatrixOptions = ParseOptions;

export async function parseArticleAsNarrativeMatrix(
  articleContent: string,
  optionsOrSlugs?: string[] | ParseNarrativeMatrixOptions
): Promise<NarrativeMatrixPayload> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  const options: ParseNarrativeMatrixOptions = Array.isArray(optionsOrSlugs)
    ? { personaSlugs: optionsOrSlugs }
    : optionsOrSlugs || {};

  const defaultSlugs = ["ruby", "mateo", "blaze"];
  const personaSlugs = options.personaSlugs?.length
    ? options.personaSlugs
    : options.personaSlug
    ? [options.personaSlug, "mateo", "blaze"]
    : defaultSlugs;

  const slugContext = `Use these persona slugs for the 3 perspectives: ${personaSlugs.slice(0, 3).join(", ")}.`;
  const userPrompt = `${slugContext}\n\nARTICLE CONTENT:\n${content.slice(0, 5000)}`;

  const { object: parsed } = await generateLlmObject({
    schema: NarrativeMatrixLlmResponseSchema,
    schemaName: "NarrativeMatrixScript",
    schemaDescription: "A structured 3-perspective debate segment with arguments and rebuttals",
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
    tier: "reasoning",
    provider: options.provider,
    model: options.model,
    companyId: options.companyId,
    storyId: options.storyId,
    allowFallback: options.allowFallback,
    customModel: options.customModel,
  });

  return normalizeNarrativeMatrixPayload(parsed, personaSlugs);
}

export function normalizeNarrativeMatrixPayload(
  parsed: { topic: string; perspectives: NarrativePerspective[] },
  personaSlugs: string[] = ["ruby", "mateo", "blaze"]
): NarrativeMatrixPayload {
  const perspectives: NarrativePerspective[] = (parsed.perspectives || []).slice(0, 3).map((p, idx) => ({
    ...p,
    personaId: p.personaId || personaSlugs[idx % personaSlugs.length],
  }));

  return {
    studioType: "narrative_matrix",
    outputMode: "video",
    topic: parsed.topic,
    perspectives,
  };
}
