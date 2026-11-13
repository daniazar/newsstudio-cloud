/**
 * Unified Vercel AI SDK Gateway (aiSdkGateway.ts)
 *
 * Centralizes all text generation, structured JSON generation, and streaming
 * across Google Gemini (@ai-sdk/google) and Local Ollama (ollama-ai-provider-v2).
 * Integrates reasoning extraction (<think>), markdown JSON extraction,
 * automatic failover, and Prisma token/cost telemetry tracking.
 */

import {
  generateText,
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
  extractJsonMiddleware,
  Output,
  APICallError,
  type LanguageModelUsage,
  tool,
  stepCountIs,
  type ToolSet,
  embed,
  embedMany,
  cosineSimilarity,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { pooledFetch } from "@/lib/network/httpPool";
import { z } from "zod";
import type { LLMProvider } from "@/lib/types";
import { trackLlmUsage } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "aiSdkGateway" });
import {
  getTenantCredentials,
  getTenantCredentialsSync,
  getSystemSettings,
  getSystemTierModelSync,
  getSystemDefaultProviderSync,
  getSystemGeminiApiKeySync,
  getSystemOllamaUrlSync,
  getSystemOpenAICompatibleApiKeySync,
  getSystemOpenAICompatibleUrlSync,
  invalidateSystemSettingsCache,
  isMaskedKey,
  type LlmTaskTier,
  type TenantByokCredentials,
} from "@/lib/tenant/credentials";

export type { LlmTaskTier, TenantByokCredentials, ToolSet };
export {
  invalidateSystemSettingsCache,
  getSystemGeminiApiKeySync,
  getSystemOllamaUrlSync,
  getSystemOpenAICompatibleApiKeySync,
  getSystemOpenAICompatibleUrlSync,
  tool,
  stepCountIs,
  cosineSimilarity,
};

export type AnyLanguageModel = Parameters<typeof generateText>[0]["model"];
export type AnyEmbeddingModel = Parameters<typeof embed>[0]["model"];

/**
 * Built-in default embedding models per provider.
 */
export const DEFAULT_EMBEDDING_MODELS: Record<LLMProvider, string> = {
  gemini: "text-embedding-004",
  ollama: "nomic-embed-text",
  "openai-compatible": "text-embedding-3-small",
};

/**
 * Resolves tool and multi-step options for generateText / streamText calls.
 */
function resolveToolAndStepOptions(params: LlmCallOptions) {
  const hasTools = Boolean(params.tools && Object.keys(params.tools).length > 0);
  const maxSteps = params.maxSteps ?? (hasTools ? 4 : undefined);
  const stopWhen = maxSteps && maxSteps >= 1 ? stepCountIs(maxSteps) : undefined;
  return {
    hasTools,
    tools: hasTools ? params.tools : undefined,
    stopWhen,
  };
}

/**
 * Collects deduplicated list of tool names invoked across execution steps.
 */
function extractToolNamesUsed(
  steps?: Array<{ toolCalls?: Array<{ toolName?: string }> }>
): string[] | undefined {
  if (!steps || steps.length === 0) return undefined;
  const rawNames = steps.flatMap((s) => s.toolCalls?.map((tc) => tc?.toolName) ?? []);
  const cleanNames = rawNames.filter(
    (name): name is string => typeof name === "string" && name.length > 0
  );
  const deduplicated = Array.from(new Set(cleanNames));
  return deduplicated.length > 0 ? deduplicated : undefined;
}

/**
 * Built-in default model routing table per task complexity tier.
 */
export const DEFAULT_TIER_MODELS: Record<LLMProvider, Record<LlmTaskTier, string>> = {
  gemini: {
    realtime: "gemini-2.5-flash",
    structured: "gemini-2.5-flash",
    reasoning: "gemini-2.5-pro",
    vision: "gemini-2.5-flash",
  },
  ollama: {
    realtime: "qwen2.5:3b",
    structured: "qwen3.5:9b",
    reasoning: "qwen3.5:32b",
    vision: "llava",
  },
  "openai-compatible": {
    realtime: "gpt-4o-mini",
    structured: "gpt-4o-mini",
    reasoning: "gpt-4o",
    vision: "gpt-4o-mini",
  },
};

/**
 * Returns the resolved default model for a given provider and tier,
 * honoring system settings configured in /admin/settings, then environment variable overrides (e.g. GEMINI_REASONING_MODEL).
 */
export function getDefaultModelForTier(provider: LLMProvider, tier: LlmTaskTier): string {
  // 1. Check system settings override saved via /admin/settings
  const systemOverride = getSystemTierModelSync(provider, tier);
  if (systemOverride) {
    return systemOverride;
  }

  // 2. Check environment variable overrides
  if (provider === "gemini") {
    switch (tier) {
      case "realtime":
        return process.env.GEMINI_REALTIME_MODEL || DEFAULT_TIER_MODELS.gemini.realtime;
      case "structured":
        return process.env.GEMINI_STRUCTURED_MODEL || DEFAULT_TIER_MODELS.gemini.structured;
      case "reasoning":
        return process.env.GEMINI_REASONING_MODEL || DEFAULT_TIER_MODELS.gemini.reasoning;
      case "vision":
        return process.env.GEMINI_VISION_MODEL || DEFAULT_TIER_MODELS.gemini.vision;
    }
  } else if (provider === "ollama") {
    switch (tier) {
      case "realtime":
        return process.env.OLLAMA_REALTIME_MODEL || DEFAULT_TIER_MODELS.ollama.realtime;
      case "structured":
        return process.env.OLLAMA_STRUCTURED_MODEL || DEFAULT_TIER_MODELS.ollama.structured;
      case "reasoning":
        return process.env.OLLAMA_REASONING_MODEL || DEFAULT_TIER_MODELS.ollama.reasoning;
      case "vision":
        return process.env.OLLAMA_VISION_MODEL || DEFAULT_TIER_MODELS.ollama.vision;
    }
  } else {
    switch (tier) {
      case "realtime":
        return (
          process.env.OPENAI_COMPATIBLE_REALTIME_MODEL ||
          process.env.OPENAI_COMPATIBLE_MODEL ||
          DEFAULT_TIER_MODELS["openai-compatible"].realtime
        );
      case "structured":
        return (
          process.env.OPENAI_COMPATIBLE_STRUCTURED_MODEL ||
          process.env.OPENAI_COMPATIBLE_MODEL ||
          DEFAULT_TIER_MODELS["openai-compatible"].structured
        );
      case "reasoning":
        return (
          process.env.OPENAI_COMPATIBLE_REASONING_MODEL ||
          process.env.OPENAI_COMPATIBLE_MODEL ||
          DEFAULT_TIER_MODELS["openai-compatible"].reasoning
        );
      case "vision":
        return (
          process.env.OPENAI_COMPATIBLE_VISION_MODEL ||
          process.env.OPENAI_COMPATIBLE_MODEL ||
          DEFAULT_TIER_MODELS["openai-compatible"].vision
        );
    }
  }
}

export interface LlmCallOptions {
  provider?: LLMProvider;
  model?: string;
  fallbackModel?: string; // model to use if falling back to secondary provider
  tier?: LlmTaskTier; // task complexity tier: realtime | structured | reasoning | vision
  companyId?: string | null;
  storyId?: string;
  temperature?: number;
  maxOutputTokens?: number;
  maxTokens?: number; // convenience alias for maxOutputTokens
  maxRetries?: number;
  allowFallback?: boolean; // defaults to true (Gemini <-> Ollama mutual fallback)
  baseURL?: string; // custom Ollama or OpenAI-compatible baseURL
  apiKey?: string; // custom Gemini or OpenAI-compatible API key
  customModel?: AnyLanguageModel; // override model directly (useful in unit tests)
  tools?: ToolSet;
  maxSteps?: number;
  cachedContent?: string; // Google Gemini explicit context cache resource name, e.g. "cachedContents/abc123"
  thinkingBudget?: number; // optional pass-through for providerOptions.google.thinkingConfig.thinkingBudget (e.g. 0 for realtime)
  telemetryFunctionId?: string;
  telemetryEnabled?: boolean;
}

/**
 * Builds provider-specific options for Google Gemini (@ai-sdk/google).
 * Returns options ONLY when provider === "gemini" and at least one Google option is present.
 * Returns undefined on "ollama" so cross-provider failover NEVER leaks Google options.
 */
