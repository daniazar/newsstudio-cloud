import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockEmbeddingModelV4 } from "ai/test";
import {
  embedLlmText,
  embedLlmMany,
  cosineSimilarity,
  DEFAULT_EMBEDDING_MODELS,
  resolveEmbeddingModel,
} from "@/lib/llm/aiSdkGateway";
import {
  deduplicateStoriesSemantically,
  clusterArticlesSemantically,
  computeLexicalSimilarity,
  matchesWordBoundary,
  clusterArticlesByTheme,
} from "@/lib/ai/semanticDeduplicator";
import { deduplicateStories } from "@/lib/rss/parser";
import type { IngestedArticle } from "@/lib/ai/autonomousIngest";
import type { StoryInput } from "@/lib/types";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({ id: "token-usage-id" }),
    },
    usageLog: {
      create: vi.fn().mockResolvedValue({ id: "usage-log-id" }),
    },
    story: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    rssFeed: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    systemSetting: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    company: {
      upsert: vi.fn().mockResolvedValue({ id: "org-test" }),
    },
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => Promise.all(ops)),
  },
}));

describe("Unified Embeddings Gateway (embedLlmText & embedLlmMany)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should embed single text using MockEmbeddingModelV4", async () => {
    const mockModel = new MockEmbeddingModelV4({
      provider: "mock-gemini",
      modelId: "text-embedding-004",
      doEmbed: async ({ values }) =>
        ({
          embeddings: values.map(() => [0.1, 0.2, 0.3]),
          usage: { tokens: 15 },
          warnings: [],
        } as any),
    });

    const res = await embedLlmText({
      value: "Breaking tech news on artificial intelligence",
      customEmbeddingModel: mockModel,
      companyId: "org-test-123",
      storyId: "story-456",
    });

    expect(res.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(res.usage?.tokens).toBe(15);
    expect(res.modelUsed).toBe("text-embedding-004");
  });

  it("should embed multiple texts using MockEmbeddingModelV4 and record token telemetry", async () => {
    const mockModel = new MockEmbeddingModelV4({
      provider: "mock-gemini",
      modelId: "text-embedding-004",
      doEmbed: async ({ values }) =>
        ({
          embeddings: values.map((val) => [val.length, 5, 9]),
          usage: { tokens: values.length * 14 },
          warnings: [],
        } as any),
    });

    const res = await embedLlmMany({
      values: ["Article headline 1", "Article headline 22", "Article headline 333"],
      customEmbeddingModel: mockModel,
      companyId: "org-1",
    });

    expect(res.embeddings).toHaveLength(3);
    expect(res.embeddings[0]).toEqual([18, 5, 9]);
    expect(res.embeddings[1]).toEqual([19, 5, 9]);
    expect(res.embeddings[2]).toEqual([20, 5, 9]);
    expect(res.usage?.tokens).toBe(42);

    // Verify token tracking via prisma
    expect(prisma.aiTokenUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptTokens: 42,
          completionTokens: 0,
          totalTokens: 42,
          companyId: "org-1",
        }),
      })
    );
  });

  it("should handle empty values array immediately without calling network or throwing", async () => {
    const res = await embedLlmMany({
      values: [],
      provider: "gemini",
    });

    expect(res.embeddings).toEqual([]);
    expect(res.usage?.tokens).toBe(0);
    expect(res.providerUsed).toBe("gemini");
  });

  it("should correctly compute cosineSimilarity for identical, orthogonal, and opposing vectors", () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];
    const vecD = [-1, 0, 0];

    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);
    expect(cosineSimilarity(vecA, vecD)).toBeCloseTo(-1.0);
  });

  it("should failover to secondary provider when primary fails and allowFallback is true", async () => {
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    // Primary gemini fails without API key.
    // Secondary ollama will attempt to connect to http://localhost:11434.
    await expect(
      embedLlmText({
        value: "Test failover text",
        provider: "gemini",
        allowFallback: true,
        baseURL: "http://127.0.0.1:99999", // unreachable fallback
      })
    ).rejects.toThrow(/All embedding providers failed/);

    if (originalGeminiKey) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
  });

  it("should export correct default embedding models per provider", () => {
    expect(DEFAULT_EMBEDDING_MODELS.gemini).toBe("text-embedding-004");
    expect(DEFAULT_EMBEDDING_MODELS.ollama).toBe("nomic-embed-text");
  });
});

