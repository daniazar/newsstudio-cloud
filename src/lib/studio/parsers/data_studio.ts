/**
 * src/lib/studio/parsers/data_studio.ts
 *
 * Motion Data Graphics & Interactive Chart Engine.
 * Powered by unified Vercel AI SDK Gateway (Gemini ↔ Ollama mutual failover).
 * Automatically classifies news story context and generates parameterized Remotion animation layers:
 * 📈 Candlesticks & Sparklines
 * 🏁 Bar Chart Races
 * 🎯 Comparison Gauges & Sentiment Meters
 * 🗺️ 3D Map Spotlight & Route Tracers
 * ⚖️ Glassmorphic Spec & Policy Matrices
 * 📊 Continuous Scrolling Ticker Tapes
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  DataStudioLlmResponseSchema,
  DataGraphicConfigSchema,
  DataTickerSchema,
  type DataStudioPayload,
  type DataGraphicType,
  type DataGraphicConfig,
  type DataTicker,
  type ParseOptions,
} from "./types";

export const SYSTEM_PROMPT = `You are an elite television broadcast graphics producer and financial data intelligence editor (Bloomberg, CNBC, Axios, Vox Newsroom).

## Task
Analyze the news article, determine the most informative data visualization paradigm to replace static B-roll, and extract fully parameterized motion graphic data along with 3-6 market ticker items and an anchor script.

## 1. Visualization Paradigms (Choose the SINGLE best fit in "graphicType")
1. "candlestick": Single stock/crypto/commodity asset with price volatility, breakouts, or OHLC data.
2. "sparkline": Timeline trend of a single metric (GDP, unemployment, Bitcoin, quarterly revenue curve).
3. "bar_race": Multi-entity comparison or ranking (market share, AI model benchmarks, election polls, quarterly profits).
4. "gauge": Single metric on a spectrum (Federal Reserve interest rates, Inflation index, Fear & Greed index, approval rating).
5. "map_tracer": Geopolitical, trade route, supply chain chokepoints (Red Sea, Panama Canal, flight routes, sanctions).
6. "spec_matrix": Direct 2-entity comparison (Chipset A vs Chipset B, Candidate A vs Candidate B, Proposed Policy vs Existing Law).
7. "ticker_tape": General macro roundup with no single dominant chart.

## 2. Parameter Schemas for "graphicConfig"

If graphicType == "candlestick":
{
  "type": "candlestick",
  "symbol": "NVDA",
  "name": "NVIDIA Corporation",
  "currentPrice": "$138.50",
  "change": "+4.2%",
  "isPositive": true,
  "timeframe": "1D",
  "calloutText": "Breakout Resistance $135.00",
  "candles": [
    { "timestamp": "09:30", "open": 132.0, "high": 134.5, "low": 131.5, "close": 134.0, "volume": 12.5 },
    { "timestamp": "11:00", "open": 134.0, "high": 136.2, "low": 133.8, "close": 135.8, "volume": 18.2 },
    { "timestamp": "13:30", "open": 135.8, "high": 139.0, "low": 135.2, "close": 138.5, "volume": 24.1 }
  ]
}

If graphicType == "sparkline":
{
  "type": "sparkline",
  "symbol": "BTC",
  "title": "Bitcoin 30-Day Trend",
  "currentValue": "$98,400",
  "deltaPercentage": "+14.2%",
  "isPositive": true,
  "timeframe": "30D",
  "highAnnotation": "ATH $99,200",
  "points": [
    { "label": "Day 1", "value": 84000 },
    { "label": "Day 10", "value": 89500 },
    { "label": "Day 20", "value": 94200 },
    { "label": "Day 30", "value": 98400 }
  ]
}

If graphicType == "bar_race":
{
  "type": "bar_race",
  "title": "AI Accelerator Market Share",
  "subtitle": "Data Center GPU Shipments 2025",
  "category": "Market Share %",
  "unit": "% Share",
  "items": [
    { "id": "1", "label": "NVIDIA Hopper/Blackwell", "value": 84, "formattedValue": "84.0%", "delta": "+6.2%", "icon": "🟢" },
    { "id": "2", "label": "AMD Instinct MI300", "value": 9.5, "formattedValue": "9.5%", "delta": "+3.1%", "icon": "🔴" },
    { "id": "3", "label": "Custom ASICs (TPU/Trainium)", "value": 6.5, "formattedValue": "6.5%", "delta": "+1.8%", "icon": "🔵" }
  ]
}

If graphicType == "gauge":
{
  "type": "gauge",
  "title": "US Core CPI Inflation Rate",
  "subtitle": "Federal Reserve 2.0% Target Band",
  "currentValue": 2.8,
  "formattedValue": "2.8%",
  "minValue": 0.0,
  "maxValue": 6.0,
  "unit": "%",
  "sentimentLabel": "Moderating Pressure",
  "zones": [
    { "label": "Target (0-2%)", "min": 0.0, "max": 2.0, "color": "#10b981" },
    { "label": "Moderate (2-4%)", "min": 2.0, "max": 4.0, "color": "#f59e0b" },
    { "label": "Elevated (4-6%)", "min": 4.0, "max": 6.0, "color": "#ef4444" }
  ]
}

If graphicType == "map_tracer":
{
  "type": "map_tracer",
  "title": "Red Sea Shipping Diversions",
  "subtitle": "Cape of Good Hope Route Shift",
  "region": "supply_chain_straits",
  "spotlightNote": "Suez Canal Volume -68% YoY",
  "waypoints": [
    { "id": "w1", "name": "Shanghai Port", "coords": [75, 45], "status": "origin", "value": "Origin Hub" },
    { "id": "w2", "name": "Bab el-Mandeb", "coords": [52, 58], "status": "chokepoint", "value": "Chokepoint" },
    { "id": "w3", "name": "Cape of Good Hope", "coords": [45, 85], "status": "transit", "value": "+14 Days" },
    { "id": "w4", "name": "Rotterdam Hub", "coords": [42, 25], "status": "destination", "value": "Destination" }
  ],
  "routes": [
    { "id": "r1", "fromId": "w1", "toId": "w3", "label": "Diverted Route (+3,500 nm)", "status": "diverted" },
    { "id": "r2", "fromId": "w3", "toId": "w4", "label": "Atlantic Transit", "status": "diverted" }
  ]
}

If graphicType == "spec_matrix":
{
  "type": "spec_matrix",
  "title": "Flagship AI Silicon Shootout",
  "subtitle": "Next-Gen Laptop Compute Architecture",
  "itemA": { "title": "Apple M4 Max", "badge": "3nm Enhanced", "subtitle": "Unified Memory Architecture" },
  "itemB": { "title": "Snapdragon X Elite", "badge": "ARMv9 Oryon", "subtitle": "Copilot+ PC Platform" },
  "verdict": "Apple holds 38% advantage in peak GPU AI throughput.",
  "rows": [
    { "label": "NPU Peak Compute", "valA": "38 TOPS", "valB": "45 TOPS", "winner": "B" },
    { "label": "GPU Memory Bandwidth", "valA": "546 GB/s", "valB": "136 GB/s", "winner": "A" },
    { "label": "Multithreaded Cinebench", "valA": "26,400", "valB": "15,800", "winner": "A" }
  ]
}

## 3. Ticker Tape Items ("tickers")
Generate 3–6 concise tickers from article data:
[
  { "symbol": "NVDA", "label": "NVIDIA", "value": "$138.50", "change": "+4.2%", "direction": "up" },
  { "symbol": "BTC", "label": "Bitcoin", "value": "$98,400", "change": "+2.8%", "direction": "up" },
  { "symbol": "INFLATION", "label": "US CPI", "value": "2.8%", "change": "-0.1%", "direction": "up" }
]

## 4. Anchor Summary ("summary")
- 2–4 crisp, authoritative broadcast sentences referencing the specific numbers and chart data.
- Start with an emotion tag: [serious] for downturns/crises, [excited] for surges/breakthroughs, [calm] for neutral analysis.

## Output Format
Return ONLY valid JSON (no markdown wrapping, no extra text):
{
  "headline": "1-line broadcast banner headline",
  "summary": "[emotion_tag] Anchor spoken commentary here.",
  "graphicType": "candlestick" | "sparkline" | "bar_race" | "gauge" | "map_tracer" | "spec_matrix" | "ticker_tape",
  "graphicConfig": { ... matching schema above ... },
  "tickers": [ ... ]
}`;

export type ParseDataStudioOptions = ParseOptions;

export async function parseArticleAsDataStudio(
  articleContent: string,
  optionsOrSlug?: string | ParseDataStudioOptions
): Promise<DataStudioPayload> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  const options: ParseDataStudioOptions = typeof optionsOrSlug === "string"
    ? { personaSlug: optionsOrSlug }
    : optionsOrSlug || {};

  const personaId = options.personaSlug || options.personaSlugs?.[0] || "ruby";

  try {
    const userPrompt = `ARTICLE CONTENT:\n${content.slice(0, 6000)}`;

    const { object: parsed } = await generateLlmObject({
      schema: DataStudioLlmResponseSchema,
      schemaName: "DataStudioScript",
      schemaDescription: "Financial data intelligence editor and graphic specification",
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.6,
      tier: "structured",
      provider: options.provider,
      model: options.model,
      companyId: options.companyId,
      storyId: options.storyId,
      allowFallback: options.allowFallback,
      customModel: options.customModel,
    });

    return normalizeDataStudioPayload(parsed, personaId);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Article content cannot be empty") {
      throw err;
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[parseArticleAsDataStudio] LLM extraction failed, using heuristic fallback:", errorMsg);
    return generateFallbackDataStudio(content, personaId);
  }
}

export function normalizeDataStudioPayload(
  parsed: z.infer<typeof DataStudioLlmResponseSchema>,
  personaId = "ruby"
): DataStudioPayload {
  const graphicType: DataGraphicType = parsed.graphicType || "sparkline";
  const rawTickers = Array.isArray(parsed.tickers) && parsed.tickers.length > 0
    ? parsed.tickers
    : [
        { symbol: "MARKET", label: "Global Equities", value: "4,980.20", change: "+1.2%", direction: "up" },
        { symbol: "TECH", label: "Tech Index", value: "18,420.50", change: "+2.4%", direction: "up" },
        { symbol: "CRYPTO", label: "Digital Assets", value: "$3.4T", change: "+4.8%", direction: "up" },
      ];
  const tickers: DataTicker[] = rawTickers.map((t: unknown) => DataTickerSchema.parse(t));

  let graphicConfig: DataGraphicConfig;
  if (parsed.graphicConfig && typeof parsed.graphicConfig === "object") {
    const candidate = {
      type: graphicType,
      ...parsed.graphicConfig,
    };
    const parsedConfig = DataGraphicConfigSchema.safeParse(candidate);
    if (parsedConfig.success) {
      graphicConfig = parsedConfig.data;
    } else {
      graphicConfig = generateDefaultGraphicConfig(graphicType);
    }
  } else {
    graphicConfig = generateDefaultGraphicConfig(graphicType);
  }

  return {
    studioType: "data_studio",
    outputMode: "video",
    headline: parsed.headline || "MARKET INTELLIGENCE & DATA TELEMETRY",
    summary: parsed.summary || "[serious] Key data metrics highlight shifting market momentum as analysts adjust projections.",
    graphicType,
    graphicConfig,
    tickers,
    personaId,
  };
}

/**
 * Generates default graphic configs when fallback is needed.
 */