export function buildGoogleProviderOptions(
  provider: LLMProvider,
  params: LlmCallOptions,
  includeCache = true
): { google: { cachedContent?: string; thinkingConfig?: { thinkingBudget?: number } } } | undefined {
  if (provider !== "gemini") return undefined;
  const hasCache = Boolean(includeCache && params.cachedContent);
  const hasThinking = params.thinkingBudget !== undefined;
  if (!hasCache && !hasThinking) return undefined;
  return {
    google: {
      ...(hasCache ? { cachedContent: params.cachedContent } : {}),
      ...(hasThinking ? { thinkingConfig: { thinkingBudget: params.thinkingBudget } } : {}),
    },
  };
}

/**
 * Returns the default LLM provider from the environment or system settings.
 */
export function getDefaultProvider(): LLMProvider {
  const envProvider = process.env.LLM_PROVIDER?.toLowerCase();
  if (envProvider === "openai-compatible") {
    return "openai-compatible";
  }
  if (envProvider === "ollama") {
    return "ollama";
  }
  if (envProvider === "gemini") {
    return "gemini";
  }
  const systemProvider = getSystemDefaultProviderSync();
  if (systemProvider) {
    return systemProvider;
  }
  return "gemini";
}

/**
 * Resolves the appropriate fallback provider if the primary provider fails.
 * Maintains mutual Gemini <-> Ollama fallback for backward compatibility,
 * and falls back from openai-compatible to Gemini (if configured via env, system settings, or tenant BYOK) or Ollama.
 */
export function resolveFallbackProvider(
  primaryProvider: LLMProvider,
  byokCreds?: TenantByokCredentials | null
): LLMProvider {
  if (primaryProvider === "gemini") {
    return "ollama";
  }
  if (primaryProvider === "ollama") {
    return "gemini";
  }
  const hasGeminiKey = Boolean(
    byokCreds?.geminiApiKey ||
    getSystemGeminiApiKeySync() ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
  return hasGeminiKey ? "gemini" : "ollama";
}

/**
 * Extracts clean JSON text by stripping <think> blocks, markdown fences,
 * and finding the outermost balanced braces or brackets.
 */
export function cleanJsonText(text: string): string {
  if (!text) return "";

  // 1. Strip reasoning think tags
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // 2. Fast path: if already valid JSON, return immediately
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Continue extraction
  }

  // 3. Extract content inside markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    const fencedContent = fenceMatch[1].trim();
    try {
      JSON.parse(fencedContent);
      return fencedContent;
    } catch {
      cleaned = fencedContent;
    }
  }

  // 4. Try outermost JSON object or array repair (handles clean JSON as well as truncated JSON up to string end)
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  const tryRepairTruncated = (slice: string): string | null => {
    let sub = slice.trim();
    let inString = false;
    let escaped = false;
    const stack: string[] = [];

    for (let i = 0; i < sub.length; i++) {
      const c = sub[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (c === "{" || c === "[") {
        stack.push(c === "{" ? "}" : "]");
      } else if (c === "}" || c === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === c) {
          stack.pop();
        }
      }
    }

    if (inString) {
      sub += '"';
    }

    // Strip dangling incomplete key-value pair, e.g. `,"key":` or `,"key": `
    sub = sub.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
    // Strip any trailing comma or colon before closing open structures
    sub = sub.replace(/[,:]\s*$/, "");

    while (stack.length > 0) {
      sub += stack.pop();
    }

    try {
      JSON.parse(sub);
      return sub;
    } catch {
      return null;
    }
  };

  const candidateStarts = [firstBrace, firstBracket]
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b);

  for (const idx of candidateStarts) {
    const repaired = tryRepairTruncated(cleaned.slice(idx));
    if (repaired) {
      return repaired;
    }
  }

  // 5. Scan for balanced JSON object or array (handles conversational suffix following valid JSON)
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === "{" || char === "[") {
      const isObject = char === "{";
      const closeChar = isObject ? "}" : "]";
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let j = i; j < cleaned.length; j++) {
        const c = cleaned[j];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (c === "\\") {
          escaped = true;
          continue;
        }
        if (c === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;

        if (c === char) {
          depth++;
        } else if (c === closeChar) {
          depth--;
          if (depth === 0) {
            const candidate = cleaned.slice(i, j + 1).trim();
            try {
              JSON.parse(candidate);
              return candidate;
            } catch {
              // Not valid JSON at this boundary, continue search
              break;
            }
          }
        }
      }
    }
  }

  // 6. Fallback: outermost matching slice
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Continue
    }
  }

  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Continue
    }
  }

  return cleaned;
}

import type { LanguageModelV4Middleware } from "@ai-sdk/provider";

export interface TelemetryMiddlewareContext {
  provider: LLMProvider;
  modelId: string;
  companyId?: string | null;
  storyId?: string;
}

/**
 * Creates an AI SDK middleware to automatically record token usage and cost
 * into Prisma's AiTokenUsage and UsageLog tables.
 */
export function createTelemetryMiddleware(context: TelemetryMiddlewareContext): LanguageModelV4Middleware {
  return {
    specificationVersion: "v4" as const,
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      if (result.usage) {
        const rawInput = result.usage.inputTokens as unknown;
        const rawOutput = result.usage.outputTokens as unknown;
        const inputTokens =
          typeof rawInput === "number"
            ? rawInput
            : (rawInput as { total?: number })?.total ?? 0;
        const outputTokens =
          typeof rawOutput === "number"
            ? rawOutput
            : (rawOutput as { total?: number })?.total ?? 0;
        const totalTokens = inputTokens + outputTokens;

        await trackLlmUsage({
          provider: context.provider,
          model: context.modelId,
          inputTokens,
          outputTokens,
          totalTokens,
          companyId: context.companyId,
          storyId: context.storyId,
        }).catch((err) => {
          log.error({ task: "telemetryMiddleware", provider: context.provider, modelId: context.modelId, companyId: context.companyId, err }, "Telemetry middleware tracking error");
        });
      }
      return result;
    },
    wrapStream: async ({ doStream }) => {
      const result = await doStream();
      const transformStream = new TransformStream({
        transform(chunk: unknown, controller) {
          const typedChunk = chunk as {
            type?: string;
            usage?: { inputTokens?: unknown; outputTokens?: unknown };
          };
          if (typedChunk.type === "finish" && typedChunk.usage) {
            const rawInput = typedChunk.usage.inputTokens;
            const rawOutput = typedChunk.usage.outputTokens;
            const inputTokens =
              typeof rawInput === "number"
                ? rawInput
                : (rawInput as { total?: number })?.total ?? 0;
            const outputTokens =
              typeof rawOutput === "number"
                ? rawOutput
                : (rawOutput as { total?: number })?.total ?? 0;
            const totalTokens = inputTokens + outputTokens;

            trackLlmUsage({
              provider: context.provider,
              model: context.modelId,
              inputTokens,
              outputTokens,
              totalTokens,
              companyId: context.companyId,
              storyId: context.storyId,
            }).catch((err) => {
              log.error({ task: "telemetryStream", provider: context.provider, modelId: context.modelId, companyId: context.companyId, err }, "Telemetry stream tracking error");
            });
          }
          controller.enqueue(chunk);
        },
      });

      return {
        ...result,
        stream: result.stream.pipeThrough(transformStream),
      };
    },
  };
}

export interface ResolveModelOptions {
  provider: LLMProvider;
  model?: string;
  tier?: LlmTaskTier;
  companyId?: string | null;
  storyId?: string;
  baseURL?: string;
  apiKey?: string;
  customModel?: AnyLanguageModel;
  skipMiddleware?: boolean;
}

/**
 * Resolves execution parameters (model, apiKey, baseUrl) taking into account
 * provider, primary vs fallback, task tier, and tenant BYOK credentials.
 */
