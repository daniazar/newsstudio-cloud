/**
 * src/__tests__/webSearchAndSmartScraper.test.ts
 *
 * Comprehensive Test Suite for Phase 3:
 * 1. Live Web Grounding Client (webSearchClient.ts)
 * 2. Multi-Step Editorial Agent Tool (editorialTools.ts -> searchLiveBreakingWeb)
 * 3. 3-Tier Smart Anti-Bot Scraper & Strict SSRF Guard (articleScraper.ts)
 * 4. Masking & Redaction for tavilyApiKey and firecrawlApiKey (credentials.ts, route.ts, logger.ts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Writable } from "node:stream";
import { MockLanguageModelV4 } from "ai/test";
import { generateLlmText } from "@/lib/llm/aiSdkGateway";
import {
  searchLiveWeb,
  type WebSearchCitation,
} from "@/lib/search/webSearchClient";
import { createEditorialTools } from "@/lib/ai/editorialTools";
import {
  scrapeArticle,
  validateScraperTargetUrl,
} from "@/lib/scraper/articleScraper";
import {
  resolveTavilyApiKey,
  resolveFirecrawlApiKey,
  saveTenantCredentials,
  getTenantCredentials,
  getSystemSettings,
  invalidateTenantCredentialsCache,
  invalidateSystemSettingsCache,
} from "@/lib/tenant/credentials";
import {
  maskAdminSettings,
} from "@/lib/admin/settingsMask";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Mock prisma for credentials tests
vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    story: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm/tokenTracker", () => ({
  trackLlmUsage: vi.fn().mockResolvedValue({}),
}));

function createMemoryDestination() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });

  return {
    stream,
    getLines(): Array<Record<string, unknown>> {
      const raw = chunks.join("");
      return raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    },
    getRaw(): string {
      return chunks.join("");
    },
  };
}

describe("Phase 3: Live Web Grounding & Smart Scraper", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.TAVILY_API_KEY;
    delete process.env.FIRECRAWL_API_KEY;
    invalidateTenantCredentialsCache();
    invalidateSystemSettingsCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Live Web Search Client (webSearchClient.ts)
  // =========================================================================
  describe("webSearchClient (searchLiveWeb)", () => {
    it("returns unconfigured status when TAVILY_API_KEY is not set without throwing", async () => {
      const result = await searchLiveWeb({ query: "Breaking technology news" });
      expect(result.available).toBe(false);
      expect(result.query).toBe("Breaking technology news");
      expect(result.results).toEqual([]);
      expect(result.reason).toBe("TAVILY_API_KEY not configured");
    });

    it("returns empty result gracefully when query is empty", async () => {
      const result = await searchLiveWeb({ query: "   " });
      expect(result.available).toBe(true);
      expect(result.query).toBe("");
      expect(result.results).toEqual([]);
      expect(result.reason).toBe("Empty search query");
    });

    it("formats citations and sanitizes SSRF/unsafe URLs from search results", async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        answer: "Artemis III is targeting lunar landing in late 2026.",
        results: [
          {
            title: "NASA Artemis Update",
            url: "https://www.nasa.gov/missions/artemis/update",
            content: "NASA announced key milestones for the upcoming lunar landing mission...",
            score: 0.98,
            publishedDate: "2026-10-28",
          },
          {
            title: "Metadata Spoof (SSRF)",
            url: "http://169.254.169.254/latest/meta-data/",
            content: "Dangerous cloud metadata leak",
            score: 0.95,
          },
          {
            title: "Loopback Destination",
            url: "http://127.0.0.1:8080/admin/secrets",
            content: "Dangerous loopback leak",
            score: 0.90,
          },
          {
            title: "Private RFC 1918 Address",
            url: "http://10.0.0.5/internal/docs",
            content: "Internal private subnet",
            score: 0.85,
          },
          {
            title: "Non-HTTP Protocol",
            url: "javascript:alert(1)",
            content: "XSS script",
            score: 0.70,
          },
          {
            title: "Reuters Verification",
            url: "https://reuters.com/science/artemis-moon-mission-progress",
            content: "Astronaut training has entered the final phase in Houston...",
            score: 0.91,
            publishedDate: "2026-10-29",
          },
        ],
      });

      const result = await searchLiveWeb({
        query: "Artemis III schedule",
        apiKey: "tvly-test-explicit-key",
        clientOverride: { search: mockSearch },
      });

      expect(result.available).toBe(true);
      expect(result.answer).toBe("Artemis III is targeting lunar landing in late 2026.");
      // Unsafe URLs (169.254, 127.0.0.1, 10.0.0.5, javascript:) MUST be filtered out
      expect(result.results).toHaveLength(2);
      expect(result.results[0].url).toBe("https://www.nasa.gov/missions/artemis/update");
      expect(result.results[0].title).toBe("NASA Artemis Update");
      expect(result.results[0].publishedDate).toBe("2026-10-28");
      expect(result.results[0].score).toBe(0.98);
      expect(result.results[0].snippet).toContain("NASA announced key milestones");

      expect(result.results[1].url).toBe("https://reuters.com/science/artemis-moon-mission-progress");
      expect(result.results[1].title).toBe("Reuters Verification");
    });

    it("enforces includeDomains and excludeDomains filtering", async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        results: [
          {
            title: "Bloomberg Markets",
            url: "https://www.bloomberg.com/news/articles/2026-10-30/fed-rate-decision",
            content: "The Federal Reserve left rates unchanged...",
            score: 0.95,
          },
          {
            title: "Untrusted Blog",
            url: "https://crypto-rumors.xyz/fed-panic",
            content: "Unverified market gossip...",
            score: 0.90,
          },
          {
            title: "Reuters Wire",
            url: "https://www.reuters.com/markets/us/fed-holds-rates-steady-2026-10-30/",
            content: "Official Reuters report on rate pause...",
            score: 0.92,
          },
        ],
      });

      const result = await searchLiveWeb({
        query: "Fed rate pause",
        clientOverride: { search: mockSearch },
        includeDomains: ["bloomberg.com", "reuters.com"],
      });

      expect(result.available).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results.some((r) => r.url.includes("crypto-rumors.xyz"))).toBe(false);
    });

    it("handles SDK errors gracefully without throwing", async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error("Tavily rate limit exceeded"));

      const result = await searchLiveWeb({
        query: "Market update",
        clientOverride: { search: mockSearch },
      });

      expect(result.available).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.reason).toContain("Tavily rate limit exceeded");
    });

    it("handles search timeout gracefully", async () => {
      const mockSearch = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      const result = await searchLiveWeb({
        query: "Hanging search",
        timeoutMs: 50,
        clientOverride: { search: mockSearch },
      });

      expect(result.available).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.reason).toContain("timed out");
    });
  });

  // =========================================================================
  // 2. Deterministic Key Resolution (Tenant BYOK -> AdminSettings -> Env)
  // =========================================================================
  describe("API Key Resolution Hierarchy", () => {
    it("resolves Tavily and Firecrawl keys in priority order: BYOK -> SystemSettings -> Env", async () => {
      // 1. Env only
      process.env.TAVILY_API_KEY = "tvly-env-key-9999";
      process.env.FIRECRAWL_API_KEY = "fc-env-key-8888";

      expect(await resolveTavilyApiKey(null)).toBe("tvly-env-key-9999");
      expect(await resolveFirecrawlApiKey(null)).toBe("fc-env-key-8888");

      // 2. System settings overrides env
      (prisma.systemSetting.findFirst as any).mockResolvedValueOnce({
        value: JSON.stringify({
          search: {
            tavilyApiKey: "tvly-system-key-7777",
            firecrawlApiKey: "fc-system-key-6666",
          },
        }),
      });
      invalidateSystemSettingsCache();

      expect(await resolveTavilyApiKey(null)).toBe("tvly-system-key-7777");

      (prisma.systemSetting.findFirst as any).mockResolvedValueOnce({
        value: JSON.stringify({
          search: {
            tavilyApiKey: "tvly-system-key-7777",
            firecrawlApiKey: "fc-system-key-6666",
          },
        }),
      });
      invalidateSystemSettingsCache();

      expect(await resolveFirecrawlApiKey(null)).toBe("fc-system-key-6666");

      // 3. Tenant BYOK overrides system and env
      (prisma.systemSetting.findFirst as any).mockImplementation((args: any) => {
        if (args.where.companyId === "tenant_vip") {
          return Promise.resolve({
            value: JSON.stringify({
              companyId: "tenant_vip",
              tavilyApiKey: "tvly-tenant-byok-1111",
              firecrawlApiKey: "fc-tenant-byok-2222",
            }),
          });
        }
        return Promise.resolve({
          value: JSON.stringify({
            search: {
              tavilyApiKey: "tvly-system-key-7777",
              firecrawlApiKey: "fc-system-key-6666",
            },
          }),
        });
      });
      invalidateTenantCredentialsCache("tenant_vip");
      invalidateSystemSettingsCache();

      expect(await resolveTavilyApiKey("tenant_vip")).toBe("tvly-tenant-byok-1111");
      expect(await resolveFirecrawlApiKey("tenant_vip")).toBe("fc-tenant-byok-2222");
    });
  });

  // =========================================================================
  // 3. Editorial Tool Integration (searchLiveBreakingWeb)
  // =========================================================================
  describe("editorialTools (searchLiveBreakingWeb)", () => {
    it("registers searchLiveBreakingWeb as 4th tool in createEditorialTools", () => {
      const tools = createEditorialTools();
      expect(tools.searchLiveBreakingWeb).toBeDefined();
      expect(tools.searchIngestedWireArticles).toBeDefined();
      expect(tools.lookupPronunciationGlossary).toBeDefined();
      expect(tools.verifyStockBrollKeywords).toBeDefined();
    });

    it("executes multi-step agentic loop with MockLanguageModelV4 using searchLiveBreakingWeb", async () => {
      const mockWebSearch = vi.fn().mockResolvedValue({
        answer: "Webb Telescope discovers methane and carbon dioxide on K2-18b.",
        results: [
          {
            title: "JWST Atmospheric Detection on K2-18b",
            url: "https://www.nasa.gov/jwst-k2-18b-carbon",
            content: "Webb spectroscopy reveals carbon-bearing molecules in the habitable zone...",
            score: 0.99,
            publishedDate: "2026-10-30",
          },
        ],
      });

      let step = 0;
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => {
          step++;
          if (step === 1) {
            return {
              warnings: [],
              finishReason: { unified: "tool-calls", raw: "tool-calls" },
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call_web_1",
                  toolName: "searchLiveBreakingWeb",
                  input: JSON.stringify({
                    query: "JWST K2-18b atmosphere carbon",
                    topic: "news",
                    maxResults: 3,
                  }),
                },
              ],
              usage: {
                inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 25, text: 25, reasoning: 0 },
              },
            };
          }

          return {
            warnings: [],
            finishReason: { unified: "stop", raw: "stop" },
            content: [
              {
                type: "text",
                text: "Verified breaking finding: The James Webb Space Telescope confirmed carbon-bearing molecules on exoplanet K2-18b.",
              },
            ],
            usage: {
              inputTokens: { total: 40, noCache: 40, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 30, text: 30, reasoning: 0 },
            },
          };
        },
      });

      const tools = createEditorialTools({
        webSearchClientOverride: { search: mockWebSearch },
      });

      const result = await generateLlmText({
        prompt: "Check breaking scientific discoveries from JWST regarding K2-18b.",
        customModel: mockModel,
        tools,
        maxSteps: 3,
      });

      expect(mockWebSearch).toHaveBeenCalledWith(
        "JWST K2-18b atmosphere carbon",
        expect.objectContaining({ topic: "news", maxResults: 3 })
      );
      expect(result.toolNamesUsed).toContain("searchLiveBreakingWeb");
      expect(result.text).toContain("James Webb Space Telescope");
    });
  });

  // =========================================================================
  // 4. Strict SSRF Defense & 3-Tier Scraper Waterfall (articleScraper.ts)
  // =========================================================================
  describe("articleScraper SSRF Defense & 3-Tier Waterfall", () => {
    it("validateScraperTargetUrl strictly blocks loopback, cloud metadata, private IPs and non-http schemes", async () => {
      const blockedUrls = [
        "http://127.0.0.1:8080/internal",
        "http://localhost:3000/api/admin",
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://10.0.0.5/secret",
        "http://192.168.1.1/router",
        "http://172.16.5.10/admin",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "ftp://example.com/file.txt",
        "http://user:pass@example.com/article",
      ];

      for (const target of blockedUrls) {
        const check = await validateScraperTargetUrl(target);
        expect(check.ok, `Expected ${target} to be blocked by SSRF check`).toBe(false);
      }

      // Safe public URL
      const safeCheck = await validateScraperTargetUrl("https://example.com/breaking-news");
      expect(safeCheck.ok).toBe(true);
    });

    it("scrapeArticle rejects SSRF target immediately before any tier runs", async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const result = await scrapeArticle("http://169.254.169.254/latest/meta-data/");

      expect(result.success).toBe(false);
      expect(result.error).toContain("SSRF blocked");
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("Tier 1 (Readability) succeeds immediately when wordCount >= 150 without invoking Firecrawl", async () => {
      const longText = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} discussing in-depth global economic developments and international policy decisions with substantial contextual detail.`).join("\n\n");
      const mockHtml = `
        <html>
          <head><title>Full Article Title</title></head>
          <body>
            <article>
              <h1>Full Article Title</h1>
              <p>${longText}</p>
            </article>
          </body>
        </html>
      `;

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response("User-agent: *\nAllow: /", { status: 200 })) // robots.txt
          .mockResolvedValueOnce(new Response(mockHtml, { status: 200 })) // page
      );

      const firecrawlMock = { scrape: vi.fn() };

      const result = await scrapeArticle("https://example.com/long-article", undefined, {
        firecrawlClient: firecrawlMock,
        skipDelay: true,
      });

      expect(result.success).toBe(true);
      expect(result.tierUsed).toBe("readability");
      expect(result.article!.wordCount).toBeGreaterThan(150);
      expect(firecrawlMock.scrape).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("fails over from Tier 1 to Tier 2 (Firecrawl) when Tier 1 is blocked by Cloudflare (403)", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response("User-agent: *\nAllow: /", { status: 200 })) // robots.txt
          .mockResolvedValueOnce(new Response("Cloudflare Just a moment...", { status: 403, statusText: "Forbidden" })) // page blocked
      );

      const firecrawlMarkdown = "# Exclusive Cloudflare-Bypassed Story\n\n" +
        Array.from({ length: 30 }, (_, i) => `Detailed investigative paragraph ${i} extracted cleanly via Firecrawl headless markdown engine with full journalistic fidelity.`).join("\n\n");

      const firecrawlMock = {
        scrape: vi.fn().mockResolvedValue({
          markdown: firecrawlMarkdown,
          metadata: {
            title: "Exclusive Cloudflare-Bypassed Story",
            ogImage: "https://example.com/lead-image.jpg",
          },
        }),
      };

      const result = await scrapeArticle("https://example.com/cf-blocked", undefined, {
        firecrawlClient: firecrawlMock,
        skipDelay: true,
      });

      expect(result.success).toBe(true);
      expect(result.tierUsed).toBe("firecrawl");
      expect(result.article?.title).toBe("Exclusive Cloudflare-Bypassed Story");
      expect(result.article?.wordCount).toBeGreaterThan(150);
      expect(result.article?.images).toContain("https://example.com/lead-image.jpg");

      vi.unstubAllGlobals();
    });

    it("fails over from Tier 1 -> Tier 2 (fails) -> Tier 3 (Puppeteer) cleanly", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response("User-agent: *\nAllow: /", { status: 200 }))
          .mockResolvedValueOnce(new Response("<div>Loading SPA app...</div>", { status: 200 })) // Readability fails (<100 chars)
      );

      const firecrawlMock = {
        scrape: vi.fn().mockRejectedValue(new Error("Firecrawl credits exhausted")),
      };

      const puppeteerRenderedHtml = `
        <html>
          <head><title>SPA Fully Rendered News</title></head>
          <body>
            <article>
              <h1>SPA Fully Rendered News</h1>
              <p>${Array.from({ length: 30 }, (_, i) => `Rendered client-side dynamic paragraph ${i} from Single Page App.`).join(" ")}</p>
            </article>
          </body>
        </html>
      `;

      const puppeteerMock = vi.fn().mockResolvedValue(puppeteerRenderedHtml);

      const result = await scrapeArticle("https://example.com/spa-news", undefined, {
        firecrawlClient: firecrawlMock,
        puppeteerScraper: puppeteerMock,
        skipDelay: true,
      });

      expect(result.success).toBe(true);
      expect(result.tierUsed).toBe("puppeteer");
      expect(result.article?.title).toBe("SPA Fully Rendered News");
      expect(puppeteerMock).toHaveBeenCalledWith("https://example.com/spa-news");

      vi.unstubAllGlobals();
    });

    it("falls back to RSS description when all tiers fail", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response("User-agent: *\nAllow: /", { status: 200 }))
          .mockRejectedValue(new Error("Fatal connection reset"))
      );

      const result = await scrapeArticle(
        "https://example.com/dead-link",
        "Summary paragraph delivered via RSS feed item description.",
        { skipDelay: true }
      );

      expect(result.fallbackUsed).toBe(true);
      expect(result.tierUsed).toBe("rss_fallback");
      expect(result.article?.content).toBe(
        "Summary paragraph delivered via RSS feed item description."
      );

      vi.unstubAllGlobals();
    });
  });

  // =========================================================================
  // 5. Masking and Secret Redaction
  // =========================================================================
  describe("Secret Masking & Redaction", () => {
    it("maskAdminSettings masks search.tavilyApiKey and search.firecrawlApiKey", () => {
      const rawSettings: any = {
        llm: { apiKey: "AIzaSyD-unmasked-gemini-key" },
        stock: { pexelsApiKey: "pexels-secret" },
        search: {
          tavilyApiKey: "tvly-super-secret-key-1234",
          firecrawlApiKey: "fc-ultra-confidential-key-5678",
        },
      };

      const masked = maskAdminSettings(rawSettings);

      expect(masked.search?.tavilyApiKey).toBe("••••1234");
      expect(masked.search?.firecrawlApiKey).toBe("••••5678");
    });

    it("logger.ts automatically redacts tavilyApiKey and firecrawlApiKey in structured logs", () => {
      const dest = createMemoryDestination();
      const testLogger = createLogger(
        { module: "searchTest" },
        { level: "info", destination: dest.stream }
      );

      testLogger.info(
        {
          tavilyApiKey: "tvly-live-secret-raw-value",
          firecrawlApiKey: "fc-live-secret-raw-value",
          nested: {
            tavilyApiKey: "nested-tavily-key",
            firecrawlApiKey: "nested-firecrawl-key",
          },
        },
        "Executing live web crawl"
      );

      const raw = dest.getRaw();
      expect(raw).not.toContain("tvly-live-secret-raw-value");
      expect(raw).not.toContain("fc-live-secret-raw-value");
      expect(raw).not.toContain("nested-tavily-key");
      expect(raw).not.toContain("nested-firecrawl-key");

      const lines = dest.getLines();
      expect(lines).toHaveLength(1);
      expect(lines[0].tavilyApiKey).toBe("[REDACTED]");
      expect(lines[0].firecrawlApiKey).toBe("[REDACTED]");
      expect((lines[0].nested as any).tavilyApiKey).toBe("[REDACTED]");
      expect((lines[0].nested as any).firecrawlApiKey).toBe("[REDACTED]");
    });
  });
});
