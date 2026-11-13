import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/apiHandler";
import {
  invalidateSystemSettingsCache,
  isMaskedKey,
} from "@/lib/tenant/credentials";
import {
  type AdminSettings,
  maskAdminSettings,
} from "@/lib/admin/settingsMask";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.resolve(process.cwd(), "data/admin-settings.json");

function getDefaultSettings(): AdminSettings {
  return {
    llm: {
      provider: (process.env.LLM_PROVIDER as "gemini" | "ollama" | "openai-compatible") || "gemini",
      model: process.env.LLM_MODEL || "gemini-2.5-flash",
      apiKey: "",
      openaiCompatibleApiKey: "",
      tiers: {
        gemini: {
          realtime: process.env.GEMINI_REALTIME_MODEL || "gemini-2.5-flash",
          structured: process.env.GEMINI_STRUCTURED_MODEL || "gemini-2.5-flash",
          reasoning: process.env.GEMINI_REASONING_MODEL || "gemini-2.5-pro",
          vision: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash",
        },
        ollama: {
          realtime: process.env.OLLAMA_REALTIME_MODEL || "qwen2.5:3b",
          structured: process.env.OLLAMA_STRUCTURED_MODEL || "qwen3.5:9b",
          reasoning: process.env.OLLAMA_REASONING_MODEL || "qwen3.5:32b",
          vision: process.env.OLLAMA_VISION_MODEL || "llava",
        },
        "openai-compatible": {
          realtime: process.env.OPENAI_COMPATIBLE_REALTIME_MODEL || process.env.OPENAI_COMPATIBLE_MODEL || "gpt-4o-mini",
          structured: process.env.OPENAI_COMPATIBLE_STRUCTURED_MODEL || process.env.OPENAI_COMPATIBLE_MODEL || "gpt-4o-mini",
          reasoning: process.env.OPENAI_COMPATIBLE_REASONING_MODEL || process.env.OPENAI_COMPATIBLE_MODEL || "gpt-4o",
          vision: process.env.OPENAI_COMPATIBLE_VISION_MODEL || process.env.OPENAI_COMPATIBLE_MODEL || "gpt-4o-mini",
        },
      },
    },
    servers: {
      ttsUrl: process.env.MODERN_TTS_SERVER_URL || "http://localhost:8005",
      comfyuiUrl: process.env.COMFYUI_URL || "http://localhost:8188",
      ollamaUrl: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || "http://localhost:11434",
      openaiCompatibleUrl: process.env.OPENAI_COMPATIBLE_BASE_URL || process.env.OPENAI_COMPATIBLE_URL || "http://localhost:8000/v1",
    },
    stock: {
      providerPriority: (process.env.STOCK_PROVIDER_PRIORITY || "pexels,pixabay").split(",").map(s => s.trim()),
      pexelsApiKey: "",
      pixabayApiKey: "",
    },
    music: {
      providerPriority: (process.env.MUSIC_PROVIDER_PRIORITY || "pixabay-music, jamendo-music, ccmixter-music").split(",").map(s => s.trim()),
    },
    rendering: {
      defaultAspectRatio: "vertical",
      defaultCaptionStyle: "beast",
      defaultBgMusicVolume: 0.2,
    },
    automation: {
      globalAutoScript: true,
      globalAutoPublish: false,
      globalRequireApproval: true,
      schedulerIntervalMinutes: 30,
    },
    webhooks: {
      slackUrl: "",
      discordUrl: "",
    },
    search: {
      tavilyApiKey: "",
      firecrawlApiKey: "",
    },
  };
}

import { prisma } from "@/lib/prisma";

const SETTINGS_KEY = "admin_settings";

