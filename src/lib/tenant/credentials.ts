import { prisma } from "@/lib/prisma";
import type { LLMProvider } from "@/lib/types";
import { ensureCompany } from "@/lib/tenant";

export type LlmTaskTier = "realtime" | "structured" | "reasoning" | "vision";

export interface TenantByokCredentials {
  companyId: string;
  provider?: LLMProvider;
  geminiApiKey?: string;
  ollamaBaseUrl?: string;
  openaiCompatibleApiKey?: string;
  openaiCompatibleBaseUrl?: string;
  tavilyApiKey?: string;
  firecrawlApiKey?: string;
  tierModels?: Partial<Record<LlmTaskTier, string>>;
  customTiers?: {
    gemini?: Partial<Record<LlmTaskTier, string>>;
    ollama?: Partial<Record<LlmTaskTier, string>>;
    "openai-compatible"?: Partial<Record<LlmTaskTier, string>>;
  };
  updatedAt?: string;
}

export const BYOK_SETTINGS_KEY = "byok_credentials";
export const ADMIN_SETTINGS_KEY = "admin_settings";

// In-memory cache for fast, zero-query credential resolution
const credentialsCache = new Map<string, { creds: TenantByokCredentials | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60s TTL

export interface SystemTierSettings {
  provider?: LLMProvider;
  geminiApiKey?: string;
  ollamaBaseUrl?: string;
  openaiCompatibleApiKey?: string;
  openaiCompatibleBaseUrl?: string;
  tavilyApiKey?: string;
  firecrawlApiKey?: string;
  gemini?: Partial<Record<LlmTaskTier, string>>;
  ollama?: Partial<Record<LlmTaskTier, string>>;
  "openai-compatible"?: Partial<Record<LlmTaskTier, string>>;
}

let systemSettingsCache: { settings: SystemTierSettings | null; expiresAt: number } = {
  settings: null,
  expiresAt: 0,
};

/**
 * Masks an API key for safe UI display (e.g., ••••1234) per AGENTS.md §3.5.
 */
export function maskApiKey(key?: string | null): string {
  if (!key || typeof key !== "string") return "";
  const trimmed = key.trim();
  if (trimmed.startsWith("••••") || trimmed.startsWith("****")) return trimmed;
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

/**
 * Checks if a key string is already masked.
 */
export function isMaskedKey(key?: string | null): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed.startsWith("••••") || trimmed.startsWith("****");
}

/**
 * Invalidates the in-memory cache for system-wide admin settings.
 */
export function invalidateSystemSettingsCache(): void {
  systemSettingsCache = { settings: null, expiresAt: 0 };
}

/**
 * Synchronous lookup of configured system-wide tier model from memory cache.
 */
export function getSystemTierModelSync(provider: LLMProvider, tier: LlmTaskTier): string | null {
  if (Date.now() < systemSettingsCache.expiresAt && systemSettingsCache.settings) {
    const configured = systemSettingsCache.settings[provider]?.[tier];
    if (configured && configured.trim()) return configured.trim();
  }
  return null;
}

/**
 * Synchronous lookup of configured default provider from admin settings.
 */
export function getSystemDefaultProviderSync(): LLMProvider | null {
  if (Date.now() < systemSettingsCache.expiresAt && systemSettingsCache.settings?.provider) {
    return systemSettingsCache.settings.provider;
  }
  return null;
}

/**
 * Synchronous lookup of configured global Gemini API key from admin settings memory cache.
 */
export function getSystemGeminiApiKeySync(): string | null {
  if (Date.now() < systemSettingsCache.expiresAt && systemSettingsCache.settings?.geminiApiKey) {
    return systemSettingsCache.settings.geminiApiKey;
  }
  return null;
}

/**
 * Synchronous lookup of configured global Ollama base URL from admin settings memory cache.
 */
export function getSystemOllamaUrlSync(): string | null {
  if (Date.now() < systemSettingsCache.expiresAt && systemSettingsCache.settings?.ollamaBaseUrl) {
    return systemSettingsCache.settings.ollamaBaseUrl;
  }
  return null;
}

/**
 * Synchronous lookup of configured global OpenAI-Compatible API key from admin settings memory cache.
 */
export function getSystemOpenAICompatibleApiKeySync(): string | null {
  if (Date.now() < systemSettingsCache.expiresAt && systemSettingsCache.settings?.openaiCompatibleApiKey) {
    return systemSettingsCache.settings.openaiCompatibleApiKey;
  }
  return null;
}

/**
 * Synchronous lookup of configured global OpenAI-Compatible base URL from admin settings memory cache.
 */
export function getSystemOpenAICompatibleUrlSync(): string | null {
  if (Date.now() < systemSettingsCache.expiresAt && systemSettingsCache.settings?.openaiCompatibleBaseUrl) {
    return systemSettingsCache.settings.openaiCompatibleBaseUrl;
  }
  return null;
}

/**
 * Loads system-wide LLM tier and provider configuration from SystemSetting table.
 */
export async function getSystemSettings(): Promise<SystemTierSettings | null> {
  if (Date.now() < systemSettingsCache.expiresAt && systemSettingsCache.settings) {
    return systemSettingsCache.settings;
  }

  try {
    if (!prisma?.systemSetting?.findFirst) {
      return null;
    }

    const record = await prisma.systemSetting.findFirst({
      where: {
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
      },
    });

    if (!record || !record.value) {
      systemSettingsCache = { settings: null, expiresAt: Date.now() + CACHE_TTL_MS };
      return null;
    }

    const parsed = JSON.parse(record.value);
    const rawApiKey =
      typeof parsed.llm?.apiKey === "string" ? parsed.llm.apiKey.trim() : undefined;
    const geminiApiKey =
      rawApiKey && !isMaskedKey(rawApiKey) ? rawApiKey : undefined;
    const ollamaBaseUrl =
      typeof parsed.servers?.ollamaUrl === "string"
        ? parsed.servers.ollamaUrl.trim() || undefined
        : undefined;
    const rawOpenaiApiKey =
      typeof parsed.llm?.openaiCompatibleApiKey === "string"
        ? parsed.llm.openaiCompatibleApiKey.trim()
        : undefined;
    const openaiCompatibleApiKey =
      rawOpenaiApiKey && !isMaskedKey(rawOpenaiApiKey) ? rawOpenaiApiKey : undefined;
    const openaiCompatibleBaseUrl =
      typeof parsed.servers?.openaiCompatibleUrl === "string"
        ? parsed.servers.openaiCompatibleUrl.trim() || undefined
        : undefined;

    const rawTavilyApiKey =
      typeof parsed.search?.tavilyApiKey === "string"
        ? parsed.search.tavilyApiKey.trim()
        : undefined;
    const tavilyApiKey =
      rawTavilyApiKey && !isMaskedKey(rawTavilyApiKey) ? rawTavilyApiKey : undefined;

    const rawFirecrawlApiKey =
      typeof parsed.search?.firecrawlApiKey === "string"
        ? parsed.search.firecrawlApiKey.trim()
        : undefined;
    const firecrawlApiKey =
      rawFirecrawlApiKey && !isMaskedKey(rawFirecrawlApiKey) ? rawFirecrawlApiKey : undefined;

    const settings: SystemTierSettings = {
      provider: parsed.llm?.provider,
      geminiApiKey,
      ollamaBaseUrl,
      openaiCompatibleApiKey,
      openaiCompatibleBaseUrl,
      tavilyApiKey,
      firecrawlApiKey,
      gemini: parsed.llm?.tiers?.gemini,
      ollama: parsed.llm?.tiers?.ollama,
      "openai-compatible": parsed.llm?.tiers?.["openai-compatible"],
    };

    systemSettingsCache = { settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[SystemSettings] Failed to retrieve system settings:", error);
    }
    return null;
  }
}

/**
 * Invalidates the in-memory cache for a single tenant or all tenants.
 */
export function invalidateTenantCredentialsCache(companyId?: string): void {
  if (companyId) {
    credentialsCache.delete(companyId);
  } else {
    credentialsCache.clear();
  }
}

/**
 * Synchronous lookup from memory cache (returns null on cache miss or expired).
 */
export function getTenantCredentialsSync(companyId?: string | null): TenantByokCredentials | null {
  if (!companyId) return null;
  const entry = credentialsCache.get(companyId);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.creds;
  }
  return null;
}

