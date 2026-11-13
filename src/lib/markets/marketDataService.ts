/**
 * src/lib/markets/marketDataService.ts
 *
 * Real-Time Multi-Source Keyless Market Data Service.
 * Fetches live quotes, indices, commodities, cryptocurrencies, top gainers, and top losers
 * using free, keyless data sources:
 *   - Binance Real-time 24hr Ticker API (for ultra-fast, 24/7 crypto pricing)
 *   - Yahoo Finance v8 Chart API (with query1 & query2 dual-mirror failover for stocks/indices)
 *   - Yahoo Finance v1 Predefined Screener API (for Top Gainers & Top Losers)
 *
 * Features in-memory TTL caching, automatic background polling, and broadcast formatters.
 */

import type { DataTicker } from "@/lib/studio/parsers/types";

export interface MarketQuote {
  symbol: string;
  cleanSymbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
  currency: string;
  timestamp: number;
  source?: "binance" | "yahoo" | "cache" | "fallback";
  category?: "majors" | "gainers" | "losers" | "general";
}

export interface MarketTickerItem {
  symbol: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  category?: "majors" | "gainers" | "losers" | "general";
}

export interface HistoricalCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ComprehensiveMarketFeed {
  watchlist: MarketTickerItem[];
  gainers: MarketTickerItem[];
  losers: MarketTickerItem[];
  combined: MarketTickerItem[];
  timestamp: number;
}

/** Mapping of crypto symbols to Binance USDT pairs */
const BINANCE_CRYPTO_MAP: Record<string, { pair: string; cleanSymbol: string; name: string }> = {
  "BTC-USD": { pair: "BTCUSDT", cleanSymbol: "BTC", name: "Bitcoin" },
  "BTC": { pair: "BTCUSDT", cleanSymbol: "BTC", name: "Bitcoin" },
  "ETH-USD": { pair: "ETHUSDT", cleanSymbol: "ETH", name: "Ethereum" },
  "ETH": { pair: "ETHUSDT", cleanSymbol: "ETH", name: "Ethereum" },
  "SOL-USD": { pair: "SOLUSDT", cleanSymbol: "SOL", name: "Solana" },
  "SOL": { pair: "SOLUSDT", cleanSymbol: "SOL", name: "Solana" },
  "DOGE-USD": { pair: "DOGEUSDT", cleanSymbol: "DOGE", name: "Dogecoin" },
  "XRP-USD": { pair: "XRPUSDT", cleanSymbol: "XRP", name: "XRP" },
};

/** Standard friendly display labels for popular symbols */
const SYMBOL_FRIENDLY_NAMES: Record<string, { symbol: string; label: string }> = {
  "NVDA": { symbol: "NVDA", label: "NVIDIA Corp" },
  "AAPL": { symbol: "AAPL", label: "Apple Inc" },
  "TSLA": { symbol: "TSLA", label: "Tesla Inc" },
  "MSFT": { symbol: "MSFT", label: "Microsoft Corp" },
  "AMZN": { symbol: "AMZN", label: "Amazon.com" },
  "GOOGL": { symbol: "GOOGL", label: "Alphabet Inc" },
  "META": { symbol: "META", label: "Meta Platforms" },
  "BTC-USD": { symbol: "BTC", label: "Bitcoin" },
  "ETH-USD": { symbol: "ETH", label: "Ethereum" },
  "SOL-USD": { symbol: "SOL", label: "Solana" },
  "^GSPC": { symbol: "S&P 500", label: "S&P 500" },
  "^IXIC": { symbol: "NASDAQ", label: "Nasdaq Composite" },
  "^DJI": { symbol: "DOW", label: "Dow Jones" },
  "GC=F": { symbol: "GOLD", label: "Gold Spot" },
  "CL=F": { symbol: "OIL", label: "Crude Oil (WTI)" },
};

/** Default watchlist for real-time broadcasts and ticker tapes */
export const DEFAULT_WATCHLIST = [
  "NVDA",
  "BTC-USD",
  "ETH-USD",
  "AAPL",
  "TSLA",
  "^GSPC",
  "MSFT",
];

