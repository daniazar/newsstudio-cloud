import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MarketDataService,
  marketDataService,
  DEFAULT_WATCHLIST,
} from "../lib/markets/marketDataService";
import { NewsContextService } from "../lib/conversational/newsContextService";

describe("MarketDataService", () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService(1000); // 1s TTL for testing
    service.clearCache();
    vi.restoreAllMocks();
  });

  describe("Price and Percentage Formatting", () => {
    it("should format large stock prices with 2 decimal places and commas", () => {
      expect(service.formatPrice(1234.56, "USD", "AAPL")).toBe("$1,234.56");
      expect(service.formatPrice(232.1, "USD", "AAPL")).toBe("$232.10");
    });

    it("should format crypto prices without decimal points when >= 1000", () => {
      expect(service.formatPrice(98400, "USD", "BTC-USD")).toBe("$98,400");
      expect(service.formatPrice(3650.75, "USD", "ETH-USD")).toBe("$3,651");
    });

    it("should format small sub-dollar prices with 4 decimal places", () => {
      expect(service.formatPrice(0.0456, "USD", "DOGE")).toBe("$0.0456");
    });

    it("should format indices with 1 decimal place", () => {
      expect(service.formatPrice(5860.24, "USD", "^GSPC")).toBe("5,860.2");
    });

    it("should format positive and negative change percentages correctly", () => {
      expect(service.formatChangePercent(4.24)).toBe("+4.2%");
      expect(service.formatChangePercent(-0.83)).toBe("-0.8%");
      expect(service.formatChangePercent(0)).toBe("+0.0%");
    });
  });

  describe("Yahoo Finance API Parsing & In-Memory Caching", () => {
    it("should parse valid Yahoo Finance v8 chart API responses", async () => {
      const mockApiResponse = {
        chart: {
          result: [
            {
              meta: {
                currency: "USD",
                symbol: "NVDA",
                shortName: "NVIDIA Corporation",
                regularMarketPrice: 140.25,
                chartPreviousClose: 135.0,
                regularMarketDayHigh: 142.0,
                regularMarketDayLow: 134.5,
                regularMarketVolume: 50000000,
                regularMarketTime: 1788200000,
              },
            },
          ],
        },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as any);

      const quote = await service.fetchQuote("NVDA");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(quote).not.toBeNull();
      expect(quote?.symbol).toBe("NVDA");
      expect(quote?.cleanSymbol).toBe("NVDA");
      expect(quote?.price).toBe(140.25);
      expect(quote?.previousClose).toBe(135.0);
      expect(quote?.change).toBeCloseTo(5.25);
      expect(quote?.changePercent).toBeCloseTo(3.8888, 2);
    });

    it("should utilize in-memory cache and not re-fetch within TTL window", async () => {
      const mockApiResponse = {
        chart: {
          result: [
            {
              meta: {
                currency: "USD",
                symbol: "AAPL",
                shortName: "Apple Inc.",
                regularMarketPrice: 230.0,
                chartPreviousClose: 228.0,
              },
            },
          ],
        },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as any);

      const quote1 = await service.fetchQuote("AAPL");
      const quote2 = await service.fetchQuote("AAPL");

      expect(quote1?.price).toBe(230.0);
      expect(quote2?.price).toBe(230.0);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Second call served from cache
    });

    it("should return stale cache or fallback snapshot if network fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network offline"));

      const tickers = await service.getLiveMarketTickers(["NVDA", "BTC-USD"]);
      expect(tickers.length).toBeGreaterThan(0);
      expect(tickers[0].symbol).toBeDefined();
      expect(tickers[0].value).toBeDefined();
    });
  });

  describe("Format Conversions (MarketTickerItem & DataTicker)", () => {
    it("should format quotes into MarketTickerItem array with positive/negative flags", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        const symbol = String(url).includes("NVDA") ? "NVDA" : "TSLA";
        const isNvda = symbol === "NVDA";
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    currency: "USD",
                    symbol,
                    regularMarketPrice: isNvda ? 140 : 240,
                    chartPreviousClose: isNvda ? 130 : 250,
                  },
                },
              ],
            },
          }),
        } as any;
      });

      const items = await service.getLiveMarketTickers(["NVDA", "TSLA"]);
      expect(items.length).toBe(2);

      const nvda = items.find((i) => i.symbol === "NVDA");
      expect(nvda).toBeDefined();
      expect(nvda?.isPositive).toBe(true);
      expect(nvda?.change).toContain("+");

      const tsla = items.find((i) => i.symbol === "TSLA");
      expect(tsla).toBeDefined();
      expect(tsla?.isPositive).toBe(false);
      expect(tsla?.change).toContain("-");
    });

    it("should format quotes into DataTicker array with up/down direction", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("binance.com")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "BTCUSDT",
              lastPrice: "100000.00",
              openPrice: "95000.00",
              priceChangePercent: "5.26",
            }),
          } as any;
        }

        const symbol = urlStr.includes("BTC") ? "BTC-USD" : "TSLA";
        const isBtc = symbol === "BTC-USD";
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    currency: "USD",
                    symbol,
                    regularMarketPrice: isBtc ? 100000 : 240,
                    chartPreviousClose: isBtc ? 95000 : 250,
                  },
                },
              ],
            },
          }),
        } as any;
      });

      const tickers = await service.getLiveDataTickers(["BTC-USD", "TSLA"]);
      expect(tickers.length).toBe(2);

      const btc = tickers.find((t) => t.symbol === "BTC");
      expect(btc?.direction).toBe("up");

      const tsla = tickers.find((t) => t.symbol === "TSLA");
      expect(tsla?.direction).toBe("down");
    });
  });

  describe("Top Gainers & Losers Screeners", () => {
    it("should fetch and parse day_gainers from Yahoo screener API", async () => {
      const mockScreenerResponse = {
        finance: {
          result: [
            {
              quotes: [
                {
                  symbol: "CRCL",
                  shortName: "Circle Internet Group",
                  regularMarketPrice: 93.5,
                  regularMarketChange: 6.36,
                  regularMarketChangePercent: 7.3,
                  regularMarketPreviousClose: 87.14,
                },
                {
                  symbol: "ASND",
                  shortName: "Ascendis Pharma",
                  regularMarketPrice: 264.7,
                  regularMarketChange: 16.8,
                  regularMarketChangePercent: 6.78,
                  regularMarketPreviousClose: 247.9,
                },
              ],
            },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockScreenerResponse,
      } as any);

      const gainers = await service.getTopGainers(2);
      expect(gainers.length).toBe(2);
      expect(gainers[0].symbol).toBe("CRCL");
      expect(gainers[0].category).toBe("gainers");
      expect(gainers[0].isPositive).toBe(true);
      expect(gainers[0].change).toBe("+7.3%");
    });

    it("should fetch and parse day_losers from Yahoo screener API", async () => {
      const mockScreenerResponse = {
        finance: {
          result: [
            {
              quotes: [
                {
                  symbol: "EIX",
                  shortName: "Edison International",
                  regularMarketPrice: 53.31,
                  regularMarketChange: -16.87,
                  regularMarketChangePercent: -24.03,
                  regularMarketPreviousClose: 70.18,
                },
              ],
            },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockScreenerResponse,
      } as any);

      const losers = await service.getTopLosers(1);
      expect(losers.length).toBe(1);
      expect(losers[0].symbol).toBe("EIX");
      expect(losers[0].category).toBe("losers");
      expect(losers[0].isPositive).toBe(false);
      expect(losers[0].change).toBe("-24.0%");
    });

    it("should return comprehensive market feed combining watchlist, gainers, and losers", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("day_gainers")) {
          return {
            ok: true,
            json: async () => ({
              finance: {
                result: [{
                  quotes: [{ symbol: "GAIN1", shortName: "Gainer 1", regularMarketPrice: 50, regularMarketChange: 5, regularMarketChangePercent: 10, regularMarketPreviousClose: 45 }]
                }]
              }
            })
          } as any;
        } else if (urlStr.includes("day_losers")) {
          return {
            ok: true,
            json: async () => ({
              finance: {
                result: [{
                  quotes: [{ symbol: "LOSE1", shortName: "Loser 1", regularMarketPrice: 20, regularMarketChange: -4, regularMarketChangePercent: -15, regularMarketPreviousClose: 24 }]
                }]
              }
            })
          } as any;
        } else {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [{
                  meta: { currency: "USD", symbol: "NVDA", regularMarketPrice: 140, chartPreviousClose: 135 }
                }]
              }
            })
          } as any;
        }
      });

      const feed = await service.getComprehensiveMarketFeed({ watchlist: ["NVDA"], moverCount: 1 });
      expect(feed.watchlist.length).toBe(1);
      expect(feed.gainers.length).toBe(1);
      expect(feed.losers.length).toBe(1);
      expect(feed.combined.length).toBe(3);
    });
  });

  describe("Integration with NewsContextService", () => {
    it("should inject live market tickers into news prompt context", () => {
      const newsService = new NewsContextService();
      const mockStories = [
        {
          id: "story_123",
          title: "Semiconductor Breakthrough Announced",
          description: "Next-gen lithography delivers 2x energy efficiency.",
          category: "Tech",
          link: "https://example.com/tech",
          pubDate: "2026-08-31T12:00:00Z",
          createdAt: "2026-08-31T12:00:00Z",
        },
      ];

      const liveMarkets = [
        { symbol: "NVDA", label: "NVIDIA Corp", value: "$142.50", change: "+5.1%", isPositive: true },
        { symbol: "BTC", label: "Bitcoin", value: "$99,200", change: "+3.4%", isPositive: true },
      ];

      const prompt = newsService.formatNewsPromptContext(mockStories, "en", liveMarkets);
      expect(prompt).toContain("CURRENT MARKET INDICES (REAL-TIME):");
      expect(prompt).toContain("NVDA: $142.50 (+5.1%)");
      expect(prompt).toContain("BTC: $99,200 (+3.4%)");
    });
  });
});
