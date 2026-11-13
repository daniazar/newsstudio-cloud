/**
 * Ollama LLM Provider — Secondary provider using local Ollama instance via Vercel AI SDK (ollama-ai-provider-v2).
 * Targets qwen3.5:9b by default.
 */

import {
  SCRIPT_GENERATION_RULES,
  buildUserPrompt,
  POLISH_SCRIPT_PROMPT,
  buildPolishPrompt,
} from "@/lib/llm/prompts";
import {
  ScriptOutputSchema,
  type ScriptOutput,
} from "@/lib/llm/scriptSchema";
import { buildSingleSegmentNormalizationPrompt } from "@/lib/tts/modelPromptDirectives";
import { generateLlmObject, generateLlmText } from "@/lib/llm/aiSdkGateway";

/**
 * Generate a script using local Ollama API with structured JSON schema output.
 */
export async function generateWithOllama(
  article: {
    title: string;
    content: string;
    author?: string;
    source?: string;
    images?: string[];
  },
  options: {
    model?: string;
    baseUrl?: string;
    maxRetries?: number;
    systemInstruction?: string;
    personasContext?: string;
    engine?: string;
    language?: string;
    archetype?: string;
    customDirection?: string;
    leadPersonaId?: string;
    companyId?: string | null;
  } = {}
): Promise<ScriptOutput> {
  const {
    model = process.env.OLLAMA_MODEL ?? "qwen3.5:9b",
    baseUrl = (options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_URL ?? "http://localhost:11434").trim().replace(/\/+$/, ""),
    systemInstruction = SCRIPT_GENERATION_RULES,
    personasContext,
    engine,
    language,
    archetype,
    customDirection,
    leadPersonaId,
    companyId = null,
  } = options;

  const prompt = buildUserPrompt(article, personasContext, {
    engine,
    language,
    archetype,
    customDirection,
    leadPersonaId,
  });

  const { object } = await generateLlmObject({
    provider: "ollama",
    model,
    baseURL: baseUrl,
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
 * Polish an existing scene text using local Ollama API.
 */
export async function polishTextWithOllama(
  originalText: string,
  style: "punchy" | "short" | "tiktok" = "punchy",
  options: {
    model?: string;
    baseUrl?: string;
    companyId?: string | null;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const {
    model = process.env.OLLAMA_MODEL ?? "qwen3.5:9b",
    baseUrl = (options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_URL ?? "http://localhost:11434").trim().replace(/\/+$/, ""),
    companyId = null,
    maxRetries,
  } = options;

  try {
    const { text } = await generateLlmText({
      provider: "ollama",
      model,
      baseURL: baseUrl,
      system: POLISH_SCRIPT_PROMPT,
      prompt: buildPolishPrompt(originalText, style),
      companyId,
      temperature: 0.8,
      maxRetries,
      allowFallback: false,
    });

    return text.trim() || originalText;
  } catch (error) {
    console.error("[Ollama] Polishing failed:", error);
    return originalText;
  }
}

/**
 * Normalizes a single scene's visual text into acoustic spoken text using local Ollama API.
 */
export async function normalizeTextWithOllama(
  text: string,
  options: {
    engine?: string;
    language?: string;
    model?: string;
    baseUrl?: string;
    companyId?: string | null;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const {
    model = process.env.OLLAMA_MODEL ?? "qwen3.5:9b",
    baseUrl = (options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_URL ?? "http://localhost:11434").trim().replace(/\/+$/, ""),
    engine = "piper",
    language = "es",
    companyId = null,
    maxRetries,
  } = options;

  const { systemInstruction, userPrompt } = buildSingleSegmentNormalizationPrompt(text, engine, language);

  try {
    const { text: result } = await generateLlmText({
      provider: "ollama",
      model,
      baseURL: baseUrl,
      system: systemInstruction,
      prompt: userPrompt,
      companyId,
      temperature: 0.2,
      maxRetries,
      allowFallback: false,
    });

    const trimmed = result?.trim() || text;
    return trimmed.replace(/^["'“”«»`]+|["'“”«»`]+$/g, "").trim();
  } catch (error) {
    console.error("[Ollama] Normalization failed:", error);
    return text;
  }
}