/** Fresh baseline snapshots used immediately if network is completely offline */
const FALLBACK_SNAPSHOTS: MarketTickerItem[] = [
  { symbol: "NVDA", label: "NVIDIA Corp", value: "$228.86", change: "+1.7%", isPositive: true, category: "majors" },
  { symbol: "BTC", label: "Bitcoin", value: "$83,021", change: "-0.6%", isPositive: false, category: "majors" },
  { symbol: "ETH", label: "Ethereum", value: "$2,659", change: "-1.1%", isPositive: false, category: "majors" },
  { symbol: "AAPL", label: "Apple Inc", value: "$338.40", change: "-0.8%", isPositive: false, category: "majors" },
  { symbol: "TSLA", label: "Tesla Inc", value: "$357.45", change: "-3.9%", isPositive: false, category: "majors" },
  { symbol: "S&P 500", label: "S&P 500", value: "7,683.7", change: "-0.8%", isPositive: false, category: "majors" },
  { symbol: "MSFT", label: "Microsoft Corp", value: "$509.22", change: "-1.3%", isPositive: false, category: "majors" },
];

const FALLBACK_GAINERS: MarketTickerItem[] = [
  { symbol: "KOD", label: "Kodiak Sciences", value: "$89.92", change: "+178.0%", isPositive: true, category: "gainers" },
  { symbol: "MAAS", label: "Maase Inc", value: "$17.95", change: "+16.8%", isPositive: true, category: "gainers" },
  { symbol: "ABCL", label: "AbCellera Bio", value: "$13.92", change: "+9.6%", isPositive: true, category: "gainers" },
  { symbol: "CAAP", label: "America Airports", value: "$26.05", change: "+9.1%", isPositive: true, category: "gainers" },
  { symbol: "HHH", label: "Howard Hughes", value: "$73.95", change: "+8.1%", isPositive: true, category: "gainers" },
];

const FALLBACK_LOSERS: MarketTickerItem[] = [
  { symbol: "MDB", label: "MongoDB Inc", value: "$334.68", change: "-18.5%", isPositive: false, category: "losers" },
  { symbol: "GFI", label: "Gold Fields", value: "$35.18", change: "-12.9%", isPositive: false, category: "losers" },
  { symbol: "AUR", label: "Aurora Innovation", value: "$5.29", change: "-12.4%", isPositive: false, category: "losers" },
  { symbol: "MOD", label: "Modine Mfg", value: "$175.04", change: "-11.6%", isPositive: false, category: "losers" },
  { symbol: "NU", label: "Nu Holdings", value: "$12.23", change: "-10.0%", isPositive: false, category: "losers" },
];

export class MarketDataService {
  private cache: Map<string, { quote: MarketQuote; cachedAt: number }> = new Map();
  private screenerCache: Map<string, { quotes: MarketQuote[]; cachedAt: number }> = new Map();
  private cacheTtlMs: number = 30 * 1000; // 30s TTL
  private bgIntervalId: NodeJS.Timeout | null = null;
  private isPrewarmed = false;

  constructor(cacheTtlMs?: number) {
    if (cacheTtlMs && cacheTtlMs > 0) {
      this.cacheTtlMs = cacheTtlMs;
    }
  }

  /**
   * Sets custom cache TTL in milliseconds.
   */
  public setCacheTtl(ms: number) {
    this.cacheTtlMs = ms;
  }

  /**
   * Clears the in-memory cache.
   */
  public clearCache() {
    this.cache.clear();
    this.screenerCache.clear();
  }