async function loadSettings(): Promise<AdminSettings> {
  const defaults = getDefaultSettings();
  try {
    const record = await prisma.systemSetting.findFirst({
      where: { key: SETTINGS_KEY, companyId: null },
    });
    if (record) {
      const saved = JSON.parse(record.value);
      return {
        llm: {
          ...defaults.llm,
          ...saved.llm,
          apiKey:
            typeof saved.llm?.apiKey === "string" && !isMaskedKey(saved.llm.apiKey)
              ? saved.llm.apiKey.trim()
              : "",
          openaiCompatibleApiKey:
            typeof saved.llm?.openaiCompatibleApiKey === "string" && !isMaskedKey(saved.llm.openaiCompatibleApiKey)
              ? saved.llm.openaiCompatibleApiKey.trim()
              : "",
          tiers: {
            gemini: { ...defaults.llm.tiers.gemini, ...(saved.llm?.tiers?.gemini || {}) },
            ollama: { ...defaults.llm.tiers.ollama, ...(saved.llm?.tiers?.ollama || {}) },
            "openai-compatible": {
              ...(defaults.llm.tiers["openai-compatible"] || {
                realtime: "gpt-4o-mini",
                structured: "gpt-4o-mini",
                reasoning: "gpt-4o",
                vision: "gpt-4o-mini",
              }),
              ...(saved.llm?.tiers?.["openai-compatible"] || {}),
            },
          },
        },
        servers: {
          ...defaults.servers,
          ...saved.servers,
          openaiCompatibleUrl:
            typeof saved.servers?.openaiCompatibleUrl === "string"
              ? saved.servers.openaiCompatibleUrl.trim()
              : defaults.servers.openaiCompatibleUrl,
        },
        stock: {
          ...defaults.stock,
          ...saved.stock,
          pexelsApiKey:
            typeof saved.stock?.pexelsApiKey === "string" && !isMaskedKey(saved.stock.pexelsApiKey)
              ? saved.stock.pexelsApiKey.trim()
              : "",
          pixabayApiKey:
            typeof saved.stock?.pixabayApiKey === "string" && !isMaskedKey(saved.stock.pixabayApiKey)
              ? saved.stock.pixabayApiKey.trim()
              : "",
        },
        music: { ...defaults.music, ...saved.music },
        rendering: { ...defaults.rendering, ...saved.rendering },
        automation: { ...defaults.automation, ...saved.automation },
        webhooks: { ...defaults.webhooks, ...saved.webhooks },
        search: {
          ...defaults.search,
          ...saved.search,
          tavilyApiKey:
            typeof saved.search?.tavilyApiKey === "string" && !isMaskedKey(saved.search.tavilyApiKey)
              ? saved.search.tavilyApiKey.trim()
              : "",
          firecrawlApiKey:
            typeof saved.search?.firecrawlApiKey === "string" && !isMaskedKey(saved.search.firecrawlApiKey)
              ? saved.search.firecrawlApiKey.trim()
              : "",
        },
      };
    }

    // Migration fallback: If legacy data/admin-settings.json exists, read and migrate to DB (non-test only)
    if (process.env.NODE_ENV !== "test" && fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const saved = JSON.parse(raw);
      const merged: AdminSettings = {
        llm: {
          ...defaults.llm,
          ...saved.llm,
          apiKey:
            typeof saved.llm?.apiKey === "string" && !isMaskedKey(saved.llm.apiKey)
              ? saved.llm.apiKey.trim()
              : "",
          openaiCompatibleApiKey:
            typeof saved.llm?.openaiCompatibleApiKey === "string" && !isMaskedKey(saved.llm.openaiCompatibleApiKey)
              ? saved.llm.openaiCompatibleApiKey.trim()
              : "",
          tiers: {
            gemini: { ...defaults.llm.tiers.gemini, ...(saved.llm?.tiers?.gemini || {}) },
            ollama: { ...defaults.llm.tiers.ollama, ...(saved.llm?.tiers?.ollama || {}) },
            "openai-compatible": {
              ...(defaults.llm.tiers["openai-compatible"] || {
                realtime: "gpt-4o-mini",
                structured: "gpt-4o-mini",
                reasoning: "gpt-4o",
                vision: "gpt-4o-mini",
              }),
              ...(saved.llm?.tiers?.["openai-compatible"] || {}),
            },
          },
        },
        servers: {
          ...defaults.servers,
          ...saved.servers,
          openaiCompatibleUrl:
            typeof saved.servers?.openaiCompatibleUrl === "string"
              ? saved.servers.openaiCompatibleUrl.trim()
              : defaults.servers.openaiCompatibleUrl,
        },
        stock: {
          ...defaults.stock,
          ...saved.stock,
          pexelsApiKey:
            typeof saved.stock?.pexelsApiKey === "string" && !isMaskedKey(saved.stock.pexelsApiKey)
              ? saved.stock.pexelsApiKey.trim()
              : "",
          pixabayApiKey:
            typeof saved.stock?.pixabayApiKey === "string" && !isMaskedKey(saved.stock.pixabayApiKey)
              ? saved.stock.pixabayApiKey.trim()
              : "",
        },
        music: { ...defaults.music, ...saved.music },
        rendering: { ...defaults.rendering, ...saved.rendering },
        automation: { ...defaults.automation, ...saved.automation },
        webhooks: { ...defaults.webhooks, ...saved.webhooks },
        search: {
          ...defaults.search,
          ...saved.search,
          tavilyApiKey:
            typeof saved.search?.tavilyApiKey === "string" && !isMaskedKey(saved.search.tavilyApiKey)
              ? saved.search.tavilyApiKey.trim()
              : "",
          firecrawlApiKey:
            typeof saved.search?.firecrawlApiKey === "string" && !isMaskedKey(saved.search.firecrawlApiKey)
              ? saved.search.firecrawlApiKey.trim()
              : "",
        },
      };
      await saveSettings(merged).catch(() => {});
      return merged;
    }
  } catch (e) {
    console.error("[Settings] Failed to load settings:", e);
  }
  return defaults;
}

