import { maskApiKey } from "@/lib/tenant/credentials";

export interface LlmTierSettings {
  realtime: string;
  structured: string;
  reasoning: string;
  vision: string;
}

export interface AdminSettings {
  llm: {
    provider: "gemini" | "ollama" | "openai-compatible";
    model: string;
    apiKey: string;
    openaiCompatibleApiKey?: string;
    tiers: {
      gemini: LlmTierSettings;
      ollama: LlmTierSettings;
      "openai-compatible"?: LlmTierSettings;
    };
  };
  servers: {
    ttsUrl: string;
    comfyuiUrl: string;
    ollamaUrl: string;
    openaiCompatibleUrl?: string;
  };
  stock: {
    providerPriority: string[];
    pexelsApiKey: string;
    pixabayApiKey: string;
  };
  music: {
    providerPriority: string[];
  };
  rendering: {
    defaultAspectRatio: "vertical" | "horizontal";
    defaultCaptionStyle: "beast" | "minimal" | "breaking";
    defaultBgMusicVolume: number;
  };
  automation: {
    globalAutoScript: boolean;
    globalAutoPublish: boolean;
    globalRequireApproval: boolean;
    schedulerIntervalMinutes: number;
  };
  webhooks: {
    slackUrl: string;
    discordUrl: string;
  };
  search?: {
    tavilyApiKey?: string;
    firecrawlApiKey?: string;
  };
}

/**
 * Masks API keys for safe UI display (e.g. ••••1234) per AGENTS.md §3.5.
 * If no database override key is stored, previews the masked environment variable if present.
 */
export function maskAdminSettings(settings: AdminSettings): AdminSettings {
  const llmKey = typeof settings.llm?.apiKey === "string" ? settings.llm.apiKey.trim() : "";
  const openaiKey = typeof settings.llm?.openaiCompatibleApiKey === "string" ? settings.llm.openaiCompatibleApiKey.trim() : "";
  const pexelsKey = typeof settings.stock?.pexelsApiKey === "string" ? settings.stock.pexelsApiKey.trim() : "";
  const pixabayKey = typeof settings.stock?.pixabayApiKey === "string" ? settings.stock.pixabayApiKey.trim() : "";
  const tavilyKey = typeof settings.search?.tavilyApiKey === "string" ? settings.search.tavilyApiKey.trim() : "";
  const firecrawlKey = typeof settings.search?.firecrawlApiKey === "string" ? settings.search.firecrawlApiKey.trim() : "";

  const envGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const envOpenaiKey = process.env.OPENAI_COMPATIBLE_API_KEY || "";
  const envTavilyKey = process.env.TAVILY_API_KEY || "";
  const envFirecrawlKey = process.env.FIRECRAWL_API_KEY || "";

  return {
    ...settings,
    llm: {
      ...settings.llm,
      apiKey: llmKey
        ? maskApiKey(llmKey)
        : (envGeminiKey ? maskApiKey(envGeminiKey) : ""),
      openaiCompatibleApiKey: openaiKey
        ? maskApiKey(openaiKey)
        : (envOpenaiKey ? maskApiKey(envOpenaiKey) : ""),
    },
    stock: {
      ...settings.stock,
      pexelsApiKey: pexelsKey
        ? maskApiKey(pexelsKey)
        : (process.env.PEXELS_API_KEY ? maskApiKey(process.env.PEXELS_API_KEY) : ""),
      pixabayApiKey: pixabayKey
        ? maskApiKey(pixabayKey)
        : (process.env.PIXABAY_API_KEY ? maskApiKey(process.env.PIXABAY_API_KEY) : ""),
    },
    search: {
      ...settings.search,
      tavilyApiKey: tavilyKey
        ? maskApiKey(tavilyKey)
        : (envTavilyKey ? maskApiKey(envTavilyKey) : ""),
      firecrawlApiKey: firecrawlKey
        ? maskApiKey(firecrawlKey)
        : (envFirecrawlKey ? maskApiKey(envFirecrawlKey) : ""),
    },
  };
}