export function resolveProviderExecutionParams(
  provider: LLMProvider,
  primaryProvider: LLMProvider,
  params: LlmCallOptions,
  byokCreds?: TenantByokCredentials | null
): { modelToUse?: string; apiKeyToUse?: string; baseUrlToUse?: string } {
  const isFallback = provider !== primaryProvider;
  let modelToUse = isFallback ? params.fallbackModel : params.model;
  // If falling back to a secondary provider, DO NOT leak the primary provider's custom apiKey or baseURL!
  let apiKeyToUse = isFallback ? undefined : params.apiKey;
  let baseUrlToUse = isFallback ? undefined : params.baseURL;

  if (byokCreds) {
    const byokGeminiKey =
      byokCreds.geminiApiKey && !isMaskedKey(byokCreds.geminiApiKey)
        ? byokCreds.geminiApiKey
        : undefined;
    const byokOpenaiKey =
      byokCreds.openaiCompatibleApiKey && !isMaskedKey(byokCreds.openaiCompatibleApiKey)
        ? byokCreds.openaiCompatibleApiKey
        : undefined;

    if (!apiKeyToUse && provider === "gemini" && byokGeminiKey) {
      apiKeyToUse = byokGeminiKey;
    }
    if (!apiKeyToUse && provider === "openai-compatible" && byokOpenaiKey) {
      apiKeyToUse = byokOpenaiKey;
    }
    if (!baseUrlToUse && provider === "ollama" && byokCreds.ollamaBaseUrl) {
      baseUrlToUse = byokCreds.ollamaBaseUrl;
    }
    if (!baseUrlToUse && provider === "openai-compatible" && byokCreds.openaiCompatibleBaseUrl) {
      baseUrlToUse = byokCreds.openaiCompatibleBaseUrl;
    }
    if (!modelToUse && params.tier) {
      const tenantTier =
        byokCreds.customTiers?.[provider]?.[params.tier] ||
        (provider === primaryProvider ? byokCreds.tierModels?.[params.tier] : undefined);
      if (tenantTier) {
        modelToUse = tenantTier;
      }
    }
  }

  if (!apiKeyToUse && provider === "gemini") {
    const sysKey = getSystemGeminiApiKeySync();
    if (sysKey) apiKeyToUse = sysKey;
  }
  if (!apiKeyToUse && provider === "openai-compatible") {
    const sysKey = getSystemOpenAICompatibleApiKeySync();
    if (sysKey) apiKeyToUse = sysKey;
  }
  if (!baseUrlToUse && provider === "ollama") {
    const sysUrl = getSystemOllamaUrlSync();
    if (sysUrl) baseUrlToUse = sysUrl;
  }
  if (!baseUrlToUse && provider === "openai-compatible") {
    const sysUrl = getSystemOpenAICompatibleUrlSync();
    if (sysUrl) baseUrlToUse = sysUrl;
  }

  if (!modelToUse && params.tier) {
    modelToUse = getDefaultModelForTier(provider, params.tier);
  }

  return { modelToUse, apiKeyToUse, baseUrlToUse };
}

/**
 * Resolves a configured LanguageModel wrapped with reasoning extraction,
 * JSON extraction, and Prisma telemetry middleware.
 */
export function resolveLanguageModel(options: ResolveModelOptions): {
  model: AnyLanguageModel;
  modelId: string;
  provider: LLMProvider;
} {
  const provider = options.provider;
  const tenantCreds = options.companyId ? getTenantCredentialsSync(options.companyId) : null;

  if (options.customModel) {
    const custom = options.customModel as { modelId?: string };
    const modelId = options.model || custom.modelId || "custom-model";
    if (options.skipMiddleware) {
      return { model: options.customModel, modelId, provider };
    }
    const wrapped = wrapLanguageModel({
      model: options.customModel as Parameters<typeof wrapLanguageModel>[0]["model"],
      middleware: [
        extractJsonMiddleware(),
        extractReasoningMiddleware({ tagName: "think" }),
        createTelemetryMiddleware({
          provider,
          modelId,
          companyId: options.companyId,
          storyId: options.storyId,
        }),
      ],
    });
    return { model: wrapped as AnyLanguageModel, modelId, provider };
  }

  if (provider === "gemini") {
    const tenantGeminiKey =
      tenantCreds?.geminiApiKey && !isMaskedKey(tenantCreds.geminiApiKey)
        ? tenantCreds.geminiApiKey
        : undefined;
    const apiKey =
      options.apiKey ||
      tenantGeminiKey ||
      getSystemGeminiApiKeySync() ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    let modelId = options.model;
    if (!modelId && options.tier) {
      modelId =
        tenantCreds?.customTiers?.gemini?.[options.tier] ||
        (tenantCreds?.provider === "gemini" ? tenantCreds?.tierModels?.[options.tier] : undefined) ||
        getDefaultModelForTier("gemini", options.tier);
    }
    if (!modelId) {
      modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    }
    const google = createGoogleGenerativeAI({ apiKey });
    const baseModel = google(modelId);

    if (options.skipMiddleware) {
      return { model: baseModel as AnyLanguageModel, modelId, provider };
    }

    const wrapped = wrapLanguageModel({
      model: baseModel,
      middleware: [
        extractJsonMiddleware(),
        extractReasoningMiddleware({ tagName: "think" }),
        createTelemetryMiddleware({
          provider: "gemini",
          modelId,
          companyId: options.companyId,
          storyId: options.storyId,
        }),
      ],
    });

    return { model: wrapped as AnyLanguageModel, modelId, provider };
  }

  if (provider === "ollama") {
    const rawBaseUrl =
      options.baseURL ||
      tenantCreds?.ollamaBaseUrl ||
      getSystemOllamaUrlSync() ||
      process.env.OLLAMA_BASE_URL ||
      process.env.OLLAMA_URL ||
      "http://localhost:11434";
    const trimmedBase = rawBaseUrl.trim().replace(/\/+$/, "");
    const baseURL = trimmedBase.endsWith("/api") ? trimmedBase : `${trimmedBase}/api`;
    let modelId = options.model;
    if (!modelId && options.tier) {
      modelId =
        tenantCreds?.customTiers?.ollama?.[options.tier] ||
        (tenantCreds?.provider === "ollama" ? tenantCreds?.tierModels?.[options.tier] : undefined) ||
        getDefaultModelForTier("ollama", options.tier);
    }
    if (!modelId) {
      modelId = process.env.OLLAMA_MODEL || "qwen3.5:9b";
    }
    const ollama = createOllama({ baseURL });
    const baseModel = ollama(modelId);

    if (options.skipMiddleware) {
      return { model: baseModel as AnyLanguageModel, modelId, provider };
    }

    const wrapped = wrapLanguageModel({
      model: baseModel,
      middleware: [
        extractJsonMiddleware(),
        extractReasoningMiddleware({ tagName: "think" }),
        createTelemetryMiddleware({
          provider: "ollama",
          modelId,
          companyId: options.companyId,
          storyId: options.storyId,
        }),
      ],
    });

    return { model: wrapped as AnyLanguageModel, modelId, provider };
  }

  if (provider === "openai-compatible") {
    const tenantOpenaiKey =
      tenantCreds?.openaiCompatibleApiKey && !isMaskedKey(tenantCreds.openaiCompatibleApiKey)
        ? tenantCreds.openaiCompatibleApiKey
        : undefined;
    const rawApiKey =
      options.apiKey ||
      tenantOpenaiKey ||
      getSystemOpenAICompatibleApiKeySync() ||
      process.env.OPENAI_COMPATIBLE_API_KEY ||
      "local-no-key";
    const apiKey = rawApiKey.trim();

    const rawBaseUrl =
      options.baseURL ||
      tenantCreds?.openaiCompatibleBaseUrl ||
      getSystemOpenAICompatibleUrlSync() ||
      process.env.OPENAI_COMPATIBLE_BASE_URL ||
      process.env.OPENAI_COMPATIBLE_URL ||
      "http://localhost:8000/v1";
    const baseURL = rawBaseUrl.trim();

    let modelId = options.model;
    if (!modelId && options.tier) {
      modelId =
        tenantCreds?.customTiers?.["openai-compatible"]?.[options.tier] ||
        (tenantCreds?.provider === "openai-compatible" ? tenantCreds?.tierModels?.[options.tier] : undefined) ||
        getDefaultModelForTier("openai-compatible", options.tier);
    }
    if (!modelId) {
      modelId = process.env.OPENAI_COMPATIBLE_MODEL || "gpt-4o-mini";
    }

    const openaiCompatible = createOpenAICompatible({
      name: "openai-compatible",
      baseURL,
      apiKey,
      includeUsage: true,
      supportsStructuredOutputs: true,
      fetch: pooledFetch as unknown as typeof fetch,
    });
    const baseModel = openaiCompatible(modelId);

    if (options.skipMiddleware) {
      return { model: baseModel as AnyLanguageModel, modelId, provider };
    }

    const wrapped = wrapLanguageModel({
      model: baseModel,
      middleware: [
        extractJsonMiddleware(),
        extractReasoningMiddleware({ tagName: "think" }),
        createTelemetryMiddleware({
          provider: "openai-compatible",
          modelId,
          companyId: options.companyId,
          storyId: options.storyId,
        }),
      ],
    });

    return { model: wrapped as AnyLanguageModel, modelId, provider };
  }

  throw new Error(`Unsupported LLM provider: "${provider}"`);
}