async function saveSettings(settings: AdminSettings): Promise<void> {
  try {
    const existing = await prisma.systemSetting.findFirst({
      where: { key: SETTINGS_KEY, companyId: null },
    });
    if (existing) {
      await prisma.systemSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(settings, null, 2) },
      });
    } else {
      await prisma.systemSetting.create({
        data: {
          key: SETTINGS_KEY,
          companyId: null,
          value: JSON.stringify(settings, null, 2),
        },
      });
    }
    if (process.env.NODE_ENV !== "test") {
      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[Settings] Failed to persist settings to DB:", err);
  }
}

/**
 * GET /api/admin/settings
 * Read current admin settings (merged from env + saved overrides).
 */
export const GET = withAdminAuth(async () => {
  const settings = await loadSettings();
  return NextResponse.json(maskAdminSettings(settings));
});

/**
 * PUT /api/admin/settings
 * Update admin settings (saves to Prisma SystemSetting).
 * Does NOT modify .env — only overrides runtime behavior.
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json();
  const current = await loadSettings();

  const getCleanKey = (val: unknown): string | undefined => {
    if (typeof val === "string") return val.trim();
    if (val === null) return "";
    return undefined;
  };

  const incomingLlmKey = getCleanKey(body.llm?.apiKey);
  const incomingOpenaiKey = getCleanKey(body.llm?.openaiCompatibleApiKey);
  const incomingPexelsKey = getCleanKey(body.stock?.pexelsApiKey);
  const incomingPixabayKey = getCleanKey(body.stock?.pixabayApiKey);
  const incomingTavilyKey = getCleanKey(body.search?.tavilyApiKey);
  const incomingFirecrawlKey = getCleanKey(body.search?.firecrawlApiKey);

  let resolvedLlmKey = current.llm.apiKey;
  if (incomingLlmKey !== undefined) {
    resolvedLlmKey = isMaskedKey(incomingLlmKey) ? current.llm.apiKey : incomingLlmKey;
  }

  let resolvedOpenaiKey = current.llm.openaiCompatibleApiKey || "";
  if (incomingOpenaiKey !== undefined) {
    resolvedOpenaiKey = isMaskedKey(incomingOpenaiKey)
      ? (current.llm.openaiCompatibleApiKey || "")
      : incomingOpenaiKey;
  }

  let resolvedPexelsKey = current.stock.pexelsApiKey;
  if (incomingPexelsKey !== undefined) {
    resolvedPexelsKey = isMaskedKey(incomingPexelsKey) ? current.stock.pexelsApiKey : incomingPexelsKey;
  }

  let resolvedPixabayKey = current.stock.pixabayApiKey;
  if (incomingPixabayKey !== undefined) {
    resolvedPixabayKey = isMaskedKey(incomingPixabayKey) ? current.stock.pixabayApiKey : incomingPixabayKey;
  }

  let resolvedTavilyKey = current.search?.tavilyApiKey || "";
  if (incomingTavilyKey !== undefined) {
    resolvedTavilyKey = isMaskedKey(incomingTavilyKey)
      ? (current.search?.tavilyApiKey || "")
      : incomingTavilyKey;
  }

  let resolvedFirecrawlKey = current.search?.firecrawlApiKey || "";
  if (incomingFirecrawlKey !== undefined) {
    resolvedFirecrawlKey = isMaskedKey(incomingFirecrawlKey)
      ? (current.search?.firecrawlApiKey || "")
      : incomingFirecrawlKey;
  }

  if (isMaskedKey(resolvedLlmKey)) resolvedLlmKey = "";
  if (isMaskedKey(resolvedOpenaiKey)) resolvedOpenaiKey = "";
  if (isMaskedKey(resolvedPexelsKey)) resolvedPexelsKey = "";
  if (isMaskedKey(resolvedPixabayKey)) resolvedPixabayKey = "";
  if (isMaskedKey(resolvedTavilyKey)) resolvedTavilyKey = "";
  if (isMaskedKey(resolvedFirecrawlKey)) resolvedFirecrawlKey = "";

  // Merge incoming updates with current settings
  const updated: AdminSettings = {
    llm: {
      ...current.llm,
      ...body.llm,
      apiKey: resolvedLlmKey,
      openaiCompatibleApiKey: resolvedOpenaiKey,
      tiers: {
        gemini: { ...current.llm.tiers.gemini, ...(body.llm?.tiers?.gemini || {}) },
        ollama: { ...current.llm.tiers.ollama, ...(body.llm?.tiers?.ollama || {}) },
        "openai-compatible": {
          ...(current.llm.tiers["openai-compatible"] || {
            realtime: "gpt-4o-mini",
            structured: "gpt-4o-mini",
            reasoning: "gpt-4o",
            vision: "gpt-4o-mini",
          }),
          ...(body.llm?.tiers?.["openai-compatible"] || {}),
        },
      },
    },
    servers: { ...current.servers, ...body.servers },
    stock: {
      ...current.stock,
      ...body.stock,
      pexelsApiKey: resolvedPexelsKey,
      pixabayApiKey: resolvedPixabayKey,
    },
    music: { ...current.music, ...body.music },
    rendering: { ...current.rendering, ...body.rendering },
    automation: { ...current.automation, ...body.automation },
    webhooks: { ...current.webhooks, ...body.webhooks },
    search: {
      ...current.search,
      ...body.search,
      tavilyApiKey: resolvedTavilyKey,
      firecrawlApiKey: resolvedFirecrawlKey,
    },
  };

  await saveSettings(updated);
  invalidateSystemSettingsCache();

  return NextResponse.json({ success: true, settings: maskAdminSettings(updated) });
});

/**
 * POST /api/admin/settings
 * Alias for PUT.
 */
export const POST = PUT;
