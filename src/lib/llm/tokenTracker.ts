import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface LlmUsagePayload {
  provider: "gemini" | "ollama" | "openai-compatible" | string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  companyId?: string | null;
  storyId?: string;
  estimatedCost?: number;
}

/**
 * Calculates estimated cost for LLM usage in USD based on provider and model.
 */
export function calculateLlmCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  if (provider === "ollama") {
    return 0.0;
  }

  if (provider === "gemini") {
    const isPro = (model || "").toLowerCase().includes("pro");
    if (isPro) {
      return (promptTokens * 1.25) / 1_000_000 + (completionTokens * 5.0) / 1_000_000;
    }
    // Default to Gemini 2.5 Flash pricing
    return (promptTokens * 0.15) / 1_000_000 + (completionTokens * 0.6) / 1_000_000;
  }

  if (provider === "openai-compatible") {
    const lowerModel = (model || "").toLowerCase();
    if (
      lowerModel.startsWith("local/") ||
      lowerModel.startsWith("vllm/") ||
      lowerModel.startsWith("ollama/")
    ) {
      return 0.0;
    }
    if (
      lowerModel.includes("mini") ||
      lowerModel.includes("haiku") ||
      lowerModel.includes("llama") ||
      lowerModel.includes("qwen") ||
      lowerModel.includes("mistral")
    ) {
      return (promptTokens * 0.15) / 1_000_000 + (completionTokens * 0.6) / 1_000_000;
    }
    // Default frontier models (e.g., gpt-4o, sonnet)
    return (promptTokens * 2.5) / 1_000_000 + (completionTokens * 10.0) / 1_000_000;
  }

  return 0.0;
}

/**
 * Unified helper to log LLM token usage across all providers (Gemini, Ollama, etc.)
 * to the AiTokenUsage table AND to the unified UsageLog table for multi-tenant metering.
 */
export async function trackLlmUsage(payload: LlmUsagePayload): Promise<void> {
  const promptTokens = payload.promptTokens ?? payload.inputTokens ?? 0;
  const completionTokens = payload.completionTokens ?? payload.outputTokens ?? 0;
  const totalTokens = payload.totalTokens ?? promptTokens + completionTokens;
  const companyId = payload.companyId ?? null;
  const provider = payload.provider || "gemini";
  const model = payload.model || "unknown";
  const storyId = payload.storyId;

  const estimatedCost =
    payload.estimatedCost !== undefined
      ? payload.estimatedCost
      : calculateLlmCost(provider, model, promptTokens, completionTokens);

  try {
    const txOps: Prisma.PrismaPromise<unknown>[] = [
      prisma.aiTokenUsage.create({
        data: {
          companyId,
          provider,
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost,
          storyId,
        },
      }),
    ];

    if (companyId) {
      txOps.push(
        prisma.usageLog.create({
          data: {
            companyId,
            type: "llm_tokens",
            amount: totalTokens,
          },
        })
      );
    }

    await prisma.$transaction(txOps);
  } catch (err) {
    console.error("[TokenTracker] Failed to log usage:", err);
  }
}

/**
 * Legacy backward-compatible helper for logging Gemini token usage.
 */
export async function trackGeminiUsage(
  companyId: string | null,
  usageMetadata:
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined,
  model: string,
  storyId?: string
): Promise<void> {
  if (!usageMetadata) return;

  const promptTokens = usageMetadata.promptTokenCount || 0;
  const completionTokens = usageMetadata.candidatesTokenCount || 0;
  const totalTokens = usageMetadata.totalTokenCount || promptTokens + completionTokens;

  await trackLlmUsage({
    provider: "gemini",
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    companyId,
    storyId,
  });
}
