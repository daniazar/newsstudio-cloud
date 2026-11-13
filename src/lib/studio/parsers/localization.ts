/**
 * src/lib/studio/parsers/localization.ts
 *
 * System prompt + parser for Localization Matrix.
 * Powered by unified Vercel AI SDK Gateway (Gemini ↔ Ollama mutual failover).
 * Extracts the core news summary and translates it into 6 languages.
 */

import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  LocalizationLlmResponseSchema,
  type LocalizationPayload,
  type LocalizationTrack,
  type ParseOptions,
} from "./types";

export const TARGET_LANGUAGES = [
  { code: "en", name: "English", personaSlug: "ruby" },
  { code: "es", name: "Spanish", personaSlug: "mateo" },
  { code: "pt", name: "Portuguese", personaSlug: "lucia" },
  { code: "fr", name: "French", personaSlug: "claire" },
  { code: "de", name: "German", personaSlug: "kai" },
  { code: "ja", name: "Japanese", personaSlug: "marina" },
];

export const SYSTEM_PROMPT = `You are an expert multilingual news editor and translator.

## Task
1. First, write a clear 3–5 sentence news summary in ENGLISH from the provided article.
2. Then translate that summary into: Spanish (es), Portuguese (pt), French (fr), German (de), Japanese (ja).
3. Each translation must be natural, broadcast-quality, adapted for local audiences — NOT a literal word-for-word translation.
4. Use present tense, active voice, and clear language appropriate for news broadcasts.

## Output
Return ONLY valid JSON, no markdown, no explanation:
{
  "sourceText": "English summary here...",
  "tracks": [
    { "language": "en", "languageName": "English", "translatedText": "English summary here..." },
    { "language": "es", "languageName": "Spanish", "translatedText": "Resumen en español aquí..." },
    { "language": "pt", "languageName": "Portuguese", "translatedText": "Resumo em português aqui..." },
    { "language": "fr", "languageName": "French", "translatedText": "Résumé en français ici..." },
    { "language": "de", "languageName": "German", "translatedText": "Deutsche Zusammenfassung hier..." },
    { "language": "ja", "languageName": "Japanese", "translatedText": "日本語の要約はこちら..." }
  ]
}`;

export type ParseLocalizationOptions = ParseOptions;

export async function parseArticleAsLocalization(
  articleContent: string,
  options: ParseLocalizationOptions = {}
): Promise<LocalizationPayload> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  const userPrompt = `ARTICLE CONTENT:\n${content.slice(0, 5000)}`;

  const { object: parsed } = await generateLlmObject({
    schema: LocalizationLlmResponseSchema,
    schemaName: "LocalizationScript",
    schemaDescription: "Multilingual broadcast news summary and translations",
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

  return normalizeLocalizationPayload(parsed);
}

export function normalizeLocalizationPayload(
  parsed: { sourceText: string; tracks: Array<{ language: string; languageName: string; translatedText: string }> }
): LocalizationPayload {
  const tracks: LocalizationTrack[] = (parsed.tracks || []).map((t) => {
    const langDef = TARGET_LANGUAGES.find((l) => l.code === t.language);
    return {
      ...t,
      personaId: langDef?.personaSlug || "ruby",
    };
  });

  return {
    studioType: "localization",
    outputMode: "video",
    sourceText: parsed.sourceText,
    sourceLanguage: "en",
    tracks,
  };
}