export function generateDefaultGraphicConfig(type: DataGraphicType): DataGraphicConfig {
  switch (type) {
    case "candlestick":
      return {
        type: "candlestick",
        symbol: "NVDA",
        name: "NVIDIA Corp",
        currentPrice: "$138.50",
        change: "+4.2%",
        isPositive: true,
        timeframe: "1D",
        calloutText: "Record High Test",
        candles: [
          { timestamp: "09:30", open: 132.0, high: 134.5, low: 131.5, close: 134.0, volume: 12.5 },
          { timestamp: "10:30", open: 134.0, high: 135.8, low: 133.2, close: 135.2, volume: 16.8 },
          { timestamp: "11:30", open: 135.2, high: 137.0, low: 134.8, close: 136.5, volume: 21.0 },
          { timestamp: "13:00", open: 136.5, high: 138.2, low: 136.0, close: 137.8, volume: 19.4 },
          { timestamp: "14:30", open: 137.8, high: 139.5, low: 137.2, close: 138.5, volume: 28.6 },
        ],
      };

    case "bar_race":
      return {
        type: "bar_race",
        title: "AI Data Center Market Share",
        subtitle: "Global Silicon Shipments",
        category: "Market Share %",
        unit: "%",
        items: [
          { id: "1", label: "NVIDIA Blackwell / Hopper", value: 82.5, formattedValue: "82.5%", delta: "+5.2%", icon: "🟢" },
          { id: "2", label: "AMD Instinct MI300X", value: 11.2, formattedValue: "11.2%", delta: "+3.8%", icon: "🔴" },
          { id: "3", label: "Google Cloud TPU v5e/v6", value: 4.1, formattedValue: "4.1%", delta: "+1.2%", icon: "🔵" },
          { id: "4", label: "Amazon Trainium 2", value: 2.2, formattedValue: "2.2%", delta: "+0.8%", icon: "🟠" },
        ],
      };

    case "gauge":
      return {
        type: "gauge",
        title: "Federal Reserve Inflation Gauge",
        subtitle: "Core CPI vs 2.0% Fed Target",
        currentValue: 2.8,
        formattedValue: "2.8%",
        minValue: 0.0,
        maxValue: 6.0,
        unit: "%",
        sentimentLabel: "Moderating Inflation",
        zones: [
          { label: "Target (0-2%)", min: 0.0, max: 2.0, color: "#10b981" },
          { label: "Moderate (2-4%)", min: 2.0, max: 4.0, color: "#f59e0b" },
          { label: "Elevated (4-6%)", min: 4.0, max: 6.0, color: "#ef4444" },
        ],
      };

    case "map_tracer":
      return {
        type: "map_tracer",
        title: "Maritime Trade Diversion",
        subtitle: "Cape of Good Hope Route Shift",
        region: "supply_chain_straits",
        spotlightNote: "Suez Canal volume down 68% YoY",
        waypoints: [
          { id: "w1", name: "Shanghai Port", coords: [75, 45], status: "origin", value: "Origin Hub" },
          { id: "w2", name: "Bab el-Mandeb", coords: [52, 58], status: "chokepoint", value: "Chokepoint" },
          { id: "w3", name: "Cape of Good Hope", coords: [45, 85], status: "transit", value: "+14 Days" },
          { id: "w4", name: "Rotterdam", coords: [42, 25], status: "destination", value: "Destination" },
        ],
        routes: [
          { id: "r1", fromId: "w1", toId: "w3", label: "Diverted Route (+3,500 nm)", status: "diverted" },
          { id: "r2", fromId: "w3", toId: "w4", label: "Atlantic Transit", status: "diverted" },
        ],
      };

    case "spec_matrix":
      return {
        type: "spec_matrix",
        title: "Silicon Architecture Shootout",
        subtitle: "Next-Gen AI Compute Benchmarks",
        itemA: { title: "Apple M4 Max", badge: "3nm Enhanced", subtitle: "Unified Memory" },
        itemB: { title: "Snapdragon X Elite", badge: "ARMv9 Oryon", subtitle: "Copilot+ PC" },
        verdict: "Apple maintains a 38% advantage in peak GPU AI throughput.",
        rows: [
          { label: "NPU AI Tops", valA: "38 TOPS", valB: "45 TOPS", winner: "B" },
          { label: "Memory Bandwidth", valA: "546 GB/s", valB: "136 GB/s", winner: "A" },
          { label: "Geekbench Single-Core", valA: "3,880", valB: "2,950", winner: "A" },
          { label: "Geekbench Multi-Core", valA: "26,400", valB: "15,800", winner: "A" },
        ],
      };

    case "sparkline":
    default:
      return {
        type: "sparkline",
        symbol: "BTC",
        title: "Bitcoin 30-Day Trajectory",
        currentValue: "$98,400",
        deltaPercentage: "+14.2%",
        isPositive: true,
        timeframe: "30D",
        highAnnotation: "ATH $99,200",
        points: [
          { label: "Day 1", value: 84000 },
          { label: "Day 8", value: 87500 },
          { label: "Day 15", value: 91200 },
          { label: "Day 22", value: 95400 },
          { label: "Day 30", value: 98400 },
        ],
      };
  }
}