/**
 * Asynchronously resolves a configured LanguageModel ensuring tenant BYOK
 * and system settings caches are loaded from the database if needed.
 */
export async function resolveLanguageModelAsync(options: ResolveModelOptions): Promise<{
  model: AnyLanguageModel;
  modelId: string;
  provider: LLMProvider;
}> {
  if (options.companyId) {
    await getTenantCredentials(options.companyId).catch(() => null);
  }
  await getSystemSettings().catch(() => null);
  return resolveLanguageModel(options);
}

/**
 * High-level unified text generation with automatic Gemini <-> Ollama failover.
 */
export async function generateLlmText(
  params: {
    system?: string;
    prompt?: string;
    messages?: Parameters<typeof generateText>[0]["messages"];
  } & LlmCallOptions
): Promise<{
  text: string;
  reasoning?: string;
  usage?: LanguageModelUsage;
  providerUsed: LLMProvider;
  modelUsed: string;
  stepsCount?: number;
  toolNamesUsed?: string[];
}> {
  await getSystemSettings().catch(() => null);

  let byokCreds: TenantByokCredentials | null = null;
  if (params.companyId) {
    try {
      byokCreds = await getTenantCredentials(params.companyId);
    } catch (err) {
      log.warn({ task: "getTenantCredentials", companyId: params.companyId, err }, `Failed to retrieve BYOK credentials for tenant ${params.companyId}`);
    }
  }

  const primaryProvider: LLMProvider = params.provider ?? byokCreds?.provider ?? getDefaultProvider();
  const allowFallback = params.allowFallback !== false;

  const runOnProvider = async (provider: LLMProvider, includeCache = true) => {
    const isFallback = provider !== primaryProvider;
    const { modelToUse, apiKeyToUse, baseUrlToUse } = resolveProviderExecutionParams(
      provider,
      primaryProvider,
      params,
      byokCreds
    );

    const { model, modelId } = resolveLanguageModel({
      provider,
      model: modelToUse,
      tier: params.tier,
      companyId: params.companyId,
      storyId: params.storyId,
      baseURL: baseUrlToUse,
      apiKey: apiKeyToUse,
      customModel: isFallback ? undefined : params.customModel,
    });

    const maxOutputTokens = params.maxOutputTokens ?? params.maxTokens;
    const maxRetries = params.maxRetries ?? (provider === "ollama" ? 0 : 1);
    const { tools, stopWhen } = resolveToolAndStepOptions(params);
    const providerOptions = buildGoogleProviderOptions(provider, params, includeCache);
    const system =
      provider === "gemini" && includeCache && params.cachedContent ? undefined : params.system;

    const telemetry = {
      isEnabled: params.telemetryEnabled ?? true,
      functionId: params.telemetryFunctionId || `newsstudio.generateText.${params.tier || "default"}.${provider}`,
    };

    const result = await (params.messages && params.messages.length > 0
      ? generateText({
          model,
          tools,
          stopWhen,
          system,
          messages: params.messages,
          temperature: params.temperature,
          maxOutputTokens,
          maxRetries,
          providerOptions,
          telemetry,
        })
      : generateText({
          model,
          tools,
          stopWhen,
          system,
          prompt: params.prompt ?? "",
          temperature: params.temperature,
          maxOutputTokens,
          maxRetries,
          providerOptions,
          telemetry,
        }));

    // Clean any residual think tags if present
    const cleanedText = result.text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    let reasoningText: string | undefined;
    if (result.reasoning) {
      if (typeof result.reasoning === "string") {
        reasoningText = result.reasoning;
      } else if (Array.isArray(result.reasoning)) {
        reasoningText = (result.reasoning as Array<{ text?: string }>).map((r) => r.text || "").join("\n");
      }
    }

    const toolNamesUsed = extractToolNamesUsed(result.steps);

    return {
      text: cleanedText,
      reasoning: reasoningText,
      usage: result.usage,
      providerUsed: provider,
      modelUsed: modelId,
      stepsCount: result.steps?.length,
      toolNamesUsed,
    };
  };

  const executeWithCacheRetry = async (provider: LLMProvider) => {
    if (provider === "gemini" && params.cachedContent) {
      try {
        return await runOnProvider(provider, true);
      } catch (cachedError) {
        log.warn({ task: "generateLlmText", tier: params.tier, provider, modelId: params.model, companyId: params.companyId, err: cachedError }, "generateLlmText with cachedContent failed on gemini. Retrying once without cache...");
        return await runOnProvider(provider, false);
      }
    }
    return await runOnProvider(provider, false);
  };

  try {
    return await executeWithCacheRetry(primaryProvider);
  } catch (primaryError) {
    if (!allowFallback || params.customModel) {
      throw primaryError;
    }

    const fallbackProvider: LLMProvider = resolveFallbackProvider(primaryProvider, byokCreds);
    log.warn({ task: "generateLlmText", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: primaryError }, `Primary provider "${primaryProvider}" failed. Attempting fallback to "${fallbackProvider}"...`);

    try {
      return await executeWithCacheRetry(fallbackProvider);
    } catch (fallbackError) {
      log.error({ task: "generateLlmText", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: fallbackError }, "Both LLM providers failed");
      throw new Error(
        `All LLM providers failed. Primary (${primaryProvider}): ${
          primaryError instanceof Error ? primaryError.message : String(primaryError)
        }. Fallback (${fallbackProvider}): ${
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }`
      );
    }
  }
}

/**
 * High-level unified structured JSON object generation with Zod schema validation,
 * automatic repair of thinking/fenced blocks, and Gemini <-> Ollama failover.
 */