describe("Deterministic Lexical Similarity (computeLexicalSimilarity)", () => {
  it("should return 1.0 for identical sentences", () => {
    const text = "Federal Reserve cuts interest rates by 25 basis points amid cooling inflation";
    expect(computeLexicalSimilarity(text, text)).toBeCloseTo(1.0);
  });

  it("should return high similarity (>0.80) for cross-wire paraphrased reports of the same event", () => {
    const reuters = "Federal Reserve cuts interest rates by 25 basis points amid cooling inflation";
    const ap = "Federal Reserve cuts interest rates by 25 basis points as inflation cools";
    const sim = computeLexicalSimilarity(reuters, ap);
    expect(sim).toBeGreaterThanOrEqual(0.80);
  });

  it("should return low similarity (<0.30) for completely unrelated topics", () => {
    const fedNews = "Federal Reserve cuts benchmark interest rates by 25 basis points";
    const spaceNews = "NASA James Webb Space Telescope discovers ancient distant galaxy near edge of observable universe";
    const sim = computeLexicalSimilarity(fedNews, spaceNews);
    expect(sim).toBeLessThan(0.30);
  });

  it("should preserve domain acronyms like 'AI' and distinguish 'AI Revolution' from 'Industrial Revolution'", () => {
    const aiStory = "AI Revolution";
    const industrialStory = "Industrial Revolution";
    const greenStory = "Green Revolution";

    // Preserving 'ai' token ensures AI Revolution is not treated as duplicate of other revolutions
    const simAiIndustrial = computeLexicalSimilarity(aiStory, industrialStory);
    const simAiGreen = computeLexicalSimilarity(aiStory, greenStory);
    expect(simAiIndustrial).toBeLessThan(0.70);
    expect(simAiGreen).toBeLessThan(0.70);

    // Identical acronym phrase matches 1.0
    expect(computeLexicalSimilarity(aiStory, aiStory)).toBeCloseTo(1.0);
  });

  it("should match standalone keywords and reject substring false-positives via matchesWordBoundary", () => {
    // False positive checks:
    expect(matchesWordBoundary("The President said today that talks will begin", "ai")).toBe(false);
    expect(matchesWordBoundary("Department purchases new software system", "war")).toBe(false);
    expect(matchesWordBoundary("Sunny Sunday morning in Geneva", "un")).toBe(false);
    expect(matchesWordBoundary("A brand new approach to cooking", "app")).toBe(false);

    // True positive checks:
    expect(matchesWordBoundary("Breakthrough in modern AI models", "ai")).toBe(true);
    expect(matchesWordBoundary("Conflict and war in Eastern Europe", "war")).toBe(true);
    expect(matchesWordBoundary("UN General Assembly votes on treaty", "un")).toBe(true);
    expect(matchesWordBoundary("Download the mobile app today", "app")).toBe(true);
    expect(matchesWordBoundary("S&P 500 reaches record level", "s&p")).toBe(true);
  });

  it("should return 0.0 for empty or null strings", () => {
    expect(computeLexicalSimilarity("", "something")).toBe(0.0);
    expect(computeLexicalSimilarity("", "")).toBe(0.0);
  });
});

