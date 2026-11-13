import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDefaultGraphicConfig, parseArticleAsDataStudio } from "../data_studio";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import type {
  CandlestickData,
  SparklineData,
  BarRaceData,
  GaugeData,
  MapTracerData,
  SpecMatrixData,
} from "../types";

vi.mock("@/lib/llm/aiSdkGateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm/aiSdkGateway")>();
  return {
    ...actual,
    generateLlmObject: vi.fn(),
  };
});

describe("Data Studio & Motion Graphics Engine", () => {
  it("generates valid Candlestick default configuration", () => {
    const config = generateDefaultGraphicConfig("candlestick") as CandlestickData;
    expect(config.type).toBe("candlestick");
    expect(config.symbol).toBe("NVDA");
    expect(config.candles.length).toBeGreaterThanOrEqual(3);
    expect(config.candles[0].open).toBeTypeOf("number");
    expect(config.candles[0].close).toBeTypeOf("number");
  });

  it("generates valid Sparkline default configuration", () => {
    const config = generateDefaultGraphicConfig("sparkline") as SparklineData;
    expect(config.type).toBe("sparkline");
    expect(config.symbol).toBe("BTC");
    expect(config.points.length).toBeGreaterThanOrEqual(3);
    expect(config.points[0].value).toBeTypeOf("number");
  });

  it("generates valid Bar Race default configuration", () => {
    const config = generateDefaultGraphicConfig("bar_race") as BarRaceData;
    expect(config.type).toBe("bar_race");
    expect(config.items.length).toBeGreaterThanOrEqual(3);
    expect(config.items[0].value).toBeTypeOf("number");
    expect(config.items[0].label).toBeDefined();
  });

  it("generates valid Gauge default configuration", () => {
    const config = generateDefaultGraphicConfig("gauge") as GaugeData;
    expect(config.type).toBe("gauge");
    expect(config.minValue).toBeLessThan(config.maxValue);
    expect(config.currentValue).toBeGreaterThanOrEqual(config.minValue);
    expect(config.zones.length).toBeGreaterThanOrEqual(3);
  });

  it("generates valid Map Tracer default configuration", () => {
    const config = generateDefaultGraphicConfig("map_tracer") as MapTracerData;
    expect(config.type).toBe("map_tracer");
    expect(config.waypoints.length).toBeGreaterThanOrEqual(3);
    expect(config.routes.length).toBeGreaterThanOrEqual(1);
    expect(config.waypoints[0].coords.length).toBe(2);
  });

  it("generates valid Spec Matrix default configuration", () => {
    const config = generateDefaultGraphicConfig("spec_matrix") as SpecMatrixData;
    expect(config.type).toBe("spec_matrix");
    expect(config.itemA.title).toBeDefined();
    expect(config.itemB.title).toBeDefined();
    expect(config.rows.length).toBeGreaterThanOrEqual(3);
  });

  beforeEach(() => {
    vi.mocked(generateLlmObject).mockRejectedValue(new Error("LLM Offline"));
  });

  it("falls back gracefully and infers chart type from article content", async () => {
    const article = `
      The Red Sea shipping crisis has escalated as major freight carriers divert routes
      around the Cape of Good Hope. The Bab el-Mandeb strait chokepoint has seen vessel traffic drop 68%.
    `;

    const result = await parseArticleAsDataStudio(article);
    expect(result.studioType).toBe("data_studio");
    expect(result.graphicType).toBe("map_tracer");
    expect(result.graphicConfig?.type).toBe("map_tracer");
    expect(result.tickers.length).toBeGreaterThanOrEqual(3);
    expect(result.summary).toContain("[serious]");
  });

  it("infers spec matrix for comparison article content", async () => {
    const article = `
      Apple M4 Max versus Qualcomm Snapdragon X Elite: Benchmarks show Apple compute leads by 38% in GPU AI TOPS.
    `;

    const result = await parseArticleAsDataStudio(article);
    expect(result.studioType).toBe("data_studio");
    expect(result.graphicType).toBe("spec_matrix");
    expect(result.graphicConfig?.type).toBe("spec_matrix");
  });

  it("uses LLM generated object when generateLlmObject succeeds", async () => {
    vi.mocked(generateLlmObject).mockResolvedValueOnce({
      object: {
        headline: "CUSTOM LLM HEADLINE",
        summary: "[excited] Record earnings announced.",
        graphicType: "candlestick",
        graphicConfig: generateDefaultGraphicConfig("candlestick"),
        tickers: [
          { symbol: "NVDA", label: "NVIDIA", value: "$150.00", change: "+10%", direction: "up" },
        ],
      },
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });

    const result = await parseArticleAsDataStudio("Nvidia earnings surging.", {
      provider: "gemini",
      companyId: "org-123",
      storyId: "story-456",
    });

    expect(result.studioType).toBe("data_studio");
    expect(result.headline).toBe("CUSTOM LLM HEADLINE");
    expect(result.summary).toBe("[excited] Record earnings announced.");
    expect(result.graphicType).toBe("candlestick");
    expect(result.tickers[0].symbol).toBe("NVDA");
    expect(vi.mocked(generateLlmObject)).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gemini",
        companyId: "org-123",
        storyId: "story-456",
      })
    );
  });

  it("injects graphicType into candidate graphicConfig when missing and coerces numeric tickers", async () => {
    vi.mocked(generateLlmObject).mockResolvedValueOnce({
      object: {
        headline: "REVENUE SURGE",
        summary: "[excited] High earnings.",
        graphicType: "candlestick",
        graphicConfig: {
          symbol: "AAPL",
          currentPrice: "180.00",
          change: "+3.5%",
          isPositive: true,
          candles: [
            { open: 175, high: 182, low: 174, close: 180 },
          ],
        },
        tickers: [
          { symbol: "AAPL", label: "Apple", value: 180 as any, change: 3.5 as any, direction: "up" },
        ],
      },
      providerUsed: "ollama",
      modelUsed: "qwen3.5:9b",
    });

    const result = await parseArticleAsDataStudio("Apple beats earnings.", {
      personaSlugs: ["claire"],
    });

    expect(result.studioType).toBe("data_studio");
    expect(result.personaId).toBe("claire");
    expect(result.graphicConfig?.type).toBe("candlestick");
    expect(result.tickers[0].value).toBe("180");
    expect(result.tickers[0].change).toBe("3.5");
  });
});