export async function generateLlmObject<TSchema extends z.ZodTypeAny>(
  params: {
    schema: TSchema;
    schemaName?: string;
    schemaDescription?: string;
    system?: string;
    prompt?: string;
    messages?: Parameters<typeof generateText>[0]["messages"];
    output?: "object" | "array" | "no-schema";
  } & LlmCallOptions
): Promise<{
  object: z.infer<TSchema>;
  usage?: LanguageModelUsage;
  providerUsed: LLMProvider;
  modelUsed: string;
  stepsCount?: number;
  toolNamesUsed?: string[];
}> {
  await getSystemSettings().catch(() => null);

  if (!params.tier && !params.model) {
    params.tier = "structured";
  }

  let byokCreds: TenantByokCredentials | null = null;
  if (params.companyId) {
    try {
      byokCreds = await getTenantCredentials(params.companyId);
    } catch (err) {
      log.warn({ task: "getTenantCredentials", companyId: params.companyId, err }, `Failed to retrieve BYOK credentials for tenant ${params.companyId}`);
    }
  }

  const primaryProvider: LLMProvider = params.provider ?? byokCreds?.provider ?? getDefaultProvider();
  const allowFallback = params.allowFallback !== false;

  const runOnProvider = async (provider: LLMProvider, includeCache = true) => {
    const isFallback = provider !== primaryProvider;
    const { modelToUse, apiKeyToUse, baseUrlToUse } = resolveProviderExecutionParams(
      provider,
      primaryProvider,
      params,
      byokCreds
    );

    const { model, modelId } = resolveLanguageModel({
      provider,
      model: modelToUse,
      tier: params.tier,
      companyId: params.companyId,
      storyId: params.storyId,
      baseURL: baseUrlToUse,
      apiKey: apiKeyToUse,
      customModel: isFallback ? undefined : params.customModel,
    });

    const maxOutputTokens = params.maxOutputTokens ?? params.maxTokens;
    const maxRetries = params.maxRetries ?? (provider === "ollama" ? 0 : 1);
    const { hasTools, tools, stopWhen } = resolveToolAndStepOptions(params);
    const providerOptions = buildGoogleProviderOptions(provider, params, includeCache);
    const system =
      provider === "gemini" && includeCache && params.cachedContent ? undefined : params.system;

    const unwrapElements = (val: unknown): unknown => {
      if (
        val &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        "elements" in val &&
        Array.isArray((val as { elements: unknown }).elements)
      ) {
        return (val as { elements: unknown }).elements;
      }
      return val;
    };

    const outputSetting =
      params.output === "array"
        ? Output.array({
            element:
              params.schema instanceof z.ZodArray
                ? (params.schema as unknown as { element: z.ZodTypeAny }).element
                : params.schema,
          })
        : params.output === "no-schema"
        ? Output.json()
        : Output.object({
            schema: params.schema,
            name: params.schemaName,
            description: params.schemaDescription,
          });

    const telemetry = {
      isEnabled: params.telemetryEnabled ?? true,
      functionId: params.telemetryFunctionId || `newsstudio.generateObject.${params.tier || "default"}.${provider}`,
    };

    try {
      const result = await (params.messages && params.messages.length > 0
        ? generateText({
            model,
            output: outputSetting,
            tools,
            stopWhen,
            system,
            messages: params.messages,
            temperature: params.temperature,
            maxOutputTokens,
            maxRetries,
            providerOptions,
            telemetry,
          })
        : generateText({
            model,
            output: outputSetting,
            tools,
            stopWhen,
            system,
            prompt: params.prompt ?? "",
            temperature: params.temperature,
            maxOutputTokens,
            maxRetries,
            providerOptions,
            telemetry,
          }));

      let finalOutput = result.output;
      if (params.schema instanceof z.ZodArray) {
        finalOutput = unwrapElements(finalOutput);
      }

      const toolNamesUsed = extractToolNamesUsed(result.steps);

      return {
        object: finalOutput as z.infer<TSchema>,
        usage: result.usage,
        providerUsed: provider,
        modelUsed: modelId,
        stepsCount: result.steps?.length,
        toolNamesUsed,
      };
    } catch (objError) {
      // 1. Fast path: if objError already has the generated text, repair and parse it directly
      // without making an expensive, redundant second LLM API call!
      const rawText =
        (objError as { text?: string })?.text ??
        (objError as { cause?: { text?: string } })?.cause?.text;

      if (rawText && typeof rawText === "string") {
        try {
          const cleaned = cleanJsonText(rawText);
          const parsed = JSON.parse(cleaned);
          const unwrapped = params.schema instanceof z.ZodArray ? unwrapElements(parsed) : parsed;
          const validated = params.schema.parse(unwrapped) as z.infer<TSchema>;
          const toolNamesUsed = extractToolNamesUsed(
            (objError as { steps?: Array<{ toolCalls?: Array<{ toolName: string }> }> })?.steps
          );
          return {
            object: validated,
            usage: (objError as { usage?: LanguageModelUsage })?.usage,
            providerUsed: provider,
            modelUsed: modelId,
            stepsCount: (objError as { steps?: unknown[] })?.steps?.length,
            toolNamesUsed,
          };
        } catch {
          // If reparsing the raw text fails, fall through to text mode re-generation
        }
      }

      // If the error was a fatal network / connection failure, authentication error,
      // or a cachedContent failure/expiry, rethrow immediately without wasting retries on text repair.
      const isCacheError =
        Boolean(includeCache && params.cachedContent) &&
        (objError instanceof Error && (/cache/i.test(objError.message) || (APICallError.isInstance(objError) && (objError.statusCode === 400 || objError.statusCode === 404))));

      const isConnectionOrAuthError =
        isCacheError ||
        (APICallError.isInstance(objError) && (!objError.responseBody || objError.statusCode === 401 || objError.statusCode === 403 || objError.statusCode === 404)) ||
        (objError instanceof Error && (objError.message.includes("ECONNREFUSED") || objError.message.includes("API key not valid") || objError.message.includes("fetch failed")));

      if (isConnectionOrAuthError) {
        throw objError;
      }

      // 2. In case structured mode fails due to raw output formatting or tool+structured incompatibility, attempt text-based repair
      try {
        const textResult = await (params.messages && params.messages.length > 0
          ? generateText({
              model,
              tools,
              stopWhen,
              system,
              messages: params.messages,
              temperature: params.temperature,
              maxOutputTokens,
              maxRetries,
              providerOptions,
              telemetry,
            })
          : generateText({
              model,
              tools,
              stopWhen,
              system,
              prompt: params.prompt ?? "",
              temperature: params.temperature,
              maxOutputTokens,
              maxRetries,
              providerOptions,
              telemetry,
            }));

        const cleaned = cleanJsonText(textResult.text);
        const parsed = JSON.parse(cleaned);
        const unwrapped = params.schema instanceof z.ZodArray ? unwrapElements(parsed) : parsed;
        const validated = params.schema.parse(unwrapped) as z.infer<TSchema>;
        const toolNamesUsed = extractToolNamesUsed(textResult.steps);

        return {
          object: validated,
          usage: textResult.usage,
          providerUsed: provider,
          modelUsed: modelId,
          stepsCount: textResult.steps?.length,
          toolNamesUsed,
        };
      } catch {
        // 3. Fallback: If combining tools with structured output caused the issue, retry structured output WITHOUT tools before giving up or failing over
        if (hasTools) {
          try {
            const noToolsResult = await (params.messages && params.messages.length > 0
              ? generateText({
                  model,
                  output: outputSetting,
                  system,
                  messages: params.messages,
                  temperature: params.temperature,
                  maxOutputTokens,
                  maxRetries,
                  providerOptions,
                  telemetry,
                })
              : generateText({
                  model,
                  output: outputSetting,
                  system,
                  prompt: params.prompt ?? "",
                  temperature: params.temperature,
                  maxOutputTokens,
                  maxRetries,
                  providerOptions,
                  telemetry,
                }));

            let finalOutput = noToolsResult.output;
            if (params.schema instanceof z.ZodArray) {
              finalOutput = unwrapElements(finalOutput);
            }
            return {
              object: finalOutput as z.infer<TSchema>,
              usage: noToolsResult.usage,
              providerUsed: provider,
              modelUsed: modelId,
              stepsCount: noToolsResult.steps?.length,
              toolNamesUsed: undefined,
            };
          } catch {
            // 4. Fallback: If structured output mode failed without tools as well, attempt plain text generation without tools + JSON repair
            try {
              const plainTextResult = await (params.messages && params.messages.length > 0
                ? generateText({
                    model,
                    system,
                    messages: params.messages,
                    temperature: params.temperature,
                    maxOutputTokens,
                    maxRetries,
                    providerOptions,
                    telemetry,
                  })
                : generateText({
                    model,
                    system,
                    prompt: params.prompt ?? "",
                    temperature: params.temperature,
                    maxOutputTokens,
                    maxRetries,
                    providerOptions,
                    telemetry,
                  }));

              const cleaned = cleanJsonText(plainTextResult.text);
              const parsed = JSON.parse(cleaned);
              const unwrapped = params.schema instanceof z.ZodArray ? unwrapElements(parsed) : parsed;
              const validated = params.schema.parse(unwrapped) as z.infer<TSchema>;

              return {
                object: validated,
                usage: plainTextResult.usage,
                providerUsed: provider,
                modelUsed: modelId,
                stepsCount: plainTextResult.steps?.length,
                toolNamesUsed: undefined,
              };
            } catch {
              // Rethrow original objError
              throw objError;
            }
          }
        }
        // Rethrow original structured error
        throw objError;
      }
    }
  };

  const executeWithCacheRetry = async (provider: LLMProvider) => {
    if (provider === "gemini" && params.cachedContent) {
      try {
        return await runOnProvider(provider, true);
      } catch (cachedError) {
        log.warn({ task: "generateLlmObject", tier: params.tier, provider, modelId: params.model, companyId: params.companyId, err: cachedError }, "generateLlmObject with cachedContent failed on gemini. Retrying once without cache...");
        return await runOnProvider(provider, false);
      }
    }
    return await runOnProvider(provider, false);
  };

  try {
    return await executeWithCacheRetry(primaryProvider);
  } catch (primaryError) {
    if (!allowFallback || params.customModel) {
      throw primaryError;
    }

    const fallbackProvider: LLMProvider = resolveFallbackProvider(primaryProvider, byokCreds);
    log.warn({ task: "generateLlmObject", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: primaryError }, `Primary provider "${primaryProvider}" failed. Attempting fallback to "${fallbackProvider}"...`);

    try {
      return await executeWithCacheRetry(fallbackProvider);
    } catch (fallbackError) {
      log.error({ task: "generateLlmObject", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: fallbackError }, "Both LLM providers failed for generateLlmObject");
      throw new Error(
        `All LLM providers failed. Primary (${primaryProvider}): ${
          primaryError instanceof Error ? primaryError.message : String(primaryError)
        }. Fallback (${fallbackProvider}): ${
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }`
      );
    }
  }
}