describe("Semantic Deduplication (deduplicateStoriesSemantically)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper mock embedding model that produces deterministic topic vectors
  function createTopicEmbeddingModel() {
    return new MockEmbeddingModelV4({
      provider: "mock-model",
      modelId: "test-embed",
      doEmbed: async ({ values }) => {
        const embeddings = values.map((val) => {
          const lower = val.toLowerCase();
          if (lower.includes("iphone") || lower.includes("apple")) {
            return [0.95, 0.05, 0.01]; // Apple cluster
          }
          if (lower.includes("bitcoin") || lower.includes("crypto")) {
            return [0.02, 0.96, 0.03]; // Crypto cluster
          }
          if (lower.includes("fed") || lower.includes("interest rate") || lower.includes("inflation")) {
            return [0.01, 0.04, 0.97]; // Macro/Fed cluster
          }
          return [0.577, 0.577, 0.577]; // Neutral
        });
        return {
          embeddings,
          usage: { tokens: values.length * 10 },
          warnings: [],
        } as any;
      },
    });
  }

  it("should filter out candidates semantically matching existing DB stories", async () => {
    const customEmbeddingModel = createTopicEmbeddingModel();

    const existingStories = [
      {
        title: "Apple introduces iPhone 16 with AI features",
        description: "Apple launched its latest flagship smartphone featuring on-device generative AI.",
      },
    ];

    const candidates: StoryInput[] = [
      {
        title: "Reuters: Apple reveals iPhone 16 with generative intelligence",
        link: "https://reuters.com/apple-iphone-16",
        description: "Apple unveiled the new iPhone lineup powered by AI capabilities.",
        guid: "reuters-iphone-16",
        feedId: "feed-reuters",
      },
      {
        title: "Bitcoin surges past 100k mark amid institutional inflows",
        link: "https://coindesk.com/btc-100k",
        description: "Crypto markets reached a historic milestone as Bitcoin topped $100,000.",
        guid: "coindesk-btc-100k",
        feedId: "feed-crypto",
      },
    ];

    const result = await deduplicateStoriesSemantically(candidates, existingStories, {
      threshold: 0.86,
      customEmbeddingModel,
    });

    expect(result.method).toBe("embedding");
    expect(result.skippedCount).toBe(1);
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].guid).toBe("coindesk-btc-100k");
    expect(result.duplicates[0].matchedTitle).toBe("Apple introduces iPhone 16 with AI features");
    expect(result.duplicates[0].similarity).toBeGreaterThanOrEqual(0.86);
  });

  it("should resolve intra-batch duplicates by retaining the fuller report and dropping subsequent near-duplicates", async () => {
    const customEmbeddingModel = createTopicEmbeddingModel();

    // 3 wire sources reporting the exact same breaking Bitcoin news in the same batch
    const candidateBatch: IngestedArticle[] = [
      {
        title: "AP: Bitcoin tops $100,000 in historic milestone",
        url: "https://apnews.com/btc-100k",
        source: "AP News",
        category: "crypto",
        rawText: "Short wire alert.",
        publishedAt: new Date().toISOString(),
        hash: "ap-hash",
      },
      {
        title: "Bloomberg: Bitcoin reaches record $100k as Wall Street pours billions into crypto funds",
        url: "https://bloomberg.com/btc-record",
        source: "Bloomberg",
        category: "crypto",
        rawText:
          "Full comprehensive report detailing institutional ETF inflows, market liquidity, and macroeconomic tailwinds driving Bitcoin to unprecedented heights.",
        publishedAt: new Date().toISOString(),
        hash: "bloomberg-hash",
      },
      {
        title: "Reuters: Bitcoin breaches $100,000 barrier",
        url: "https://reuters.com/btc-100k",
        source: "Reuters",
        category: "crypto",
        rawText: "Brief summary.",
        publishedAt: new Date().toISOString(),
        hash: "reuters-hash",
      },
      {
        title: "Federal Reserve signals pause on interest rate hikes",
        url: "https://wsj.com/fed-pause",
        source: "WSJ",
        category: "markets",
        rawText: "Federal Reserve chair comments on interest rate decision.",
        publishedAt: new Date().toISOString(),
        hash: "wsj-fed-hash",
      },
    ];

    const result = await deduplicateStoriesSemantically(candidateBatch, [], {
      threshold: 0.86,
      customEmbeddingModel,
    });

    expect(result.method).toBe("embedding");
    // Should keep Bloomberg (fuller text) and WSJ (distinct topic)
    expect(result.unique).toHaveLength(2);
    expect(result.skippedCount).toBe(2);

    const uniqueTitles = result.unique.map((u) => u.title);
    expect(uniqueTitles).toContain(
      "Bloomberg: Bitcoin reaches record $100k as Wall Street pours billions into crypto funds"
    );
    expect(uniqueTitles).toContain("Federal Reserve signals pause on interest rate hikes");
  });

  it("should fall back gracefully to deterministic lexical similarity when embedding model throws", async () => {
    const failingModel = new MockEmbeddingModelV4({
      provider: "failing-provider",
      modelId: "broken-model",
      doEmbed: async () => {
        throw new Error("Network timeout: embedding server unreachable");
      },
    });

    const candidates = [
      {
        title: "Federal Reserve cuts interest rates by 25 basis points amid cooling inflation",
        description: "The central bank announced a 25 basis point reduction today.",
      },
      {
        title: "Federal Reserve cuts interest rates by 25 basis points as inflation cools",
        description: "Federal Reserve policymakers voted to lower borrowing costs.",
      },
      {
        title: "NASA discovers water ice deposits on Mars polar ice caps",
        description: "Planetary scientists confirm subterranean glacial reserves.",
      },
    ];

    const result = await deduplicateStoriesSemantically(candidates, [], {
      customEmbeddingModel: failingModel,
    });

    expect(result.method).toBe("lexical-fallback");
    expect(result.unique).toHaveLength(2);
    expect(result.skippedCount).toBe(1);
    expect(result.unique[1].title).toContain("NASA discovers water ice");
  });

  it("should handle existing stories with null or undefined titles without throwing", async () => {
    const customEmbeddingModel = createTopicEmbeddingModel();
    const existingStories = [
      { title: undefined as unknown as string, description: "Some broken DB record" },
      { title: "Apple unveils iPhone 16", description: null },
    ];

    const candidates = [
      { title: "Apple unveils iPhone 16", description: "Details on phone" },
      { title: "Bitcoin hits record", description: "Crypto rally" },
    ];

    // Must not throw TypeError: Cannot read properties of undefined (reading 'trim')
    const result = await deduplicateStoriesSemantically(candidates, existingStories, {
      customEmbeddingModel,
    });

    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].title).toBe("Bitcoin hits record");
  });

  it("should sanitize empty text candidates before embedding without crashing", async () => {
    const customEmbeddingModel = createTopicEmbeddingModel();
    const candidates = [
      { title: "", description: "" },
      { title: "Valid news story about Bitcoin", description: "Details" },
    ];

    const result = await deduplicateStoriesSemantically(candidates, [], {
      customEmbeddingModel,
    });

    expect(result.unique).toHaveLength(2);
  });

  it("should resolve multi-match intra-batch duplicates by replacing all matching items with fuller candidate", async () => {
    // Model returning high similarity for items 0, 1, and 2
    const clusterModel = new MockEmbeddingModelV4({
      provider: "mock-model",
      modelId: "test-embed",
      doEmbed: async ({ values }) =>
        ({
          embeddings: values.map((val) =>
            val.toLowerCase().includes("fed") ? [0.99, 0.05, 0.01] : [0.01, 0.99, 0.01]
          ),
          usage: { tokens: 10 },
          warnings: [],
        } as any),
    });

    const candidates = [
      { title: "Fed rate decision wire alert", description: "Brief" }, // length 34
      { title: "Fed rate decision wire alert 2", description: "Brief 2" }, // length 37
      {
        title: "Federal Reserve comprehensive rate decision analysis with economic projections",
        description: "Full in-depth report detailing inflation trends and FOMC projections",
      }, // length ~150 (fuller than both)
    ];

    const result = await deduplicateStoriesSemantically(candidates, [], {
      customEmbeddingModel: clusterModel,
    });

    // The comprehensive candidate matches both brief alerts and replaces both
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].title).toContain("comprehensive rate decision analysis");
    expect(result.skippedCount).toBe(2);
  });
});

