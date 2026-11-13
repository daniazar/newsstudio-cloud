/**
 * LLM Client — Provider router for script generation and text normalization.
 * Routes through the unified Vercel AI SDK Gateway (aiSdkGateway).
 */

import {
  generateLlmObject,
  generateLlmText,
  getDefaultProvider,
} from "@/lib/llm/aiSdkGateway";
import { SCRIPT_GENERATION_RULES, buildUserPrompt } from "@/lib/llm/prompts";
import {
  ScriptOutputSchema,
  type ScriptOutput,
} from "@/lib/llm/scriptSchema";
import { buildSingleSegmentNormalizationPrompt } from "@/lib/tts/modelPromptDirectives";
import { preprocessTextForTts } from "@/lib/tts/textPreprocessor";
import type { LLMProvider } from "@/lib/types";

/**
 * Get the configured LLM provider from environment.
 */
export function getProvider(): LLMProvider {
  return getDefaultProvider();
}

/**
 * Generate a script for a given article.
 * Automatically routes to the configured LLM provider with mutual Gemini <-> Ollama failover.
 */
export async function generateScript(
  article: {
    title: string;
    content: string;
    author?: string;
    source?: string;
    images?: string[];
  },
  options?: {
    provider?: LLMProvider;
    model?: string;
    fallbackModel?: string;
    maxRetries?: number;
    systemInstruction?: string;
    companyId?: string | null;
    personasContext?: string;
    engine?: string;
    language?: string;
    archetype?: string;
    customDirection?: string;
    leadPersonaId?: string;
  }
): Promise<ScriptOutput> {
  const provider = options?.provider ?? getProvider();
  const systemInstruction = options?.systemInstruction ?? SCRIPT_GENERATION_RULES;

  const prompt = buildUserPrompt(article, options?.personasContext, {
    engine: options?.engine || "omni",
    language: options?.language || "es",
    archetype: options?.archetype,
    customDirection: options?.customDirection,
    leadPersonaId: options?.leadPersonaId,
  });

  const { object } = await generateLlmObject({
    provider,
    model: options?.model,
    fallbackModel: options?.fallbackModel,
    tier: "structured",
    maxRetries: options?.maxRetries,
    schema: ScriptOutputSchema,
    system: systemInstruction,
    prompt,
    companyId: options?.companyId,
    temperature: 0.7,
    maxOutputTokens: 4096,
    allowFallback: true,
  });

  return object;
}

/**
 * Normalizes visual subtitle text into acoustic spoken text for neural TTS.
 * Automatically routes to Gemini or Ollama based on LLM_PROVIDER with mutual fallback,
 * and falls back to local heuristic text preprocessor if all LLMs are unreachable.
 */
export async function normalizeTextForAudio(
  text: string,
  options?: {
    engine?: string;
    language?: string;
    provider?: LLMProvider;
    model?: string;
    fallbackModel?: string;
    companyId?: string | null;
    maxRetries?: number;
  }
): Promise<string> {
  const provider = options?.provider ?? getProvider();
  const engine = options?.engine || "piper";
  const language = options?.language || "es";
  const { systemInstruction, userPrompt } = buildSingleSegmentNormalizationPrompt(text, engine, language);

  try {
    const { text: result } = await generateLlmText({
      provider,
      model: options?.model,
      fallbackModel: options?.fallbackModel,
      tier: "realtime",
      system: systemInstruction,
      prompt: userPrompt,
      companyId: options?.companyId,
      temperature: 0.2,
      maxRetries: options?.maxRetries,
      allowFallback: true,
    });

    const trimmed = result?.trim() || text;
    return trimmed.replace(/^["'“”«»`]+|["'“”«»`]+$/g, "").trim();
  } catch (error) {
    console.error(
      "[LLM Normalization] All LLM providers failed. Falling back to local heuristic preprocessor:",
      error
    );
    return preprocessTextForTts(text, {
      engine: options?.engine,
      language: options?.language,
    });
  }
}