/**
 * Unified text streaming via Vercel AI SDK streamText with automatic provider failover.
 */
export async function streamLlmText(
  params: {
    system?: string;
    prompt?: string;
    messages?: Parameters<typeof streamText>[0]["messages"];
  } & LlmCallOptions
) {
  await getSystemSettings().catch(() => null);

  let byokCreds: TenantByokCredentials | null = null;
  if (params.companyId) {
    try {
      byokCreds = await getTenantCredentials(params.companyId);
    } catch (err) {
      log.warn({ task: "getTenantCredentials", companyId: params.companyId, err }, `Failed to retrieve BYOK credentials for tenant ${params.companyId}`);
    }
  }

  const primaryProvider: LLMProvider = params.provider ?? byokCreds?.provider ?? getDefaultProvider();
  const allowFallback = params.allowFallback !== false;

  const createStream = (provider: LLMProvider, includeCache = true) => {
    const isFallback = provider !== primaryProvider;
    const { modelToUse, apiKeyToUse, baseUrlToUse } = resolveProviderExecutionParams(
      provider,
      primaryProvider,
      params,
      byokCreds
    );

    const { model, modelId } = resolveLanguageModel({
      provider,
      model: modelToUse,
      tier: params.tier,
      companyId: params.companyId,
      storyId: params.storyId,
      baseURL: baseUrlToUse,
      apiKey: apiKeyToUse,
      customModel: isFallback ? undefined : params.customModel,
    });

    const maxOutputTokens = params.maxOutputTokens ?? params.maxTokens;
    const { tools, stopWhen } = resolveToolAndStepOptions(params);
    const providerOptions = buildGoogleProviderOptions(provider, params, includeCache);
    const system =
      provider === "gemini" && includeCache && params.cachedContent ? undefined : params.system;

    const telemetry = {
      isEnabled: params.telemetryEnabled ?? true,
      functionId: params.telemetryFunctionId || `newsstudio.streamText.${params.tier || "default"}.${provider}`,
    };

    const stream =
      params.messages && params.messages.length > 0
        ? streamText({
            model,
            tools,
            stopWhen,
            system,
            messages: params.messages,
            temperature: params.temperature,
            maxOutputTokens,
            maxRetries: params.maxRetries,
            providerOptions,
            telemetry,
          })
        : streamText({
            model,
            tools,
            stopWhen,
            system,
            prompt: params.prompt ?? "",
            temperature: params.temperature,
            maxOutputTokens,
            maxRetries: params.maxRetries,
            providerOptions,
            telemetry,
          });

    return Object.assign(stream, {
      providerUsed: provider,
      modelUsed: modelId,
    });
  };

  const executeStreamWithCacheRetry = (provider: LLMProvider) => {
    if (provider === "gemini" && params.cachedContent) {
      try {
        return createStream(provider, true);
      } catch (cacheError) {
        log.warn({ task: "streamLlmText", tier: params.tier, provider, modelId: params.model, companyId: params.companyId, err: cacheError }, "streamLlmText with cachedContent failed on gemini. Retrying once without cache...");
        return createStream(provider, false);
      }
    }
    return createStream(provider, false);
  };

  try {
    return executeStreamWithCacheRetry(primaryProvider);
  } catch (primaryError) {
    if (!allowFallback || params.customModel) {
      throw primaryError;
    }

    const fallbackProvider: LLMProvider = resolveFallbackProvider(primaryProvider, byokCreds);
    log.warn({ task: "streamLlmText", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: primaryError }, `Primary provider "${primaryProvider}" failed to initialize stream. Attempting fallback to "${fallbackProvider}"...`);

    try {
      return executeStreamWithCacheRetry(fallbackProvider);
    } catch (fallbackError) {
      log.error({ task: "streamLlmText", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: fallbackError }, "Both LLM providers failed for streamLlmText");
      throw new Error(
        `All LLM providers failed. Primary (${primaryProvider}): ${
          primaryError instanceof Error ? primaryError.message : String(primaryError)
        }. Fallback (${fallbackProvider}): ${
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }`
      );
    }
  }
}

/**
 * Unified structured object streaming via Vercel AI SDK streamObject with automatic provider failover.
 */
export async function streamLlmObject<TSchema extends z.ZodTypeAny>(
  params: {
    schema: TSchema;
    schemaName?: string;
    schemaDescription?: string;
    output?: "object" | "array";
    system?: string;
    prompt?: string;
    messages?: Parameters<typeof streamText>[0]["messages"];
  } & LlmCallOptions
) {
  await getSystemSettings().catch(() => null);

  if (!params.tier && !params.model) {
    params.tier = "structured";
  }

  let byokCreds: TenantByokCredentials | null = null;
  if (params.companyId) {
    try {
      byokCreds = await getTenantCredentials(params.companyId);
    } catch (err) {
      log.warn({ task: "getTenantCredentials", companyId: params.companyId, err }, `Failed to retrieve BYOK credentials for tenant ${params.companyId}`);
    }
  }

  const primaryProvider: LLMProvider = params.provider ?? byokCreds?.provider ?? getDefaultProvider();
  const allowFallback = params.allowFallback !== false;

  const createStream = (provider: LLMProvider, includeCache = true) => {
    const isFallback = provider !== primaryProvider;
    const { modelToUse, apiKeyToUse, baseUrlToUse } = resolveProviderExecutionParams(
      provider,
      primaryProvider,
      params,
      byokCreds
    );

    const { model, modelId } = resolveLanguageModel({
      provider,
      model: modelToUse,
      tier: params.tier,
      companyId: params.companyId,
      storyId: params.storyId,
      baseURL: baseUrlToUse,
      apiKey: apiKeyToUse,
      customModel: isFallback ? undefined : params.customModel,
    });

    const maxOutputTokens = params.maxOutputTokens ?? params.maxTokens;
    const maxRetries = params.maxRetries ?? (provider === "ollama" ? 0 : 1);
    const { tools, stopWhen } = resolveToolAndStepOptions(params);
    const providerOptions = buildGoogleProviderOptions(provider, params, includeCache);
    const system =
      provider === "gemini" && includeCache && params.cachedContent ? undefined : params.system;

    const isArraySchema =
      params.schema instanceof z.ZodArray ||
      (params.schema as unknown as { _def?: { typeName?: string } })?._def?.typeName === "ZodArray";

    const outputSetting =
      params.output === "array"
        ? Output.array({
            element: isArraySchema
              ? (params.schema as unknown as { element: z.ZodTypeAny }).element
              : params.schema,
          })
        : Output.object({
            schema: params.schema,
            name: params.schemaName,
            description: params.schemaDescription,
          });

    const telemetry = {
      isEnabled: params.telemetryEnabled ?? true,
      functionId: params.telemetryFunctionId || `newsstudio.streamObject.${params.tier || "default"}.${provider}`,
    };

    const stream =
      params.messages && params.messages.length > 0
        ? streamText({
            model,
            output: outputSetting,
            tools,
            stopWhen,
            system,
            messages: params.messages,
            temperature: params.temperature,
            maxOutputTokens,
            maxRetries,
            providerOptions,
            telemetry,
          })
        : streamText({
            model,
            output: outputSetting,
            tools,
            stopWhen,
            system,
            prompt: params.prompt ?? "",
            temperature: params.temperature,
            maxOutputTokens,
            maxRetries,
            providerOptions,
            telemetry,
          });

    return Object.assign(stream, {
      providerUsed: provider,
      modelUsed: modelId,
    });
  };

  const executeStreamWithCacheRetry = (provider: LLMProvider) => {
    if (provider === "gemini" && params.cachedContent) {
      try {
        return createStream(provider, true);
      } catch (cacheError) {
        log.warn({ task: "streamLlmObject", tier: params.tier, provider, modelId: params.model, companyId: params.companyId, err: cacheError }, "streamLlmObject with cachedContent failed on gemini. Retrying once without cache...");
        return createStream(provider, false);
      }
    }
    return createStream(provider, false);
  };

  try {
    return executeStreamWithCacheRetry(primaryProvider);
  } catch (primaryError) {
    if (!allowFallback || params.customModel) {
      throw primaryError;
    }

    const fallbackProvider: LLMProvider = resolveFallbackProvider(primaryProvider, byokCreds);
    log.warn({ task: "streamLlmObject", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: primaryError }, `Primary provider "${primaryProvider}" failed to initialize object stream. Attempting fallback to "${fallbackProvider}"...`);

    try {
      return executeStreamWithCacheRetry(fallbackProvider);
    } catch (fallbackError) {
      log.error({ task: "streamLlmObject", tier: params.tier, provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: fallbackError }, "Both LLM providers failed for streamLlmObject");
      throw new Error(
        `All LLM providers failed. Primary (${primaryProvider}): ${
          primaryError instanceof Error ? primaryError.message : String(primaryError)
        }. Fallback (${fallbackProvider}): ${
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }`
      );
    }
  }
}