  /**
   * Starts background cache pre-warming and polling loop.
   */
  public startBackgroundPolling(intervalMs = 25000) {
    if (this.bgIntervalId) return;
    this.prewarmCache().catch(() => {});
    this.bgIntervalId = setInterval(() => {
      this.prewarmCache().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stops background polling.
   */
  public stopBackgroundPolling() {
    if (this.bgIntervalId) {
      clearInterval(this.bgIntervalId);
      this.bgIntervalId = null;
    }
  }

  /**
   * Pre-warms the cache with fresh data in the background.
   */
  public async prewarmCache(): Promise<void> {
    try {
      await Promise.allSettled([
        this.fetchQuotes(DEFAULT_WATCHLIST),
        this.fetchTopMovers("day_gainers", 6),
        this.fetchTopMovers("day_losers", 6),
      ]);
      this.isPrewarmed = true;
    } catch {
      // Background prewarm ignores errors
    }
  }

  /**
   * Fast crypto price fetcher using Binance's public, zero-key 24hr ticker API.
   */
  public async fetchBinanceCrypto(rawSymbol: string): Promise<MarketQuote | null> {
    const symbol = rawSymbol.trim().toUpperCase();
    const mapping = BINANCE_CRYPTO_MAP[symbol];
    if (!mapping) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${mapping.pair}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Binance HTTP ${response.status}`);
      }

      const data = await response.json();
      const price = Number(data.lastPrice || 0);
      const prevPrice = Number(data.prevClosePrice || data.openPrice || price);
      const change = Number(data.priceChange || (price - prevPrice));
      const changePercent = Number(data.priceChangePercent || 0);

      const quote: MarketQuote = {
        symbol,
        cleanSymbol: mapping.cleanSymbol,
        name: mapping.name,
        price,
        previousClose: prevPrice,
        change,
        changePercent,
        high: Number(data.highPrice || price),
        low: Number(data.lowPrice || price),
        volume: Number(data.volume || 0),
        currency: "USD",
        timestamp: Date.now(),
        source: "binance",
        category: "majors",
      };

      this.cache.set(symbol, { quote, cachedAt: Date.now() });
      return quote;
    } catch {
      return null;
    }
  }

  /**
   * Fetches a single quote using Yahoo Finance with query1 -> query2 mirror fallback.
   */
  public async fetchYahooQuote(rawSymbol: string): Promise<MarketQuote | null> {
    const symbol = rawSymbol.trim().toUpperCase();
    const mirrors = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    ];

    for (const url of mirrors) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (!result || !result.meta) continue;

        const meta = result.meta;
        const price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

        const friendly = SYMBOL_FRIENDLY_NAMES[symbol];
        const name = friendly?.label || meta.shortName || meta.longName || symbol;
        const cleanSymbol = friendly?.symbol || symbol.replace("-USD", "");

        const quote: MarketQuote = {
          symbol,
          cleanSymbol,
          name,
          price,
          previousClose: prevClose,
          change,
          changePercent,
          high: meta.regularMarketDayHigh,
          low: meta.regularMarketDayLow,
          volume: meta.regularMarketVolume,
          currency: meta.currency || "USD",
          timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
          source: "yahoo",
          category: "majors",
        };

        this.cache.set(symbol, { quote, cachedAt: Date.now() });
        return quote;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Fetches a single market quote across all providers with caching.
   */
  public async fetchQuote(rawSymbol: string): Promise<MarketQuote | null> {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!symbol) return null;

    // 1. Check in-memory cache
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached.quote;
    }

    // 2. If Crypto, try Binance first (super-fast, 24/7)
    if (BINANCE_CRYPTO_MAP[symbol]) {
      const binanceQuote = await this.fetchBinanceCrypto(symbol);
      if (binanceQuote) return binanceQuote;
    }

    // 3. Try Yahoo Finance dual mirrors
    const yahooQuote = await this.fetchYahooQuote(symbol);
    if (yahooQuote) return yahooQuote;

    // 4. Return stale cache if available
    if (cached) {
      return cached.quote;
    }

    return null;
  }

  /**
   * Fetches multiple market quotes concurrently with resilience.
   */
  public async fetchQuotes(symbols: string[] = DEFAULT_WATCHLIST): Promise<MarketQuote[]> {
    const results = await Promise.allSettled(
      symbols.map((sym) => this.fetchQuote(sym))
    );

    const quotes: MarketQuote[] = [];
    results.forEach((res) => {
      if (res.status === "fulfilled" && res.value) {
        quotes.push(res.value);
      }
    });

    return quotes;
  }

  /**
   * Fetches top movers (day gainers or day losers) from Yahoo Finance screener API.
   */
  public async fetchTopMovers(
    type: "day_gainers" | "day_losers",
    count = 6
  ): Promise<MarketQuote[]> {
    const cacheKey = `screener_${type}_${count}`;
    const cached = this.screenerCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached.quotes;
    }

    const mirrors = [
      `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=${type}&count=${count}`,
      `https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=${type}&count=${count}`,
    ];

    for (const url of mirrors) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        const rawQuotes = data?.finance?.result?.[0]?.quotes;
        if (!Array.isArray(rawQuotes) || rawQuotes.length === 0) continue;

        const category = type === "day_gainers" ? "gainers" : "losers";

        interface YahooScreenerQuoteItem {
          symbol?: string;
          shortName?: string;
          longName?: string;
          displayName?: string;
          regularMarketPrice?: number | string;
          regularMarketChange?: number | string;
          regularMarketChangePercent?: number | string;
          regularMarketPreviousClose?: number | string;
          regularMarketDayHigh?: number;
          regularMarketDayLow?: number;
          regularMarketVolume?: number;
          currency?: string;
          regularMarketTime?: number;
        }

        const quotes: MarketQuote[] = rawQuotes.slice(0, count).map((item: YahooScreenerQuoteItem) => {
          const symbol = String(item.symbol || "").trim();
          const name = item.shortName || item.longName || item.displayName || symbol;
          const price = Number(item.regularMarketPrice ?? 0);
          const change = Number(item.regularMarketChange ?? 0);
          const changePercent = Number(item.regularMarketChangePercent ?? 0);

          return {
            symbol,
            cleanSymbol: symbol,
            name,
            price,
            previousClose: Number(item.regularMarketPreviousClose ?? (price - change)),
            change,
            changePercent,
            high: item.regularMarketDayHigh,
            low: item.regularMarketDayLow,
            volume: item.regularMarketVolume,
            currency: item.currency || "USD",
            timestamp: item.regularMarketTime ? item.regularMarketTime * 1000 : Date.now(),
            source: "yahoo",
            category,
          };
        });

        this.screenerCache.set(cacheKey, { quotes, cachedAt: Date.now() });
        return quotes;
      } catch {
        continue;
      }
    }

    if (cached) {
      return cached.quotes;
    }
    return [];
  }

  /**
   * Formats a raw numerical price into a broadcast-friendly string.
   */
  public formatPrice(price: number, currency = "USD", symbol = ""): string {
    const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL");
    const isIndex = symbol.startsWith("^") || symbol.includes("S&P") || symbol.includes("DOW") || symbol.includes("NASDAQ");

    if (currency === "USD") {
      if (price >= 1000) {
        return isIndex
          ? price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : `$${price.toLocaleString("en-US", {
              minimumFractionDigits: isCrypto ? 0 : 2,
              maximumFractionDigits: isCrypto ? 0 : 2,
            })}`;
      } else if (price >= 1) {
        return `$${price.toFixed(2)}`;
      } else {
        return `$${price.toFixed(4)}`;
      }
    }

    return `${price.toFixed(2)} ${currency}`;
  }

  /**
   * Formats a numerical percentage into "+X.X%" or "-X.X%".
   */
  public formatChangePercent(changePercent: number): string {
    const prefix = changePercent >= 0 ? "+" : "";
    return `${prefix}${changePercent.toFixed(1)}%`;
  }

  /**
   * Returns formatted MarketTickerItems for real-time calls, RAG context, and LiveAnchor UI.
   */
  public async getLiveMarketTickers(
    symbols: string[] = DEFAULT_WATCHLIST
  ): Promise<MarketTickerItem[]> {
    try {
      const quotes = await this.fetchQuotes(symbols);
      if (quotes.length === 0) {
        return FALLBACK_SNAPSHOTS;
      }

      return quotes.map((q) => ({
        symbol: q.cleanSymbol,
        label: q.name,
        value: this.formatPrice(q.price, q.currency, q.symbol),
        change: this.formatChangePercent(q.changePercent),
        isPositive: q.changePercent >= 0,
        category: "majors",
      }));
    } catch {
      return FALLBACK_SNAPSHOTS;
    }
  }

  /**
   * Fetches top gainers formatted as MarketTickerItem.
   */
  public async getTopGainers(count = 5): Promise<MarketTickerItem[]> {
    try {
      const quotes = await this.fetchTopMovers("day_gainers", count);
      if (quotes.length === 0) {
        return FALLBACK_GAINERS.slice(0, count);
      }

      return quotes.map((q) => ({
        symbol: q.cleanSymbol,
        label: q.name,
        value: this.formatPrice(q.price, q.currency, q.symbol),
        change: this.formatChangePercent(q.changePercent),
        isPositive: true,
        category: "gainers",
      }));
    } catch {
      return FALLBACK_GAINERS.slice(0, count);
    }
  }

  /**
   * Fetches top losers formatted as MarketTickerItem.
   */
  public async getTopLosers(count = 5): Promise<MarketTickerItem[]> {
    try {
      const quotes = await this.fetchTopMovers("day_losers", count);
      if (quotes.length === 0) {
        return FALLBACK_LOSERS.slice(0, count);
      }

      return quotes.map((q) => ({
        symbol: q.cleanSymbol,
        label: q.name,
        value: this.formatPrice(q.price, q.currency, q.symbol),
        change: this.formatChangePercent(q.changePercent),
        isPositive: false,
        category: "losers",
      }));
    } catch {
      return FALLBACK_LOSERS.slice(0, count);
    }
  }

  /**
   * Returns a rich comprehensive multi-category feed with watchlist, top gainers, and top losers.
   */
  public async getComprehensiveMarketFeed(options?: {
    watchlist?: string[];
    moverCount?: number;
  }): Promise<ComprehensiveMarketFeed> {
    const moverCount = options?.moverCount || 5;
    const watchlistSymbols = options?.watchlist || DEFAULT_WATCHLIST;

    const [watchlist, gainers, losers] = await Promise.all([
      this.getLiveMarketTickers(watchlistSymbols),
      this.getTopGainers(moverCount),
      this.getTopLosers(moverCount),
    ]);

    const combined: MarketTickerItem[] = [
      ...watchlist,
      ...gainers,
      ...losers,
    ];

    return {
      watchlist,
      gainers,
      losers,
      combined,
      timestamp: Date.now(),
    };
  }

  /**
   * Synchronous snapshot accessor (returns cached quotes or fallbacks immediately).
   */
  public getMarketTickerSnapshot(symbols: string[] = DEFAULT_WATCHLIST): MarketTickerItem[] {
    const items: MarketTickerItem[] = [];

    for (const sym of symbols) {
      const upper = sym.trim().toUpperCase();
      const cached = this.cache.get(upper);
      if (cached) {
        const q = cached.quote;
        items.push({
          symbol: q.cleanSymbol,
          label: q.name,
          value: this.formatPrice(q.price, q.currency, q.symbol),
          change: this.formatChangePercent(q.changePercent),
          isPositive: q.changePercent >= 0,
          category: "majors",
        });
      }
    }

    if (items.length > 0) {
      return items;
    }

    return FALLBACK_SNAPSHOTS;
  }

  /**
   * Converts quotes into DataTicker format for Data Graphics Studio and Remotion layers.
   */
  public async getLiveDataTickers(
    symbols: string[] = DEFAULT_WATCHLIST,
    includeMovers = false
  ): Promise<DataTicker[]> {
    const quotes = await this.fetchQuotes(symbols);
    let allQuotes = [...quotes];

    if (includeMovers) {
      const [gainers, losers] = await Promise.all([
        this.fetchTopMovers("day_gainers", 4),
        this.fetchTopMovers("day_losers", 4),
      ]);
      allQuotes = [...allQuotes, ...gainers, ...losers];
    }

    if (allQuotes.length === 0) {
      return FALLBACK_SNAPSHOTS.map((s) => ({
        symbol: s.symbol,
        label: s.label,
        value: s.value,
        change: s.change,
        direction: s.isPositive ? "up" : "down",
      }));
    }

    return allQuotes.map((q) => {
      let direction: "up" | "down" | "flat" = "flat";
      if (q.changePercent > 0.05) direction = "up";
      else if (q.changePercent < -0.05) direction = "down";

      return {
        symbol: q.cleanSymbol,
        label: q.name,
        value: this.formatPrice(q.price, q.currency, q.symbol),
        change: this.formatChangePercent(q.changePercent),
        direction,
      };
    });
  }

  /**
   * Fetches historical candle bars for Candlestick / Sparkline graphics.
   */
  public async fetchHistoricalCandles(
    rawSymbol: string,
    range = "1mo",
    interval = "1d"
  ): Promise<{ quote: MarketQuote | null; candles: HistoricalCandle[] }> {
    const symbol = rawSymbol.trim().toUpperCase();
    const mirrors = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
    ];

    for (const url of mirrors) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (!result) continue;

        const timestamps: number[] = result.timestamp || [];
        const quoteObj = result.indicators?.quote?.[0] || {};
        const opens: number[] = quoteObj.open || [];
        const highs: number[] = quoteObj.high || [];
        const lows: number[] = quoteObj.low || [];
        const closes: number[] = quoteObj.close || [];
        const volumes: number[] = quoteObj.volume || [];

        const candles: HistoricalCandle[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (
            opens[i] != null &&
            highs[i] != null &&
            lows[i] != null &&
            closes[i] != null
          ) {
            candles.push({
              timestamp: timestamps[i] * 1000,
              open: Number(opens[i].toFixed(2)),
              high: Number(highs[i].toFixed(2)),
              low: Number(lows[i].toFixed(2)),
              close: Number(closes[i].toFixed(2)),
              volume: volumes[i] || 0,
            });
          }
        }

        const quote = await this.fetchQuote(symbol);
        return { quote, candles };
      } catch {
        continue;
      }
    }

    return { quote: null, candles: [] };
  }
}

/** Global singleton instance */
export const marketDataService = new MarketDataService();