describe("Agglomerative Thematic Clustering (clusterArticlesSemantically)", () => {
  it("should group articles into cohesive StoryCluster[] using embeddings and cosine similarity", async () => {
    const customEmbeddingModel = new MockEmbeddingModelV4({
      provider: "mock-model",
      modelId: "test-embed",
      doEmbed: async ({ values }) =>
        ({
          embeddings: values.map((val) => {
            const lower = val.toLowerCase();
            if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("ethereum")) {
              return [0.98, 0.02, 0.01];
            }
            if (lower.includes("ai") || lower.includes("gpt") || lower.includes("nvidia")) {
              return [0.03, 0.97, 0.02];
            }
            return [0.01, 0.02, 0.99]; // World/Macro
          }),
          usage: { tokens: 30 },
          warnings: [],
        } as any),
    });

    const articles: IngestedArticle[] = [
      {
        title: "Bitcoin surges to new record high",
        url: "https://news.com/btc",
        source: "CoinDesk",
        category: "crypto",
        rawText: "Crypto markets rally strongly.",
        publishedAt: new Date().toISOString(),
        hash: "h1",
      },
      {
        title: "Ethereum foundation unveils major scaling roadmap",
        url: "https://news.com/eth",
        source: "CryptoSlate",
        category: "crypto",
        rawText: "Ethereum layer 2 throughput improvements.",
        publishedAt: new Date().toISOString(),
        hash: "h2",
      },
      {
        title: "Nvidia announces next-generation AI chip architecture",
        url: "https://news.com/nvidia",
        source: "TechCrunch",
        category: "ai",
        rawText: "New neural accelerator speeds up LLM inference.",
        publishedAt: new Date().toISOString(),
        hash: "h3",
      },
      {
        title: "OpenAI releases GPT-5 preview with advanced reasoning",
        url: "https://news.com/gpt5",
        source: "TheVerge",
        category: "ai",
        rawText: "The new AI model sets benchmarks in math and science.",
        publishedAt: new Date().toISOString(),
        hash: "h4",
      },
      {
        title: "Global climate summit reaches historic treaty in Geneva",
        url: "https://news.com/summit",
        source: "Reuters",
        category: "world",
        rawText: "World leaders agree on carbon emissions targets.",
        publishedAt: new Date().toISOString(),
        hash: "h5",
      },
    ];

    const clusters = await clusterArticlesSemantically(articles, {
      maxClusters: 5,
      similarityThreshold: 0.72,
      customEmbeddingModel,
    });

    expect(clusters.length).toBeGreaterThanOrEqual(3);

    const categories = clusters.map((c) => c.category);
    expect(categories).toContain("crypto");
    expect(categories).toContain("ai");
    expect(categories).toContain("world");

    // Crypto cluster should contain the 2 crypto articles
    const cryptoCluster = clusters.find((c) => c.category === "crypto");
    expect(cryptoCluster?.articles).toHaveLength(2);

    // AI cluster should contain the 2 AI articles
    const aiCluster = clusters.find((c) => c.category === "ai");
    expect(aiCluster?.articles).toHaveLength(2);

    // Check importance scores are populated
    for (const cluster of clusters) {
      expect(cluster.importanceScore).toBeGreaterThan(0);
      expect(cluster.keywords.length).toBeGreaterThan(0);
    }
  });

  it("should fall back to keyword clustering when embeddings throw", async () => {
    const brokenModel = new MockEmbeddingModelV4({
      provider: "broken",
      modelId: "broken",
      doEmbed: async () => {
        throw new Error("Offline mode");
      },
    });

    const articles: IngestedArticle[] = [
      {
        title: "Artificial Intelligence startup raises $50M in seed funding",
        url: "https://news.com/ai-startup",
        source: "TechCrunch",
        category: "ai",
        rawText: "Generative AI models and LLM tooling.",
        publishedAt: new Date().toISOString(),
        hash: "h1",
      },
      {
        title: "Federal Reserve warns on inflation and treasury bond yields",
        url: "https://news.com/fed",
        source: "Bloomberg",
        category: "markets",
        rawText: "Stocks and treasury yields react to interest rate commentary.",
        publishedAt: new Date().toISOString(),
        hash: "h2",
      },
    ];

    const clusters = await clusterArticlesSemantically(articles, {
      customEmbeddingModel: brokenModel,
    });

    expect(clusters.length).toBe(2);
    const cats = clusters.map((c) => c.category);
    expect(cats).toContain("ai");
    expect(cats).toContain("markets");
  });
});