export interface ResolveEmbeddingModelOptions {
  provider?: LLMProvider;
  model?: string;
  companyId?: string | null;
  baseURL?: string;
  apiKey?: string;
  customEmbeddingModel?: AnyEmbeddingModel;
}

/**
 * Resolves a configured EmbeddingModel for a given provider (Gemini or Ollama),
 * honoring tenant BYOK credentials, system settings, and environment variables.
 */
export function resolveEmbeddingModel(options: ResolveEmbeddingModelOptions): {
  model: AnyEmbeddingModel;
  modelId: string;
  provider: LLMProvider;
} {
  const tenantCreds = options.companyId ? getTenantCredentialsSync(options.companyId) : null;
  const provider = options.provider ?? tenantCreds?.provider ?? getDefaultProvider();

  if (options.customEmbeddingModel) {
    const custom = options.customEmbeddingModel as { modelId?: string };
    const modelId = options.model || custom.modelId || "custom-embedding-model";
    return { model: options.customEmbeddingModel, modelId, provider };
  }

  if (provider === "gemini") {
    const tenantGeminiKey =
      tenantCreds?.geminiApiKey && !isMaskedKey(tenantCreds.geminiApiKey)
        ? tenantCreds.geminiApiKey
        : undefined;
    const apiKey =
      options.apiKey ||
      tenantGeminiKey ||
      getSystemGeminiApiKeySync() ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    const modelId =
      options.model ||
      process.env.GEMINI_EMBEDDING_MODEL ||
      DEFAULT_EMBEDDING_MODELS.gemini;
    const google = createGoogleGenerativeAI({ apiKey });
    const model = google.textEmbeddingModel(modelId);
    return { model, modelId, provider: "gemini" };
  }

  if (provider === "ollama") {
    const rawBaseUrl =
      options.baseURL ||
      tenantCreds?.ollamaBaseUrl ||
      getSystemOllamaUrlSync() ||
      process.env.OLLAMA_BASE_URL ||
      process.env.OLLAMA_URL ||
      "http://localhost:11434";
    const trimmedBase = rawBaseUrl.trim().replace(/\/+$/, "");
    const baseURL = trimmedBase.endsWith("/api") ? trimmedBase : `${trimmedBase}/api`;
    const modelId =
      options.model ||
      process.env.OLLAMA_EMBEDDING_MODEL ||
      DEFAULT_EMBEDDING_MODELS.ollama;
    const ollama = createOllama({ baseURL });
    const model = ollama.textEmbeddingModel(modelId);
    return { model, modelId, provider: "ollama" };
  }

  if (provider === "openai-compatible") {
    const tenantOpenaiKey =
      tenantCreds?.openaiCompatibleApiKey && !isMaskedKey(tenantCreds.openaiCompatibleApiKey)
        ? tenantCreds.openaiCompatibleApiKey
        : undefined;
    const rawApiKey =
      options.apiKey ||
      tenantOpenaiKey ||
      getSystemOpenAICompatibleApiKeySync() ||
      process.env.OPENAI_COMPATIBLE_API_KEY ||
      "local-no-key";
    const apiKey = rawApiKey.trim();

    const rawBaseUrl =
      options.baseURL ||
      tenantCreds?.openaiCompatibleBaseUrl ||
      getSystemOpenAICompatibleUrlSync() ||
      process.env.OPENAI_COMPATIBLE_BASE_URL ||
      process.env.OPENAI_COMPATIBLE_URL ||
      "http://localhost:8000/v1";
    const baseURL = rawBaseUrl.trim();

    const modelId =
      options.model ||
      process.env.OPENAI_COMPATIBLE_EMBEDDING_MODEL ||
      DEFAULT_EMBEDDING_MODELS["openai-compatible"];

    const openaiCompatible = createOpenAICompatible({
      name: "openai-compatible",
      baseURL,
      apiKey,
      includeUsage: true,
      supportsStructuredOutputs: true,
      fetch: pooledFetch as unknown as typeof fetch,
    });
    const model = openaiCompatible.embeddingModel(modelId);
    return { model, modelId, provider: "openai-compatible" };
  }

  throw new Error(`Unsupported LLM provider for embeddings: "${provider}"`);
}

/**
 * Asynchronously resolves a configured EmbeddingModel ensuring tenant BYOK
 * and system settings caches are loaded from the database if needed.
 */
export async function resolveEmbeddingModelAsync(options: ResolveEmbeddingModelOptions): Promise<{
  model: AnyEmbeddingModel;
  modelId: string;
  provider: LLMProvider;
}> {
  if (options.companyId) {
    await getTenantCredentials(options.companyId).catch(() => null);
  }
  await getSystemSettings().catch(() => null);
  return resolveEmbeddingModel(options);
}

export interface EmbeddingCallOptions {
  provider?: LLMProvider;
  model?: string;
  fallbackModel?: string; // model to use if falling back to secondary provider
  tier?: LlmTaskTier; // task complexity tier if applicable
  companyId?: string | null;
  storyId?: string;
  maxRetries?: number;
  allowFallback?: boolean; // defaults to true (Gemini <-> Ollama mutual fallback)
  baseURL?: string; // custom Ollama or OpenAI-compatible baseURL
  apiKey?: string; // custom Gemini or OpenAI-compatible API key
  customEmbeddingModel?: AnyEmbeddingModel; // override model directly (useful in unit tests)
  telemetryFunctionId?: string;
  telemetryEnabled?: boolean;
}

/**
 * Batched vector embedding generation across multiple texts with automatic Gemini <-> Ollama failover.
 */
