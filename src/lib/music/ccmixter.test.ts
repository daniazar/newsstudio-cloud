import { describe, it, expect, vi } from "vitest";
import https from "https";
import http from "http";
import type { IncomingMessage } from "http";
import { CCMixterMusicProvider } from "./ccmixter";
import { searchMusic } from "./index";

// Mock prisma and storage to avoid database or storage side effects in test
vi.mock("@/lib/prisma", () => ({
  prisma: {
    backgroundMusic: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  storage: {
    exists: vi.fn(),
    upload: vi.fn(),
  },
}));

describe("CCMixterMusicProvider Integration Test", () => {
  const provider = new CCMixterMusicProvider();

  it("should be available", () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it("should search for a generic query like 'news'", async () => {
    const results = await provider.search("news", { perPage: 3 });
    console.log("Search 'news' results:", JSON.stringify(results, null, 2));

    expect(results).toBeInstanceOf(Array);
    if (results.length > 0) {
      const track = results[0];
      expect(track.provider).toBe("ccmixter-music");
      expect(track.externalId).toBeDefined();
      expect(track.name).toBeDefined();
      expect(track.downloadUrl).toBeDefined();
      expect(track.downloadUrl.startsWith("http")).toBe(true);
    }
  }, 20000);

  it("should search with space-separated query 'tech upbeat'", async () => {
    const results = await provider.search("tech upbeat", { perPage: 2 });
    console.log("Search 'tech upbeat' results:", JSON.stringify(results, null, 2));
    expect(results).toBeInstanceOf(Array);
  }, 20000);

  it("should successfully fetch/download the audio file from ccMixter download URL bypassing SSL issues", async () => {
    const results = await provider.search("news", { perPage: 1 });
    expect(results.length).toBeGreaterThan(0);
    const downloadUrl = results[0].downloadUrl;
    console.log(`Testing insecure fetch for download URL: ${downloadUrl}`);
    
    // Local helper matching index.ts implementation
    const downloadFileInsecure = (urlStr: string): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const client = url.protocol === "https:" ? https : http;
        const options = {
          rejectUnauthorized: false,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://ccmixter.org/",
          }
        };
        const req = client.get(urlStr, options, (res: IncomingMessage) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (!redirectUrl.startsWith("http")) {
              redirectUrl = new URL(redirectUrl, url.origin).toString();
            }
            downloadFileInsecure(redirectUrl).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Status: ${res.statusCode}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        });
        req.on("error", reject);
      });
    };

    try {
      const buffer = await downloadFileInsecure(downloadUrl);
      console.log(`Successfully downloaded ${buffer.length} bytes from ccMixter`);
      expect(buffer.length).toBeGreaterThan(0);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Insecure fetch failed with error:", error.message || error);
      throw error;
    }
  }, 20000);

  it("should search music via the unified searchMusic pipeline and succeed using ccMixter", async () => {
    // When Pixabay returns nothing, searchMusic will try ccmixter-music
    const results = await searchMusic("tech upbeat", { mood: "energetic", perPage: 2 });
    console.log("Unified searchMusic 'tech upbeat' results:", JSON.stringify(results, null, 2));

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].provider).toBe("ccmixter-music");
  }, 20000);
});

