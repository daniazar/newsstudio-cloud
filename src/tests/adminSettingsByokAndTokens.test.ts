import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSettings, PUT as putSettings } from "@/app/api/admin/settings/route";
import { GET as getTokens } from "@/app/api/admin/settings/tokens/route";
import { GET as getByok, POST as postByok, DELETE as deleteByok } from "@/app/api/admin/settings/byok/route";
import { prisma } from "@/lib/prisma";
import {
  invalidateTenantCredentialsCache,
  invalidateSystemSettingsCache,
  getSystemSettings,
  getSystemGeminiApiKeySync,
  getSystemOllamaUrlSync,
  ADMIN_SETTINGS_KEY,
  BYOK_SETTINGS_KEY,
} from "@/lib/tenant/credentials";
import { resolveLanguageModel } from "@/lib/llm/aiSdkGateway";

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    ok: true,
    userId: "admin_test_1",
    email: "admin@newsstudio.com",
  }),
  requireSuperAdmin: vi.fn().mockResolvedValue({
    ok: true,
    userId: "admin_test_1",
    email: "admin@newsstudio.com",
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    company: {
      findMany: vi.fn(),
      upsert: vi.fn().mockResolvedValue({ id: "org_alpha" }),
    },
    aiTokenUsage: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

describe("Admin Settings — Task-Tier Model Router, BYOK & Token Spend Endpoints", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    invalidateTenantCredentialsCache();
    invalidateSystemSettingsCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    invalidateSystemSettingsCache();
  });

  describe("GET /api/admin/settings", () => {
    it("returns settings with Task-Tier routing configuration for both Gemini and Ollama", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/admin/settings");
      const res = await getSettings(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.llm).toBeDefined();
      expect(data.llm.tiers).toBeDefined();
      expect(data.llm.tiers.gemini).toEqual({
        realtime: "gemini-2.5-flash",
        structured: "gemini-2.5-flash",
        reasoning: "gemini-2.5-pro",
        vision: "gemini-2.5-flash",
      });
      expect(data.llm.tiers.ollama).toEqual({
        realtime: "qwen2.5:3b",
        structured: "qwen3.5:9b",
        reasoning: "qwen3.5:32b",
        vision: "llava",
      });
    });
  });

  describe("PUT /api/admin/settings", () => {
    it("updates Task-Tier configurations and persists to Prisma SystemSetting", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.systemSetting.create).mockResolvedValueOnce({ id: "set_1" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          llm: {
            provider: "gemini",
            tiers: {
              gemini: {
                reasoning: "gemini-2.5-pro-custom",
              },
            },
          },
        }),
      });

      const res = await putSettings(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.settings.llm.tiers.gemini.reasoning).toBe("gemini-2.5-pro-custom");
      expect(prisma.systemSetting.create).toHaveBeenCalled();
    });

    it("saves raw API keys to prisma.systemSetting while returning masked keys in PUT and subsequent GET responses per AGENTS.md §3.5", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.systemSetting.create).mockResolvedValueOnce({ id: "set_keys" } as any);

      const putReq = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          llm: {
            apiKey: "AIzaSyGlobalSecret9999",
          },
          stock: {
            pexelsApiKey: "pxGlobal8888",
            pixabayApiKey: "pixGlobal7777",
          },
        }),
      });

      const putRes = await putSettings(putReq, { params: Promise.resolve({}) });
      expect(putRes.status).toBe(200);

      const putBody = await putRes.json();
      expect(putBody.success).toBe(true);
      // All three keys must be strictly masked in HTTP response
      expect(putBody.settings.llm.apiKey).toBe("••••9999");
      expect(putBody.settings.stock.pexelsApiKey).toBe("••••8888");
      expect(putBody.settings.stock.pixabayApiKey).toBe("••••7777");

      // Verify raw plaintext keys were persisted into prisma.systemSetting
      expect(prisma.systemSetting.create).toHaveBeenCalled();
      const createCall = vi.mocked(prisma.systemSetting.create).mock.calls[0][0];
      const savedPayload = JSON.parse(createCall.data.value as string);
      expect(savedPayload.llm.apiKey).toBe("AIzaSyGlobalSecret9999");
      expect(savedPayload.stock.pexelsApiKey).toBe("pxGlobal8888");
      expect(savedPayload.stock.pixabayApiKey).toBe("pixGlobal7777");

      // Subsequent GET: Prisma returns the record with raw keys, but response masks them
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "set_keys",
        companyId: null,
        key: "admin_settings",
        value: JSON.stringify(savedPayload),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const getReq = new NextRequest("http://localhost:3000/api/admin/settings");
      const getRes = await getSettings(getReq, { params: Promise.resolve({}) });
      expect(getRes.status).toBe(200);

      const getData = await getRes.json();
      expect(getData.llm.apiKey).toBe("••••9999");
      expect(getData.stock.pexelsApiKey).toBe("••••8888");
      expect(getData.stock.pixabayApiKey).toBe("••••7777");
    });

    it("preserves raw API keys when user submits masked strings (••••)", async () => {
      const existingSettings = {
        llm: {
          apiKey: "AIzaSyGlobalSecret9999",
        },
        stock: {
          pexelsApiKey: "pxGlobal8888",
          pixabayApiKey: "pixGlobal7777",
        },
      };

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "set_existing",
        companyId: null,
        key: "admin_settings",
        value: JSON.stringify(existingSettings),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "set_existing",
        companyId: null,
        key: "admin_settings",
        value: JSON.stringify(existingSettings),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.update).mockResolvedValueOnce({ id: "set_existing" } as any);

      const putReq = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          llm: {
            apiKey: "••••9999",
          },
          stock: {
            pexelsApiKey: "••••8888",
            pixabayApiKey: "••••7777",
          },
        }),
      });

      const putRes = await putSettings(putReq, { params: Promise.resolve({}) });
      expect(putRes.status).toBe(200);

      const putBody = await putRes.json();
      expect(putBody.success).toBe(true);
      expect(putBody.settings.llm.apiKey).toBe("••••9999");
      expect(putBody.settings.stock.pexelsApiKey).toBe("••••8888");
      expect(putBody.settings.stock.pixabayApiKey).toBe("••••7777");

      expect(prisma.systemSetting.update).toHaveBeenCalled();
      const updateCall = vi.mocked(prisma.systemSetting.update).mock.calls[0][0];
      const updatedPayload = JSON.parse(updateCall.data.value as string);
      expect(updatedPayload.llm.apiKey).toBe("AIzaSyGlobalSecret9999");
      expect(updatedPayload.stock.pexelsApiKey).toBe("pxGlobal8888");
      expect(updatedPayload.stock.pixabayApiKey).toBe("pixGlobal7777");
    });

    it("clears API keys cleanly when submitting empty string or null without throwing TypeError", async () => {
      process.env.GEMINI_API_KEY = "AIzaSyEnvKey1234";

      const existingSettings = {
        llm: {
          apiKey: "AIzaSyGlobalSecret9999",
        },
        stock: {
          pexelsApiKey: "pxGlobal8888",
        },
      };

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "set_existing",
        companyId: null,
        key: "admin_settings",
        value: JSON.stringify(existingSettings),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "set_existing",
        companyId: null,
        key: "admin_settings",
        value: JSON.stringify(existingSettings),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.update).mockResolvedValueOnce({ id: "set_existing" } as any);

      // Submit apiKey as "" to clear override, and pexelsApiKey as null
      const putReq = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          llm: {
            apiKey: "",
          },
          stock: {
            pexelsApiKey: null,
          },
        }),
      });

      const putRes = await putSettings(putReq, { params: Promise.resolve({}) });
      expect(putRes.status).toBe(200);

      const putBody = await putRes.json();
      expect(putBody.success).toBe(true);
      // llm.apiKey override was cleared in DB, so it resumes previewing the env key
      expect(putBody.settings.llm.apiKey).toBe("••••1234");
      // pexelsApiKey was cleared in DB and has no env key, so it returns empty string
      expect(putBody.settings.stock.pexelsApiKey).toBe("");

      expect(prisma.systemSetting.update).toHaveBeenCalled();
      const updateCall = vi.mocked(prisma.systemSetting.update).mock.calls[0][0];
      const updatedPayload = JSON.parse(updateCall.data.value as string);
      expect(updatedPayload.llm.apiKey).toBe("");
      expect(updatedPayload.stock.pexelsApiKey).toBe("");
    });

    it("previews GOOGLE_API_KEY and PIXABAY_API_KEY in maskAdminSettings when no DB override exists", async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_API_KEY = "AIzaSyGoogleSecret4321";
      process.env.PIXABAY_API_KEY = "pxbSecretEnv7890";

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null);

      const getReq = new NextRequest("http://localhost:3000/api/admin/settings");
      const getRes = await getSettings(getReq, { params: Promise.resolve({}) });
      expect(getRes.status).toBe(200);

      const getData = await getRes.json();
      expect(getData.llm.apiKey).toBe("••••4321");
      expect(getData.stock.pixabayApiKey).toBe("••••7890");
    });
  });

  describe("Global Runtime Key & Ollama URL Overrides", () => {
    it("populates geminiApiKey and ollamaBaseUrl in getSystemSettings, ignoring masked keys", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "sys_runtime_1",
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
        value: JSON.stringify({
          llm: {
            provider: "gemini",
            apiKey: "AIzaSyGlobalSecret9999",
          },
          servers: {
            ollamaUrl: "http://global-ollama-host:11434",
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const settings = await getSystemSettings();
      expect(settings?.geminiApiKey).toBe("AIzaSyGlobalSecret9999");
      expect(settings?.ollamaBaseUrl).toBe("http://global-ollama-host:11434");
      expect(getSystemGeminiApiKeySync()).toBe("AIzaSyGlobalSecret9999");
      expect(getSystemOllamaUrlSync()).toBe("http://global-ollama-host:11434");

      // Verify masked key in DB is ignored and not populated
      invalidateSystemSettingsCache();
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "sys_runtime_2",
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
        value: JSON.stringify({
          llm: {
            apiKey: "••••9999",
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const settingsMasked = await getSystemSettings();
      expect(settingsMasked?.geminiApiKey).toBeUndefined();
      expect(getSystemGeminiApiKeySync()).toBeNull();
    });

    it("wires getSystemGeminiApiKeySync and getSystemOllamaUrlSync into resolveLanguageModel", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // Without system key or env var, Gemini resolution throws
      expect(() =>
        resolveLanguageModel({
          provider: "gemini",
          skipMiddleware: true,
        })
      ).toThrow("GEMINI_API_KEY is not set in environment variables");

      // Seed system settings cache with global override key
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "sys_runtime_3",
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
        value: JSON.stringify({
          llm: {
            apiKey: "AIzaSyGlobalRuntimeKey-777",
          },
          servers: {
            ollamaUrl: "http://runtime-ollama:11434",
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await getSystemSettings();

      // Now Gemini resolves without env var using global runtime override key
      const geminiModel = resolveLanguageModel({
        provider: "gemini",
        skipMiddleware: true,
      });
      expect(geminiModel.modelId).toBe("gemini-2.5-flash");

      // Ollama resolves using global runtime override URL
      const ollamaModel = resolveLanguageModel({
        provider: "ollama",
        skipMiddleware: true,
      });
      expect(ollamaModel.modelId).toBe("qwen3.5:9b");
    });

    it("honors resolution precedence: options > tenant BYOK > system settings > environment variables", async () => {
      process.env.GEMINI_API_KEY = "env-gemini-key";

      // 1. System key in cache
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "sys_runtime_prec",
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
        value: JSON.stringify({
          llm: {
            apiKey: "system-gemini-key",
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      await getSystemSettings();

      // System key overrides process.env.GEMINI_API_KEY
      expect(getSystemGeminiApiKeySync()).toBe("system-gemini-key");

      // 2. Explicit options.apiKey overrides everything
      const explicitModel = resolveLanguageModel({
        provider: "gemini",
        apiKey: "options-gemini-key",
        skipMiddleware: true,
      });
      expect(explicitModel.modelId).toBe("gemini-2.5-flash");

      // 3. Masked key in tenant BYOK credentials does not poison resolution (falls back to system key)
      const { saveTenantCredentials } = await import("@/lib/tenant/credentials");
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.systemSetting.create).mockResolvedValueOnce({ id: "byok_masked" } as any);

      await saveTenantCredentials("org_masked_test", {
        geminiApiKey: "••••1234",
      });

      const tenantModel = resolveLanguageModel({
        provider: "gemini",
        companyId: "org_masked_test",
        skipMiddleware: true,
      });
      expect(tenantModel.modelId).toBe("gemini-2.5-flash");
    });
  });

  describe("GET /api/admin/settings/tokens", () => {
    it("aggregates prompt/completion tokens, costs, model breakdown, and daily timeline", async () => {
      vi.mocked(prisma.aiTokenUsage.findMany).mockResolvedValueOnce([
        {
          id: "u1",
          companyId: "org_1",
          provider: "gemini",
          model: "gemini-2.5-flash",
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.003,
          createdAt: new Date("2026-10-29T10:00:00Z"),
        },
        {
          id: "u2",
          companyId: "org_1",
          provider: "ollama",
          model: "qwen3.5:9b",
          promptTokens: 2000,
          completionTokens: 1000,
          totalTokens: 3000,
          estimatedCost: 0.0,
          createdAt: new Date("2026-10-29T11:00:00Z"),
        },
      ] as any);

      vi.mocked(prisma.aiTokenUsage.aggregate).mockResolvedValueOnce({
        _sum: {
          promptTokens: 3000,
          completionTokens: 1500,
          totalTokens: 4500,
          estimatedCost: 0.003,
        },
        _count: {
          id: 2,
        },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/settings/tokens?days=7");
      const res = await getTokens(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.summary.totalTokens).toBe(4500);
      expect(data.summary.estimatedCost).toBe(0.003);
      expect(data.summary.totalCalls).toBe(2);
      expect(data.byProvider.gemini.totalTokens).toBe(1500);
      expect(data.byProvider.ollama.totalTokens).toBe(3000);
      expect(data.byModel).toHaveLength(2);
      expect(data.timeline).toBeDefined();
    });
  });

  describe("BYOK Management: /api/admin/settings/byok", () => {
    it("lists organizations with hasByok status", async () => {
      vi.mocked(prisma.company.findMany).mockResolvedValueOnce([
        { id: "org_alpha", name: "Alpha Corp", tier: "enterprise" },
        { id: "org_beta", name: "Beta LLC", tier: "free" },
      ] as any);

      vi.mocked(prisma.systemSetting.findMany).mockResolvedValueOnce([
        { companyId: "org_alpha", updatedAt: new Date() },
      ] as any);

      const req = new NextRequest("http://localhost:3000/api/admin/settings/byok");
      const res = await getByok(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.companies).toHaveLength(2);
      expect(data.companies[0]).toEqual(
        expect.objectContaining({
          id: "org_alpha",
          hasByok: true,
        })
      );
      expect(data.companies[1]).toEqual(
        expect.objectContaining({
          id: "org_beta",
          hasByok: false,
        })
      );
    });

    it("returns masked credentials for a specific organization per AGENTS.md §3.5", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "byok_1",
        companyId: "org_alpha",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify({
          companyId: "org_alpha",
          provider: "gemini",
          geminiApiKey: "AIzaSyD-secret-key-1234",
          tierModels: { reasoning: "gemini-2.5-pro" },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/settings/byok?companyId=org_alpha");
      const res = await getByok(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.companyId).toBe("org_alpha");
      expect(data.hasByok).toBe(true);
      expect(data.credentials.geminiApiKey).toBe("••••1234"); // Masked
    });

    it("saves BYOK credentials via POST and returns masked credentials", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.systemSetting.create).mockResolvedValueOnce({ id: "byok_new" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/settings/byok", {
        method: "POST",
        body: JSON.stringify({
          companyId: "org_gamma",
          provider: "gemini",
          geminiApiKey: "AIzaSyD-fresh-key-7777",
          tierModels: { realtime: "gemini-2.5-flash" },
        }),
      });

      const res = await postByok(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.credentials.geminiApiKey).toBe("••••7777");
      expect(prisma.systemSetting.create).toHaveBeenCalled();
    });

    it("clears BYOK credentials via DELETE", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "byok_del",
      } as any);
      vi.mocked(prisma.systemSetting.delete).mockResolvedValueOnce({} as any);

      const req = new NextRequest("http://localhost:3000/api/admin/settings/byok?companyId=org_gamma", {
        method: "DELETE",
      });

      const res = await deleteByok(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(prisma.systemSetting.delete).toHaveBeenCalledWith({
        where: { id: "byok_del" },
      });
    });
  });
});