export async function embedLlmMany(
  params: {
    values: string[];
  } & EmbeddingCallOptions
): Promise<{
  embeddings: number[][];
  usage?: { tokens: number };
  providerUsed: LLMProvider;
  modelUsed: string;
}> {
  // Pre-load credentials & settings
  if (params.companyId) {
    await getTenantCredentials(params.companyId).catch(() => null);
  }
  await getSystemSettings().catch(() => null);

  const tenantCreds = params.companyId ? getTenantCredentialsSync(params.companyId) : null;
  const primaryProvider: LLMProvider = params.provider ?? tenantCreds?.provider ?? getDefaultProvider();
  const fallbackProvider: LLMProvider = resolveFallbackProvider(primaryProvider, tenantCreds);
  const defaultModel =
    primaryProvider === "gemini"
      ? (process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODELS.gemini)
      : primaryProvider === "openai-compatible"
      ? (process.env.OPENAI_COMPATIBLE_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODELS["openai-compatible"])
      : (process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODELS.ollama);
  const primaryModel = params.model || defaultModel;

  // Handle empty values immediately without calling network
  if (!params.values || params.values.length === 0) {
    return {
      embeddings: [],
      usage: { tokens: 0 },
      providerUsed: primaryProvider,
      modelUsed: primaryModel,
    };
  }

  const allowFallback = params.allowFallback !== false && !params.customEmbeddingModel;

  try {
    const resolved = resolveEmbeddingModel({
      provider: primaryProvider,
      model: params.model,
      companyId: params.companyId,
      baseURL: params.baseURL,
      apiKey: params.apiKey,
      customEmbeddingModel: params.customEmbeddingModel,
    });

    const maxRetries = params.maxRetries ?? (primaryProvider === "ollama" ? 0 : 1);
    const telemetry = {
      isEnabled: params.telemetryEnabled ?? true,
      functionId: params.telemetryFunctionId || `newsstudio.embedMany.${params.tier || "default"}.${resolved.provider}`,
    };
    const result = await embedMany({
      model: resolved.model,
      values: params.values,
      maxRetries,
      telemetry,
    });

    const tokens = result.usage?.tokens ?? 0;
    trackLlmUsage({
      provider: resolved.provider,
      model: resolved.modelId,
      inputTokens: tokens,
      outputTokens: 0,
      totalTokens: tokens,
      companyId: params.companyId,
      storyId: params.storyId,
    }).catch((err) => {
      log.error({ task: "embedManyTelemetry", companyId: params.companyId, storyId: params.storyId, err }, "Embedding telemetry tracking error");
    });

    return {
      embeddings: result.embeddings,
      usage: result.usage,
      providerUsed: resolved.provider,
      modelUsed: resolved.modelId,
    };
  } catch (primaryError: unknown) {
    const pMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);

    if (!allowFallback) {
      throw primaryError;
    }

    log.warn({ task: "embedManyLlm", provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: primaryError }, `Primary embedding provider "${primaryProvider}" failed. Attempting fallback to "${fallbackProvider}"...`);

    try {
      const resolvedFallback = resolveEmbeddingModel({
        provider: fallbackProvider,
        model: params.fallbackModel,
        companyId: params.companyId,
        baseURL: undefined, // Clear primary provider's baseURL to prevent bleed
        apiKey: undefined,  // Clear primary provider's apiKey to prevent bleed
      });

      const maxRetriesFallback = params.maxRetries ?? (fallbackProvider === "ollama" ? 0 : 1);
      const fallbackTelemetry = {
        isEnabled: params.telemetryEnabled ?? true,
        functionId: params.telemetryFunctionId || `newsstudio.embedMany.${params.tier || "default"}.${resolvedFallback.provider}`,
      };
      const result = await embedMany({
        model: resolvedFallback.model,
        values: params.values,
        maxRetries: maxRetriesFallback,
        telemetry: fallbackTelemetry,
      });

      const tokens = result.usage?.tokens ?? 0;
      trackLlmUsage({
        provider: resolvedFallback.provider,
        model: resolvedFallback.modelId,
        inputTokens: tokens,
        outputTokens: 0,
        totalTokens: tokens,
        companyId: params.companyId,
        storyId: params.storyId,
      }).catch((err) => {
        log.error({ task: "embedManyFallbackTelemetry", companyId: params.companyId, storyId: params.storyId, err }, "Fallback embedding telemetry tracking error");
      });

      return {
        embeddings: result.embeddings,
        usage: result.usage,
        providerUsed: resolvedFallback.provider,
        modelUsed: resolvedFallback.modelId,
      };
    } catch (fallbackError: unknown) {
      const fMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      log.error({ task: "embedManyLlm", provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: fallbackError }, "Both embedding providers failed");
      throw new Error(
        `All embedding providers failed. Primary (${primaryProvider}): ${pMsg}. Fallback (${fallbackProvider}): ${fMsg}`
      );
    }
  }
}

/**
 * Single text vector embedding generation with automatic Gemini <-> Ollama failover.
 */
export async function embedLlmText(
  params: {
    value: string;
  } & EmbeddingCallOptions
): Promise<{
  embedding: number[];
  usage?: { tokens: number };
  providerUsed: LLMProvider;
  modelUsed: string;
}> {
  // Pre-load credentials & settings
  if (params.companyId) {
    await getTenantCredentials(params.companyId).catch(() => null);
  }
  await getSystemSettings().catch(() => null);

  const tenantCreds = params.companyId ? getTenantCredentialsSync(params.companyId) : null;
  const primaryProvider: LLMProvider = params.provider ?? tenantCreds?.provider ?? getDefaultProvider();
  const fallbackProvider: LLMProvider = resolveFallbackProvider(primaryProvider, tenantCreds);

  const allowFallback = params.allowFallback !== false && !params.customEmbeddingModel;

  try {
    const resolved = resolveEmbeddingModel({
      provider: primaryProvider,
      model: params.model,
      companyId: params.companyId,
      baseURL: params.baseURL,
      apiKey: params.apiKey,
      customEmbeddingModel: params.customEmbeddingModel,
    });

    const maxRetries = params.maxRetries ?? (primaryProvider === "ollama" ? 0 : 1);
    const telemetry = {
      isEnabled: params.telemetryEnabled ?? true,
      functionId: params.telemetryFunctionId || `newsstudio.embed.${params.tier || "default"}.${resolved.provider}`,
    };
    const result = await embed({
      model: resolved.model,
      value: params.value,
      maxRetries,
      telemetry,
    });

    const tokens = result.usage?.tokens ?? 0;
    trackLlmUsage({
      provider: resolved.provider,
      model: resolved.modelId,
      inputTokens: tokens,
      outputTokens: 0,
      totalTokens: tokens,
      companyId: params.companyId,
      storyId: params.storyId,
    }).catch((err) => {
      log.error({ task: "embedTelemetry", companyId: params.companyId, storyId: params.storyId, err }, "Embedding telemetry tracking error");
    });

    return {
      embedding: result.embedding,
      usage: result.usage,
      providerUsed: resolved.provider,
      modelUsed: resolved.modelId,
    };
  } catch (primaryError: unknown) {
    const pMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);

    if (!allowFallback) {
      throw primaryError;
    }

    log.warn({ task: "embedLlmText", provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: primaryError }, `Primary embedding provider "${primaryProvider}" failed. Attempting fallback to "${fallbackProvider}"...`);

    try {
      const resolvedFallback = resolveEmbeddingModel({
        provider: fallbackProvider,
        model: params.fallbackModel,
        companyId: params.companyId,
        baseURL: undefined, // Clear primary provider's baseURL to prevent bleed
        apiKey: undefined,  // Clear primary provider's apiKey to prevent bleed
      });

      const maxRetriesFallback = params.maxRetries ?? (fallbackProvider === "ollama" ? 0 : 1);
      const fallbackTelemetry = {
        isEnabled: params.telemetryEnabled ?? true,
        functionId: params.telemetryFunctionId || `newsstudio.embed.${params.tier || "default"}.${resolvedFallback.provider}`,
      };
      const result = await embed({
        model: resolvedFallback.model,
        value: params.value,
        maxRetries: maxRetriesFallback,
        telemetry: fallbackTelemetry,
      });

      const tokens = result.usage?.tokens ?? 0;
      trackLlmUsage({
        provider: resolvedFallback.provider,
        model: resolvedFallback.modelId,
        inputTokens: tokens,
        outputTokens: 0,
        totalTokens: tokens,
        companyId: params.companyId,
        storyId: params.storyId,
      }).catch((err) => {
        log.error({ task: "embedFallbackTelemetry", companyId: params.companyId, storyId: params.storyId, err }, "Fallback embedding telemetry tracking error");
      });

      return {
        embedding: result.embedding,
        usage: result.usage,
        providerUsed: resolvedFallback.provider,
        modelUsed: resolvedFallback.modelId,
      };
    } catch (fallbackError: unknown) {
      const fMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      log.error({ task: "embedLlmText", provider: primaryProvider, fallbackProvider, companyId: params.companyId, err: fallbackError }, "Both embedding providers failed");
      throw new Error(
        `All embedding providers failed. Primary (${primaryProvider}): ${pMsg}. Fallback (${fallbackProvider}): ${fMsg}`
      );
    }
  }
}

