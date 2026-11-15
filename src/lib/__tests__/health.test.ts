import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isUnconfiguredLocalEngineInCloud,
  getAggregatedSystemHealth,
} from "@/lib/health";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

describe("Cloud Health Accuracy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("isUnconfiguredLocalEngineInCloud", () => {
    it("preserves test-mode probing when NODE_ENV === 'test'", () => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("STORAGE_PROVIDER", "r2");
      expect(isUnconfiguredLocalEngineInCloud(undefined)).toBe(false);
      expect(isUnconfiguredLocalEngineInCloud("http://localhost:8005")).toBe(false);
    });

    it("returns true in production cloud web mode for unset or loopback URLs", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("IS_PIPELINE_WORKER", "");

      expect(isUnconfiguredLocalEngineInCloud(undefined)).toBe(true);
      expect(isUnconfiguredLocalEngineInCloud("")).toBe(true);
      expect(isUnconfiguredLocalEngineInCloud("http://localhost:8005")).toBe(true);
      expect(isUnconfiguredLocalEngineInCloud("http://127.0.0.1:8188")).toBe(true);
      expect(isUnconfiguredLocalEngineInCloud("http://[::1]:8020")).toBe(true);
    });

    it("returns false in production cloud web mode for external non-localhost URLs", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("IS_PIPELINE_WORKER", "");

      expect(isUnconfiguredLocalEngineInCloud("https://tts.internal.newsstudio.ai")).toBe(false);
      expect(isUnconfiguredLocalEngineInCloud("http://comfyui.railway.internal:8188")).toBe(false);
    });

    it("returns true when STORAGE_PROVIDER === 'r2' in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("STORAGE_PROVIDER", "r2");
      vi.stubEnv("IS_PIPELINE_WORKER", "");

      expect(isUnconfiguredLocalEngineInCloud(undefined)).toBe(true);
      expect(isUnconfiguredLocalEngineInCloud("http://127.0.0.1:8005")).toBe(true);
    });

    it("returns false when running as the pipeline worker", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("STORAGE_PROVIDER", "r2");
      vi.stubEnv("IS_PIPELINE_WORKER", "true");

      expect(isUnconfiguredLocalEngineInCloud(undefined)).toBe(false);
      expect(isUnconfiguredLocalEngineInCloud("http://localhost:8005")).toBe(false);
    });
  });

  describe("getAggregatedSystemHealth in cloud web mode", () => {
    it("marks all 10 local engines unconfigured without probing localhost and returns healthy in <100ms", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("STORAGE_PROVIDER", "r2");
      vi.stubEnv("IS_PIPELINE_WORKER", "");
      vi.stubEnv("LLM_PROVIDER", "ollama");
      vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
      vi.stubEnv("MODERN_TTS_SERVER_URL", "http://127.0.0.1:8005");
      vi.stubEnv("COMFYUI_URL", "http://localhost:8188");
      vi.stubEnv("SADTALKER_SERVER_URL", "http://localhost:8000");
      vi.stubEnv("OBJECT3D_SERVER_URL", "http://127.0.0.1:8020");
      vi.stubEnv("REDIS_URL", "");
      vi.stubEnv("GEMINI_API_KEY", "test-key");

      vi.spyOn(prisma, "$queryRaw").mockResolvedValueOnce([{ "?column?": 1 }]);
      vi.spyOn(prisma.worker, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(prisma.generationJob, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(storage, "exists").mockResolvedValueOnce(false);
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const start = performance.now();
      const health = await getAggregatedSystemHealth();
      const elapsedMs = performance.now() - start;

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(elapsedMs).toBeLessThan(100);
      expect(health.status).toBe("healthy");
      expect(health.services.database.status).toBe("online");
      expect(health.services.storage.status).toBe("online");
      expect(health.services.veo?.status).toBe("online");

      expect(health.services.ollama).toEqual({ status: "unconfigured" });
      expect(health.services.tts).toEqual({ status: "unconfigured" });
      expect(health.services.comfyui).toEqual({ status: "unconfigured" });
      expect(health.services.musetalk).toEqual({ status: "unconfigured" });
      expect(health.services.liveportrait).toEqual({ status: "unconfigured" });
      expect(health.services.keysync).toEqual({ status: "unconfigured" });
      expect(health.services.sadtalker).toEqual({ status: "unconfigured" });
      expect(health.services.modernmotion).toEqual({ status: "unconfigured" });
      expect(health.services.moderntalkinghead).toEqual({ status: "unconfigured" });
      expect(health.services.object3d).toEqual({ status: "unconfigured" });
    });
  });
});
