/**
 * Gemini LLM Provider — Primary provider using Google's Gemini API via Vercel AI SDK (@ai-sdk/google).
 */

import { SCRIPT_GENERATION_RULES, buildUserPrompt } from "@/lib/llm/prompts";
import {
  ScriptOutputSchema,
  type ScriptOutput,
} from "@/lib/llm/scriptSchema";
import { buildSingleSegmentNormalizationPrompt } from "@/lib/tts/modelPromptDirectives";
import { generateLlmObject, generateLlmText } from "@/lib/llm/aiSdkGateway";

/**
 * Generate a script using Gemini API with structured JSON schema output.
 */
export async function generateWithGemini(
  article: {
    title: string;
    content: string;
    author?: string;
    source?: string;
    images?: string[];
  },
  options: {
    model?: string;
    maxRetries?: number;
    systemInstruction?: string;
    companyId?: string | null;
    personasContext?: string;
    engine?: string;
    language?: string;
    archetype?: string;
    customDirection?: string;
    leadPersonaId?: string;
  } = {}
): Promise<ScriptOutput> {
  const {
    model = "gemini-2.5-flash",
    systemInstruction = SCRIPT_GENERATION_RULES,
    companyId = null,
    engine = "omni",
    language = "es",
    archetype,
    customDirection,
    leadPersonaId,
  } = options;

  const prompt = buildUserPrompt(article, options.personasContext, {
    engine,
    language,
    archetype,
    customDirection,
    leadPersonaId,
  });

  const { object } = await generateLlmObject({
    provider: "gemini",
    model,
    schema: ScriptOutputSchema,
    system: systemInstruction,
    prompt,
    companyId,
    temperature: 0.7,
    maxOutputTokens: 4096,
    maxRetries: options.maxRetries,
    allowFallback: false,
  });

  return object;
}

/**
 * Normalizes a single scene's visual text into acoustic spoken text for TTS using Gemini API.
 */
export async function normalizeTextWithGemini(
  text: string,
  options: {
    engine?: string;
    language?: string;
    model?: string;
    companyId?: string | null;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const {
    model = "gemini-2.5-flash",
    companyId = null,
    engine = "piper",
    language = "es",
    maxRetries,
  } = options;

  const { systemInstruction, userPrompt } = buildSingleSegmentNormalizationPrompt(text, engine, language);

  const { text: result } = await generateLlmText({
    provider: "gemini",
    model,
    system: systemInstruction,
    prompt: userPrompt,
    companyId,
    temperature: 0.2,
    maxRetries,
    allowFallback: false,
  });

  const trimmed = result?.trim() || text;
  return trimmed.replace(/^["'“”«»`]+|["'“”«»`]+$/g, "").trim();
}
