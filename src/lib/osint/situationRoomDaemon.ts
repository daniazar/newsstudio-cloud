/**
 * src/lib/osint/situationRoomDaemon.ts
 *
 * 24/7 OSINT Situation Room Daemon.
 * Evaluates real-time news wires, RSS feeds, and financial telemetry anomalies.
 * Calculates urgency scores and triggers autonomous breaking bulletins with 4-hour deduplication.
 */

import crypto from "crypto";

export interface OsintWireItem {
  id?: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt?: string;
  category?: string;
  rawMetrics?: Record<string, number>;
}

export interface OsintEvaluatedAlert {
  wireItem: OsintWireItem;
  urgencyScore: number; // 0 to 100
  isBreaking: boolean; // urgencyScore >= 85
  confidence: number; // 0 to 1.0
  detectedKeywords: string[];
  suggestedFormat: "breaking_bulletin" | "market_alert" | "standard_wire";
  hash: string;
}

export interface OsintProcessingResult {
  totalEvaluated: number;
  breakingDispatched: number;
  duplicatesIgnored: number;
  alerts: OsintEvaluatedAlert[];
}

/**
 * Deterministic hash for deduplicating wire items.
 */
export function computeWireHash(item: OsintWireItem): string {
  const normalized = (item.url || `${item.source}:${item.headline}`).toLowerCase().trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * 4-Hour Time-To-Live Deduplication Cache for the Situation Room.
 */
export class OsintDeduplicationCache {
  private cache: Map<string, number> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = 4 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  public has(hash: string): boolean {
    this.prune();
    return this.cache.has(hash);
  }

  public add(hash: string): void {
    this.cache.set(hash, Date.now());
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    this.prune();
    return this.cache.size;
  }

  public prune(): void {
    const now = Date.now();
    for (const [hash, timestamp] of this.cache.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.cache.delete(hash);
      }
    }
  }
}

// Global in-memory singleton cache
export const globalOsintCache = new OsintDeduplicationCache();

const HIGH_URGENCY_KEYWORDS = [
  "breaking",
  "critical",
  "emergency",
  "flash",
  "unprecedented",
  "alert",
  "urgent",
  "catastrophic",
  "blackout",
];

const VOLATILITY_KEYWORDS = [
  "surge",
  "collapse",
  "crash",
  "skyrockets",
  "plunges",
  "soars",
  "freefall",
  "liquidation",
];

const IMPACT_KEYWORDS = [
  "sanctions",
  "indictment",
  "antitrust",
  "fda approval",
  "ceasefire",
  "outage",
  "breach",
  "hack",
  "exploit",
];

const TIER1_SOURCES = [
  "reuters",
  "bloomberg",
  "associated press",
  "ap",
  "financial times",
  "wsj",
  "wall street journal",
];

/**
 * Evaluates an incoming OSINT wire item and computes its urgency score.
 */
export function evaluateOsintAlert(item: OsintWireItem): OsintEvaluatedAlert {
  const text = `${item.headline} ${item.summary}`.toLowerCase();
  let score = 20; // baseline score
  const detectedKeywords: string[] = [];

  // Check high urgency keywords (+35)
  for (const kw of HIGH_URGENCY_KEYWORDS) {
    if (text.includes(kw)) {
      score += 35;
      detectedKeywords.push(kw);
      break;
    }
  }

  // Check volatility keywords (+25)
  for (const kw of VOLATILITY_KEYWORDS) {
    if (text.includes(kw)) {
      score += 25;
      detectedKeywords.push(kw);
      break;
    }
  }

  // Check impact keywords (+20)
  for (const kw of IMPACT_KEYWORDS) {
    if (text.includes(kw)) {
      score += 20;
      detectedKeywords.push(kw);
      break;
    }
  }

  // Source credibility boost (+20)
  const sourceNormalized = item.source.toLowerCase().trim();
  const isTier1 = TIER1_SOURCES.some((s) => sourceNormalized.includes(s));
  if (isTier1) {
    score += 20;
  }

  // Cap score at 100
  const urgencyScore = Math.min(score, 100);
  const confidence = isTier1 ? 0.95 : 0.82;
  const isBreaking = urgencyScore >= 85;

  let suggestedFormat: "breaking_bulletin" | "market_alert" | "standard_wire" = "standard_wire";
  if (isBreaking) {
    suggestedFormat = "breaking_bulletin";
  } else if (urgencyScore >= 60) {
    suggestedFormat = "market_alert";
  }

  const hash = computeWireHash(item);

  return {
    wireItem: item,
    urgencyScore,
    isBreaking,
    confidence,
    detectedKeywords,
    suggestedFormat,
    hash,
  };
}

/**
 * Processes a stream of OSINT wire items, filtering out duplicates and prioritizing breaking bulletins.
 */
export function processOsintStream(
  items: OsintWireItem[],
  cache: OsintDeduplicationCache = globalOsintCache
): OsintProcessingResult {
  const alerts: OsintEvaluatedAlert[] = [];
  let duplicatesIgnored = 0;
  let breakingDispatched = 0;

  for (const item of items) {
    const hash = computeWireHash(item);

    if (cache.has(hash)) {
      duplicatesIgnored++;
      continue;
    }

    const evaluation = evaluateOsintAlert(item);
    cache.add(hash);

    if (evaluation.isBreaking) {
      breakingDispatched++;
    }

    alerts.push(evaluation);
  }

  // Sort alerts descending by urgency score
  alerts.sort((a, b) => b.urgencyScore - a.urgencyScore);

  return {
    totalEvaluated: items.length,
    breakingDispatched,
    duplicatesIgnored,
    alerts,
  };
}