/**
 * Resolves BYOK credentials for a given tenant organization (companyId).
 */
export async function getTenantCredentials(
  companyId?: string | null
): Promise<TenantByokCredentials | null> {
  if (!companyId) return null;

  const cached = credentialsCache.get(companyId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.creds;
  }

  try {
    if (!prisma?.systemSetting?.findFirst) {
      return null;
    }

    const record = await prisma.systemSetting.findFirst({
      where: {
        companyId,
        key: BYOK_SETTINGS_KEY,
      },
    });

    if (!record || !record.value) {
      credentialsCache.set(companyId, { creds: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const parsed = JSON.parse(record.value) as Partial<TenantByokCredentials>;
    const creds: TenantByokCredentials = {
      companyId,
      provider: parsed.provider,
      geminiApiKey: parsed.geminiApiKey,
      ollamaBaseUrl: parsed.ollamaBaseUrl,
      openaiCompatibleApiKey: parsed.openaiCompatibleApiKey,
      openaiCompatibleBaseUrl: parsed.openaiCompatibleBaseUrl,
      tavilyApiKey: parsed.tavilyApiKey,
      firecrawlApiKey: parsed.firecrawlApiKey,
      tierModels: parsed.tierModels || {},
      customTiers: parsed.customTiers || {},
      updatedAt: record.updatedAt ? record.updatedAt.toISOString() : undefined,
    };

    credentialsCache.set(companyId, { creds, expiresAt: Date.now() + CACHE_TTL_MS });
    return creds;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error(`[BYOK] Failed to retrieve tenant credentials for companyId=${companyId}:`, error);
    }
    return null;
  }
}

/**
 * Saves or updates BYOK credentials for a given tenant organization.
 * Preserves existing keys if incoming payload is masked (starts with ••••).
 */
export async function saveTenantCredentials(
  companyId: string,
  input: Partial<TenantByokCredentials>
): Promise<TenantByokCredentials> {
  if (!companyId) throw new Error("companyId is required to save tenant credentials");

  try {
    await ensureCompany(companyId);
  } catch (err) {
    console.warn(`[BYOK] Warning: Could not ensure company row for ${companyId}:`, err);
  }

  const existing = await getTenantCredentials(companyId);

  let geminiApiKey = input.geminiApiKey?.trim();
  if (geminiApiKey && isMaskedKey(geminiApiKey)) {
    geminiApiKey = existing?.geminiApiKey;
  }

  let openaiCompatibleApiKey = input.openaiCompatibleApiKey?.trim();
  if (openaiCompatibleApiKey && isMaskedKey(openaiCompatibleApiKey)) {
    openaiCompatibleApiKey = existing?.openaiCompatibleApiKey;
  }

  let tavilyApiKey = input.tavilyApiKey?.trim();
  if (tavilyApiKey && isMaskedKey(tavilyApiKey)) {
    tavilyApiKey = existing?.tavilyApiKey;
  }

  let firecrawlApiKey = input.firecrawlApiKey?.trim();
  if (firecrawlApiKey && isMaskedKey(firecrawlApiKey)) {
    firecrawlApiKey = existing?.firecrawlApiKey;
  }

  const updatedTierModels: Partial<Record<LlmTaskTier, string>> = {
    ...(existing?.tierModels || {}),
  };
  if (input.tierModels) {
    for (const [t, model] of Object.entries(input.tierModels)) {
      const tierKey = t as LlmTaskTier;
      if (!model || !model.trim()) {
        delete updatedTierModels[tierKey];
      } else {
        updatedTierModels[tierKey] = model.trim();
      }
    }
  }

  const updatedCustomTiers = {
    gemini: { ...(existing?.customTiers?.gemini || {}) },
    ollama: { ...(existing?.customTiers?.ollama || {}) },
    "openai-compatible": { ...(existing?.customTiers?.["openai-compatible"] || {}) },
  };
  if (input.customTiers?.gemini) {
    for (const [t, model] of Object.entries(input.customTiers.gemini)) {
      const tierKey = t as LlmTaskTier;
      if (!model || !model.trim()) {
        delete updatedCustomTiers.gemini[tierKey];
      } else {
        updatedCustomTiers.gemini[tierKey] = model.trim();
      }
    }
  }
  if (input.customTiers?.ollama) {
    for (const [t, model] of Object.entries(input.customTiers.ollama)) {
      const tierKey = t as LlmTaskTier;
      if (!model || !model.trim()) {
        delete updatedCustomTiers.ollama[tierKey];
      } else {
        updatedCustomTiers.ollama[tierKey] = model.trim();
      }
    }
  }
  if (input.customTiers?.["openai-compatible"]) {
    for (const [t, model] of Object.entries(input.customTiers["openai-compatible"])) {
      const tierKey = t as LlmTaskTier;
      if (!model || !model.trim()) {
        delete updatedCustomTiers["openai-compatible"][tierKey];
      } else {
        updatedCustomTiers["openai-compatible"][tierKey] = model.trim();
      }
    }
  }

  const updated: TenantByokCredentials = {
    companyId,
    provider: input.provider || existing?.provider || "gemini",
    geminiApiKey: geminiApiKey !== undefined ? geminiApiKey : (existing?.geminiApiKey ?? ""),
    ollamaBaseUrl: input.ollamaBaseUrl !== undefined ? input.ollamaBaseUrl.trim() : (existing?.ollamaBaseUrl ?? ""),
    openaiCompatibleApiKey:
      openaiCompatibleApiKey !== undefined
        ? openaiCompatibleApiKey
        : (existing?.openaiCompatibleApiKey ?? ""),
    openaiCompatibleBaseUrl:
      input.openaiCompatibleBaseUrl !== undefined
        ? input.openaiCompatibleBaseUrl.trim()
        : (existing?.openaiCompatibleBaseUrl ?? ""),
    tavilyApiKey:
      tavilyApiKey !== undefined
        ? tavilyApiKey
        : (existing?.tavilyApiKey ?? ""),
    firecrawlApiKey:
      firecrawlApiKey !== undefined
        ? firecrawlApiKey
        : (existing?.firecrawlApiKey ?? ""),
    tierModels: updatedTierModels,
    customTiers: updatedCustomTiers,
    updatedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(updated);

  const existingRow = await prisma.systemSetting.findFirst({
    where: { companyId, key: BYOK_SETTINGS_KEY },
  });

  if (existingRow) {
    await prisma.systemSetting.update({
      where: { id: existingRow.id },
      data: { value: serialized },
    });
  } else {
    await prisma.systemSetting.create({
      data: {
        companyId,
        key: BYOK_SETTINGS_KEY,
        value: serialized,
      },
    });
  }

  credentialsCache.set(companyId, { creds: updated, expiresAt: Date.now() + CACHE_TTL_MS });
  return updated;
}

/**
 * Deletes BYOK credentials for a given tenant organization.
 */
export async function deleteTenantCredentials(companyId: string): Promise<void> {
  if (!companyId) return;

  const existingRow = await prisma.systemSetting.findFirst({
    where: { companyId, key: BYOK_SETTINGS_KEY },
  });

  if (existingRow) {
    await prisma.systemSetting.delete({
      where: { id: existingRow.id },
    });
  }

  credentialsCache.delete(companyId);
}

/**
 * Resolves Tavily API key in priority order:
 * 1. Tenant BYOK (getTenantCredentials)
 * 2. System AdminSettings (getSystemSettings)
 * 3. process.env.TAVILY_API_KEY (trimmed)
 * 4. null
 */
export async function resolveTavilyApiKey(companyId?: string | null): Promise<string | null> {
  if (companyId) {
    const tenantCreds = await getTenantCredentials(companyId);
    if (tenantCreds?.tavilyApiKey && !isMaskedKey(tenantCreds.tavilyApiKey)) {
      const trimmed = tenantCreds.tavilyApiKey.trim();
      if (trimmed) return trimmed;
    }
  }

  const sys = await getSystemSettings();
  if (sys?.tavilyApiKey && !isMaskedKey(sys.tavilyApiKey)) {
    const trimmed = sys.tavilyApiKey.trim();
    if (trimmed) return trimmed;
  }

  const envKey = process.env.TAVILY_API_KEY?.trim();
  if (envKey) return envKey;

  return null;
}

/**
 * Resolves Firecrawl API key in priority order:
 * 1. Tenant BYOK (getTenantCredentials)
 * 2. System AdminSettings (getSystemSettings)
 * 3. process.env.FIRECRAWL_API_KEY (trimmed)
 * 4. null
 */
export async function resolveFirecrawlApiKey(companyId?: string | null): Promise<string | null> {
  if (companyId) {
    const tenantCreds = await getTenantCredentials(companyId);
    if (tenantCreds?.firecrawlApiKey && !isMaskedKey(tenantCreds.firecrawlApiKey)) {
      const trimmed = tenantCreds.firecrawlApiKey.trim();
      if (trimmed) return trimmed;
    }
  }

  const sys = await getSystemSettings();
  if (sys?.firecrawlApiKey && !isMaskedKey(sys.firecrawlApiKey)) {
    const trimmed = sys.firecrawlApiKey.trim();
    if (trimmed) return trimmed;
  }

  const envKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (envKey) return envKey;

  return null;
}