describe("Parser Deduplication Integration (src/lib/rss/parser.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should preserve backward compatibility when semantic is false or omitted", async () => {
    const mockedPrisma = vi.mocked(prisma);
    (mockedPrisma.story.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { guid: "existing-guid", link: "https://example.com/existing" } as any,
    ]);

    const stories: StoryInput[] = [
      {
        title: "Story 1",
        description: "Story 1 description",
        link: "https://example.com/existing",
        guid: "existing-guid",
        feedId: "feed-1",
      },
      {
        title: "Story 2",
        description: "Story 2 description",
        link: "https://example.com/new",
        guid: "new-guid",
        feedId: "feed-1",
      },
    ];

    const result = await deduplicateStories(stories);

    expect(result).toHaveLength(1);
    expect(result[0].guid).toBe("new-guid");
    // Verify findMany was called exactly once for exact guid/link lookup
    expect(mockedPrisma.story.findMany).toHaveBeenCalledTimes(1);
  });

  it("should perform semantic deduplication when semantic: true is specified", async () => {
    const mockedPrisma = vi.mocked(prisma);
    // 1st call: exact guid/link DB lookup
    (mockedPrisma.story.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    // 2nd call: recent stories DB lookup for semantic dedup
    (mockedPrisma.story.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        title: "Apple introduces iPhone 16 with AI features",
        description: "Apple launched its latest flagship smartphone.",
      } as any,
    ]);

    const customEmbeddingModel = new MockEmbeddingModelV4({
      provider: "mock-model",
      modelId: "test-embed",
      doEmbed: async ({ values }) =>
        ({
          embeddings: values.map((val) =>
            val.toLowerCase().includes("iphone") ? [1, 0, 0] : [0, 1, 0]
          ),
          usage: { tokens: 20 },
          warnings: [],
        } as any),
    });

    const stories: StoryInput[] = [
      {
        title: "Reuters: Apple reveals iPhone 16 with generative intelligence",
        link: "https://reuters.com/apple-iphone-16",
        guid: "reuters-iphone-16",
        description: "Apple launched iPhone 16.",
        feedId: "feed-1",
      },
      {
        title: "Tesla releases new autonomous driving update",
        link: "https://electrek.co/tesla-fsd",
        guid: "tesla-fsd-guid",
        description: "Full self-driving update rolled out to fleet.",
        feedId: "feed-1",
      },
    ];

    const result = await deduplicateStories(stories, {
      semantic: true,
      customEmbeddingModel,
      similarityThreshold: 0.86,
    });

    expect(result).toHaveLength(1);
    expect(result[0].guid).toBe("tesla-fsd-guid");
  });

  it("should return immediately without extra DB queries when all candidate stories are already filtered out by exact guid/link", async () => {
    const mockedPrisma = vi.mocked(prisma);
    // 1st call: exact guid/link DB lookup reports that all stories already exist in DB
    (mockedPrisma.story.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { guid: "existing-1", link: "https://example.com/1" } as any,
    ]);

    const stories: StoryInput[] = [
      {
        title: "Story 1",
        description: "Story 1 description",
        link: "https://example.com/1",
        guid: "existing-1",
        feedId: "feed-1",
      },
    ];

    const result = await deduplicateStories(stories, {
      semantic: true,
    });

    expect(result).toEqual([]);
    // Only 1 call for exact lookup; 0 calls for recent DB stories because exactUnique was empty!
    expect(mockedPrisma.story.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("Tenant BYOK Provider Resolution for Embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should honor tenant BYOK provider preference when resolving embedding model", async () => {
    const { saveTenantCredentials, invalidateTenantCredentialsCache } = await import(
      "@/lib/tenant/credentials"
    );
    invalidateTenantCredentialsCache();

    // Mock prisma systemSetting to store tenant credentials with provider: 'ollama'
    const mockedPrisma = vi.mocked(prisma);
    (mockedPrisma.systemSetting.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "setting-1",
      companyId: "org-ollama-preferred",
      key: "byok_credentials",
      value: JSON.stringify({
        companyId: "org-ollama-preferred",
        provider: "ollama",
        ollamaBaseUrl: "http://custom-ollama:11434",
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const { resolveEmbeddingModelAsync } = await import("@/lib/llm/aiSdkGateway");
    const resolved = await resolveEmbeddingModelAsync({
      companyId: "org-ollama-preferred",
    });

    expect(resolved.provider).toBe("ollama");
    expect(resolved.modelId).toBe(DEFAULT_EMBEDDING_MODELS.ollama);
  });
});
