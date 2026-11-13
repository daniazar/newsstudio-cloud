import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  maskApiKey,
  isMaskedKey,
  getTenantCredentials,
  saveTenantCredentials,
  deleteTenantCredentials,
  invalidateTenantCredentialsCache,
  getSystemSettings,
  getSystemTierModelSync,
  invalidateSystemSettingsCache,
  BYOK_SETTINGS_KEY,
  ADMIN_SETTINGS_KEY,
} from "@/lib/tenant/credentials";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    company: {
      upsert: vi.fn().mockResolvedValue({ id: "org_test" }),
    },
  },
}));

describe("Multi-Tenant BYOK Credentials Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateTenantCredentialsCache();
  });

  describe("maskApiKey & isMaskedKey utilities", () => {
    it("should correctly mask sensitive API keys per AGENTS.md §3.5", () => {
      expect(maskApiKey("AIzaSyD-1234567890abcdef")).toBe("••••cdef");
      expect(maskApiKey("test-api-key-9999")).toBe("••••9999");
      expect(maskApiKey("1234")).toBe("••••");
      expect(maskApiKey("")).toBe("");
      expect(maskApiKey(null)).toBe("");
      expect(maskApiKey(undefined)).toBe("");
      // Already masked string should remain as-is
      expect(maskApiKey("••••cdef")).toBe("••••cdef");
    });

    it("should correctly identify masked keys", () => {
      expect(isMaskedKey("••••cdef")).toBe(true);
      expect(isMaskedKey("••••")).toBe(true);
      expect(isMaskedKey("AIzaSyD-1234567890abcdef")).toBe(false);
      expect(isMaskedKey("")).toBe(false);
      expect(isMaskedKey(null)).toBe(false);
    });
  });

  describe("getTenantCredentials", () => {
    it("should return null when companyId is null or empty", async () => {
      const res = await getTenantCredentials(null);
      expect(res).toBeNull();
      expect(prisma.systemSetting.findFirst).not.toHaveBeenCalled();
    });

    it("should load credentials from prisma SystemSetting table", async () => {
      const storedPayload = {
        companyId: "org_alpha",
        provider: "gemini",
        geminiApiKey: "AIzaSyD-secret-key-1234",
        ollamaBaseUrl: "http://alpha-gpu:11434",
        tierModels: {
          realtime: "gemini-2.5-flash",
          reasoning: "gemini-2.5-pro",
        },
      };

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "setting_1",
        companyId: "org_alpha",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify(storedPayload),
        createdAt: new Date(),
        updatedAt: new Date("2026-10-29T12:00:00Z"),
      } as any);

      const creds = await getTenantCredentials("org_alpha");
      expect(creds).not.toBeNull();
      expect(creds?.companyId).toBe("org_alpha");
      expect(creds?.geminiApiKey).toBe("AIzaSyD-secret-key-1234");
      expect(creds?.ollamaBaseUrl).toBe("http://alpha-gpu:11434");
      expect(creds?.tierModels?.reasoning).toBe("gemini-2.5-pro");

      // Verify cached call does not re-query database
      const cached = await getTenantCredentials("org_alpha");
      expect(cached).toEqual(creds);
      expect(prisma.systemSetting.findFirst).toHaveBeenCalledTimes(1);
    });

    it("should return null and cache null when no record exists", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null);

      const creds = await getTenantCredentials("org_unknown");
      expect(creds).toBeNull();

      // Second call uses cached null
      const second = await getTenantCredentials("org_unknown");
      expect(second).toBeNull();
      expect(prisma.systemSetting.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe("saveTenantCredentials", () => {
    it("should save new BYOK credentials to database", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce(null); // No existing
      vi.mocked(prisma.systemSetting.create).mockResolvedValueOnce({
        id: "setting_new",
      } as any);

      const saved = await saveTenantCredentials("org_beta", {
        geminiApiKey: "AIzaSyD-new-key-5678",
        provider: "gemini",
        tierModels: {
          realtime: "gemini-2.5-flash",
        },
      });

      expect(saved.companyId).toBe("org_beta");
      expect(saved.geminiApiKey).toBe("AIzaSyD-new-key-5678");
      expect(prisma.systemSetting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "org_beta",
            key: BYOK_SETTINGS_KEY,
          }),
        })
      );
    });

    it("should preserve existing unmasked key when user submits a masked string (••••)", async () => {
      const existingPayload = {
        companyId: "org_beta",
        geminiApiKey: "AIzaSyD-existing-secret-1234",
        ollamaBaseUrl: "http://old-url:11434",
      };

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "setting_existing",
        companyId: "org_beta",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify(existingPayload),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "setting_existing",
        companyId: "org_beta",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify(existingPayload),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.update).mockResolvedValueOnce({} as any);

      const updated = await saveTenantCredentials("org_beta", {
        geminiApiKey: "••••1234", // Masked submission from UI
        ollamaBaseUrl: "http://new-url:11434",
      });

      expect(updated.geminiApiKey).toBe("AIzaSyD-existing-secret-1234");
      expect(updated.ollamaBaseUrl).toBe("http://new-url:11434");
      expect(prisma.systemSetting.update).toHaveBeenCalled();
    });

    it("should prune cleared tier models when an empty string is passed", async () => {
      const existingPayload = {
        companyId: "org_gamma",
        tierModels: {
          realtime: "qwen2.5:3b",
          reasoning: "deepseek-r1:14b",
        },
      };

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "setting_gamma",
        companyId: "org_gamma",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify(existingPayload),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "setting_gamma",
        companyId: "org_gamma",
        key: BYOK_SETTINGS_KEY,
        value: JSON.stringify(existingPayload),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.systemSetting.update).mockResolvedValueOnce({} as any);

      const updated = await saveTenantCredentials("org_gamma", {
        tierModels: {
          realtime: "", // Cleared in UI
          reasoning: "deepseek-r1:14b",
        },
      });

      expect(updated.tierModels?.realtime).toBeUndefined();
      expect(updated.tierModels?.reasoning).toBe("deepseek-r1:14b");
    });
  });

  describe("deleteTenantCredentials", () => {
    it("should delete BYOK setting and evict cache", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "setting_to_del",
      } as any);
      vi.mocked(prisma.systemSetting.delete).mockResolvedValueOnce({} as any);

      await deleteTenantCredentials("org_beta");

      expect(prisma.systemSetting.delete).toHaveBeenCalledWith({
        where: { id: "setting_to_del" },
      });
    });
  });

  describe("System Settings & Tier Models Caching", () => {
    beforeEach(() => {
      invalidateSystemSettingsCache();
    });

    it("loads and caches system tier settings from prisma SystemSetting table", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "sys_setting_1",
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
        value: JSON.stringify({
          llm: {
            provider: "gemini",
            tiers: {
              gemini: {
                reasoning: "gemini-2.5-pro-custom",
                structured: "gemini-2.5-flash",
              },
            },
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const settings = await getSystemSettings();
      expect(settings?.gemini?.reasoning).toBe("gemini-2.5-pro-custom");

      // Verify sync lookup returns the cached setting
      expect(getSystemTierModelSync("gemini", "reasoning")).toBe("gemini-2.5-pro-custom");
      expect(getSystemTierModelSync("gemini", "realtime")).toBeNull();

      // Second call uses memory cache (findFirst not called again)
      await getSystemSettings();
      expect(prisma.systemSetting.findFirst).toHaveBeenCalledTimes(1);
    });

    it("evicts memory cache when invalidateSystemSettingsCache is called", async () => {
      vi.mocked(prisma.systemSetting.findFirst).mockResolvedValueOnce({
        id: "sys_setting_1",
        companyId: null,
        key: ADMIN_SETTINGS_KEY,
        value: JSON.stringify({
          llm: {
            tiers: {
              gemini: { reasoning: "model-1" },
            },
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await getSystemSettings();
      expect(getSystemTierModelSync("gemini", "reasoning")).toBe("model-1");

      invalidateSystemSettingsCache();
      expect(getSystemTierModelSync("gemini", "reasoning")).toBeNull();
    });
  });
});
