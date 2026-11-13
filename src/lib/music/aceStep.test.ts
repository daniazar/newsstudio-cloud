import { describe, it, expect, vi, beforeEach } from "vitest";
import { ACEStepMusicProvider } from "./aceStep";
import { generateOrFallbackMusic } from "./index";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    backgroundMusic: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock Storage
vi.mock("@/lib/storage", () => ({
  storage: {
    exists: vi.fn(),
    upload: vi.fn(),
  },
  withTenant: vi.fn((tenant: string, key: string) => `tenants/${tenant}/${key}`),
}));

// Mock Pixabay Provider class
vi.mock("./pixabay", () => {
  return {
    PixabayMusicProvider: class MockPixabay {
      name = "pixabay-music";
      isAvailable() {
        return true;
      }
      async search() {
        return [
          {
            externalId: "pixabay-123",
            provider: "pixabay-music",
            name: "Corporate News Bed",
            mood: "serious",
            url: "https://pixabay.com/music/123",
            previewUrl: "https://pixabay.com/audio/123.mp3",
            downloadUrl: "https://pixabay.com/download/123.mp3",
            duration: 45,
            license: "Pixabay Free",
          },
        ];
      }
    },
  };
});

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

describe("ACEStepMusicProvider Integration & Fallback Suite", () => {
  const provider = new ACEStepMusicProvider();
  const testCompanyId = "org_test123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should report available when MODERN_TTS_URL is configured", () => {
    expect(provider.isAvailable()).toBe(true);
    expect(provider.name).toBe("acestep-music");
  });

  it("should successfully synthesize audio when Modern-TTS-Server is online", async () => {
    const fakeWavBuffer = Buffer.from("RIFF....WAVEfmt ....data....");

    // Mock global fetch for Modern-TTS-Server :8005/api/music/generate
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "X-Music-Engine": "ace_step",
        "X-Music-Duration": "15",
      }),
      arrayBuffer: async () => fakeWavBuffer.buffer,
    } as any);

    try {
      const result = await provider.synthesizeAudio({
        prompt: "Breaking news orchestral tension stinger",
        mood: "dramatic",
        duration: 15,
      });

      expect(result.duration).toBe(15);
      expect(result.engine).toBe("ace_step");
      expect(result.audioBuffer).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should generate and save ACE-Step track to storage and create DB record", async () => {
    const fakeWavBuffer = Buffer.from("RIFF....WAVEfmt ....data....");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Music-Engine": "ace_step" }),
      arrayBuffer: async () => fakeWavBuffer.buffer,
    } as any);

    vi.mocked(storage.exists).mockResolvedValue(false);
    vi.mocked(storage.upload).mockResolvedValue("tenants/org_test123/music/acestep/abc.wav" as any);
    vi.mocked(prisma.backgroundMusic.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.backgroundMusic.create).mockResolvedValue({
      id: "bgm_ace_123",
      name: "ACE-Step: Breaking news electronic...",
      mood: "dramatic",
      url: "/api/assets/tenants/org_test123/music/acestep/abc.wav",
      storageKey: "tenants/org_test123/music/acestep/abc.wav",
      duration: 20,
      bpm: 120,
      isDefault: false,
      createdAt: new Date(),
    } as any);

    try {
      const result = await provider.generateAndSave(
        {
          prompt: "Breaking news electronic pulse with brass stabs",
          mood: "dramatic",
          duration: 20,
          bpm: 120,
        },
        testCompanyId
      );

      expect(result.id).toBe("bgm_ace_123");
      expect(result.isAiGenerated).toBe(true);
      expect(result.isFallback).toBe(false);
      expect(result.provider).toBe("acestep-music");
      expect(storage.upload).toHaveBeenCalled();
      expect(prisma.backgroundMusic.create).toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should automatically fall back to stock providers when Modern-TTS-Server is offline", async () => {
    // Simulate Modern-TTS-Server offline / network failure
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:8005"));

    vi.mocked(storage.exists).mockResolvedValue(true);
    vi.mocked(prisma.backgroundMusic.findFirst).mockResolvedValue({
      id: "bgm_stock_fallback_1",
      storageKey: "tenants/org_test123/music/pixabay-music/pixabay-123.mp3",
      name: "Corporate News Bed",
      mood: "serious",
      duration: 45,
      url: "https://pixabay.com/music/123",
      bpm: null,
      isDefault: false,
      createdAt: new Date(),
    } as any);

    try {
      const result = await generateOrFallbackMusic(
        {
          prompt: "Morning news cheerful guitar bed",
          mood: "upbeat",
          duration: 30,
        },
        testCompanyId
      );

      expect(result).toBeDefined();
      expect(result.isFallback).toBe(true);
      expect(result.isAiGenerated).toBe(false);
      expect(result.provider).toBe("pixabay-music");
      expect(result.fallbackProvider).toBe("pixabay-music");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