/**
 * Heuristic fallback parser when LLM generation fails or is offline.
 */
export function generateFallbackDataStudio(
  articleContent: string,
  personaSlug?: string
): DataStudioPayload {
  const lower = articleContent.toLowerCase();

  let graphicType: DataGraphicType = "sparkline";
  if (lower.includes("versus") || lower.includes("vs") || lower.includes("compared to") || lower.includes("benchmark")) {
    graphicType = "spec_matrix";
  } else if (lower.includes("shipping") || lower.includes("strait") || lower.includes("canal") || lower.includes("route") || lower.includes("geopolitic")) {
    graphicType = "map_tracer";
  } else if (lower.includes("market share") || lower.includes("ranking") || lower.includes("polls") || lower.includes("billion") || lower.includes("trillion")) {
    graphicType = "bar_race";
  } else if (lower.includes("rate") || lower.includes("inflation") || lower.includes("index") || lower.includes("fed") || lower.includes("sentiment")) {
    graphicType = "gauge";
  } else if (lower.includes("stock") || lower.includes("shares") || lower.includes("nasdaq") || lower.includes("trading")) {
    graphicType = "candlestick";
  }

  const defaultGraphic = generateDefaultGraphicConfig(graphicType);

  return {
    studioType: "data_studio",
    outputMode: "video",
    headline: "MARKET UPDATE: TECH & FINANCIAL TELEMETRY",
    summary: "[serious] New data reveals accelerated market momentum as key metrics indicate pivotal macroeconomic shifts.",
    graphicType,
    graphicConfig: defaultGraphic,
    tickers: [
      { symbol: "NVDA", label: "NVIDIA", value: "$138.50", change: "+4.2%", direction: "up" },
      { symbol: "BTC", label: "Bitcoin", value: "$98,400", change: "+2.8%", direction: "up" },
      { symbol: "ETH", label: "Ethereum", value: "$3,650", change: "+1.9%", direction: "up" },
      { symbol: "INFLATION", label: "US CPI", value: "2.8%", change: "-0.1%", direction: "up" },
    ],
    personaId: personaSlug || "ruby",
  };
}
