/**
 * src/lib/markets/useRealtimeMarkets.ts
 *
 * Client React Hook for Real-Time Market Data.
 * Connects to Server-Sent Events (SSE) `/api/markets/stream` for live price updates,
 * with automatic reconnect and HTTP polling fallback.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { MarketTickerItem, ComprehensiveMarketFeed } from "./marketDataService";

const DEFAULT_WATCHLIST: MarketTickerItem[] = [
  { symbol: "NVDA", label: "NVIDIA Corp", value: "$228.86", change: "+1.7%", isPositive: true, category: "majors" },
  { symbol: "BTC", label: "Bitcoin", value: "$83,021", change: "-0.6%", isPositive: false, category: "majors" },
  { symbol: "ETH", label: "Ethereum", value: "$2,659", change: "-1.1%", isPositive: false, category: "majors" },
  { symbol: "AAPL", label: "Apple Inc", value: "$338.40", change: "-0.8%", isPositive: false, category: "majors" },
  { symbol: "TSLA", label: "Tesla Inc", value: "$357.45", change: "-3.9%", isPositive: false, category: "majors" },
  { symbol: "S&P 500", label: "S&P 500", value: "7,683.7", change: "-0.8%", isPositive: false, category: "majors" },
  { symbol: "MSFT", label: "Microsoft Corp", value: "$509.22", change: "-1.3%", isPositive: false, category: "majors" },
];

const DEFAULT_GAINERS: MarketTickerItem[] = [
  { symbol: "KOD", label: "Kodiak Sciences", value: "$89.92", change: "+178.0%", isPositive: true, category: "gainers" },
  { symbol: "MAAS", label: "Maase Inc", value: "$17.95", change: "+16.8%", isPositive: true, category: "gainers" },
  { symbol: "ABCL", label: "AbCellera Bio", value: "$13.92", change: "+9.6%", isPositive: true, category: "gainers" },
  { symbol: "CAAP", label: "America Airports", value: "$26.05", change: "+9.1%", isPositive: true, category: "gainers" },
];

const DEFAULT_LOSERS: MarketTickerItem[] = [
  { symbol: "MDB", label: "MongoDB Inc", value: "$334.68", change: "-18.5%", isPositive: false, category: "losers" },
  { symbol: "GFI", label: "Gold Fields", value: "$35.18", change: "-12.9%", isPositive: false, category: "losers" },
  { symbol: "AUR", label: "Aurora Innovation", value: "$5.29", change: "-12.4%", isPositive: false, category: "losers" },
  { symbol: "MOD", label: "Modine Mfg", value: "$175.04", change: "-11.6%", isPositive: false, category: "losers" },
];

export interface RealtimeMarketsState {
  watchlist: MarketTickerItem[];
  gainers: MarketTickerItem[];
  losers: MarketTickerItem[];
  combined: MarketTickerItem[];
  isLive: boolean;
  lastUpdated: number;
  refresh: () => Promise<void>;
}

export function useRealtimeMarkets(options?: {
  enableStream?: boolean;
  pollIntervalMs?: number;
}): RealtimeMarketsState {
  const enableStream = options?.enableStream ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? 20000;

  const [watchlist, setWatchlist] = useState<MarketTickerItem[]>(DEFAULT_WATCHLIST);
  const [gainers, setGainers] = useState<MarketTickerItem[]>(DEFAULT_GAINERS);
  const [losers, setLosers] = useState<MarketTickerItem[]>(DEFAULT_LOSERS);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const eventSourceRef = useRef<EventSource | null>(null);

  const applyFeed = useCallback((feed: Partial<ComprehensiveMarketFeed>) => {
    if (Array.isArray(feed.watchlist) && feed.watchlist.length > 0) {
      setWatchlist(feed.watchlist);
    }
    if (Array.isArray(feed.gainers) && feed.gainers.length > 0) {
      setGainers(feed.gainers);
    }
    if (Array.isArray(feed.losers) && feed.losers.length > 0) {
      setLosers(feed.losers);
    }
    setIsLive(true);
    setLastUpdated(feed.timestamp || Date.now());
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/markets/realtime?includeMovers=true");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          applyFeed(data);
        }
      }
    } catch (err) {
      console.warn("[useRealtimeMarkets] Polling fetch failed:", err);
    }
  }, [applyFeed]);

  useEffect(() => {
    // Initial fetch
    fetchSnapshot();

    if (!enableStream || typeof window === "undefined" || !("EventSource" in window)) {
      const interval = setInterval(fetchSnapshot, pollIntervalMs);
      return () => clearInterval(interval);
    }

    // Connect to SSE Stream
    try {
      const es = new EventSource("/api/markets/stream");
      eventSourceRef.current = es;

      es.addEventListener("init", (event) => {
        try {
          const data = JSON.parse(event.data);
          applyFeed(data);
        } catch {}
      });

      es.addEventListener("tick", (event) => {
        try {
          const data = JSON.parse(event.data);
          applyFeed(data);
        } catch {}
      });

      es.onerror = () => {
        setIsLive(false);
        es.close();
        // Fall back to HTTP polling on SSE error
        const fallbackInterval = setInterval(fetchSnapshot, pollIntervalMs);
        return () => clearInterval(fallbackInterval);
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch {
      const fallbackInterval = setInterval(fetchSnapshot, pollIntervalMs);
      return () => clearInterval(fallbackInterval);
    }
  }, [enableStream, fetchSnapshot, pollIntervalMs, applyFeed]);

  const combined = [...watchlist, ...gainers, ...losers];

  return {
    watchlist,
    gainers,
    losers,
    combined,
    isLive,
    lastUpdated,
    refresh: fetchSnapshot,
  };
}
