/**
 * src/lib/ai/editorialTools.ts
 *
 * Reusable Editorial & Investigative AI SDK Tool Registry.
 *
 * Provides 3 fast, fault-tolerant, tenant-scoped tools designed for multi-step
 * autonomous editorial reasoning loops across Fact-Checker, Situation Room, and Research Radar:
 * 1. searchIngestedWireArticles: Tenant-scoped keyword search over ingested RSS wire articles.
 * 2. lookupPronunciationGlossary: Real-time phonetic pronunciation lookup with offline broadcast hints.
 * 3. verifyStockBrollKeywords: Normalizes visual B-roll terms against broadcast suitability and provider readiness.
 */

import { z } from "zod";
import { tool, type ToolSet } from "ai";
import type { TavilyClient } from "@tavily/core";
import { prisma } from "@/lib/prisma";
import { searchLiveWeb } from "@/lib/search/webSearchClient";

export interface EditorialToolsOptions {
  companyId?: string | null;
  webSearchClientOverride?: Pick<TavilyClient, "search">;
}

// Built-in phonetic guidance for frequent broadcast acronyms, tickers, and geographic toponyms
const BUILTIN_BROADCAST_PHONETICS: Record<string, string> = {
  // Global & Seismic Monitors
  USGS: "U-S-G-S",
  NOAA: "NO-ah",
  NASA: "NA-sa",
  NATO: "NAY-toe",
  OTAN: "Oh-TAHN",
  FMI: "Efe-Eme-EE",
  IMF: "I-M-F",
  UN: "U-N",
  ONU: "Oh-NOO",
  WHO: "W-H-O",
  CDC: "C-D-C",
  SEC: "S-E-C",
  FED: "Fed",
  ECB: "E-C-B",
  BCRA: "Be-Se-Erre-Ah",
  YPF: "Ee-Pe-Efe",
  CEO: "C-E-O",
  CFO: "C-F-O",
  CTO: "C-T-O",
  IPO: "I-P-O",
  GDP: "G-D-P",
  CPI: "C-P-I",
  AI: "A-I",
  GPU: "G-P-U",
  CPU: "C-P-U",
  LLM: "L-L-M",
  TSMC: "T-S-M-C",
  ASML: "A-S-M-L",
  NVDA: "En-VID-ee-ah",
  AAPL: "Apple",
  MSFT: "Microsoft",
  GOOGL: "Google",
  AMZN: "Amazon",

  // Toponyms & Regions
  SENDAI: "SEN-dye",
  TOHOKU: "TOH-ho-koo",
  FUKUSHIMA: "Foo-koo-SHEE-mah",
  TOKYO: "TOH-kyoh",
  KYIV: "KEE-yeev",
  BUENOS_AIRES: "BWAY-nohs EYE-rehs",
  REYKJAVIK: "RAY-kya-veek",
  TAIPEI: "Tye-PAY",
  BEIJING: "Bay-JING",
  JAKARTA: "Jah-KAR-tah",
  VALPARAISO: "Vahl-pah-rah-EE-soh",
  SANTIAGO: "Sahn-TYAH-goh",
  BOGOTA: "Boh-goh-TAH",
  MEDELLIN: "Meh-deh-YEEN",
  OAXACA: "Wah-HAH-kah",
};

const BUILTIN_BROADCAST_ENTRIES = Object.entries(BUILTIN_BROADCAST_PHONETICS).sort(
  (a, b) => b[0].length - a[0].length
);

// Abstract concepts mapped to concrete broadcast video visuals
const ABSTRACT_TO_CONCRETE_MAP: Record<string, string[]> = {
  economy: ["stock exchange trading floor", "financial charts on monitor", "bank headquarters exterior"],
  economic: ["financial charts on trading screen", "container shipping terminal", "business district timelapse"],
  finance: ["trading desks with multi-monitor displays", "currency exchange counter", "financial district skyline"],
  inflation: ["supermarket checkout price scanner", "grocery store shopping cart", "consumer goods aisle"],
  growth: ["container port cargo cranes", "modern factory automated assembly line", "bustling commercial boulevard"],
  crisis: ["emergency vehicle flashing sirens", "empty downtown streets", "government press podium microphones"],
  technology: ["modern data center server racks with blue LEDs", "microchip wafer macro", "engineer coding at workstation"],
  tech: ["data center blinking lights", "circuit board microphotography", "laptop screen with scrolling code"],
  ai: ["server rack room with glowing indicators", "robotic arm in lab", "deep learning data visualization"],
  geopolitics: ["international summit flags", "capitol building dome", "diplomatic bilateral meeting room"],
  geopolitical: ["un security council chamber", "embassy exterior flags", "press briefing podium"],
  earthquake: ["seismograph recording needle oscillation", "emergency first responders", "cracked pavement and inspection teams"],
  seismic: ["seismograph digital display", "emergency command vehicle", "rubble inspection crew"],
  weather: ["doppler radar animation", "storm clouds rolling over horizon", "rain lashed highway with headlights"],
  wildfire: ["firefighting helicopter water drop", "emergency vehicle lights through smoke", "satellite thermal anomaly map"],
  earnings: ["corporate boardroom presentation", "financial earnings report spreadsheet", "stock ticker display"],
  regulation: ["courthouse columns", "gavel on sound block", "government regulatory agency exterior"],
};

/**
 * Creates tenant-scoped, fault-tolerant editorial tools for use with Vercel AI SDK v7.
 */
export function createEditorialTools(options?: EditorialToolsOptions): ToolSet {
  const companyId = options?.companyId;

  return {
    searchIngestedWireArticles: tool({
      description:
        "Searches local ingested RSS wire articles and news archive to cross-reference facts, verify past alerts, or corroborate claims.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Keywords or phrase to match against article title, description, or content"),
        keywords: z
          .string()
          .optional()
          .describe("Alternative alias for search keywords"),
        category: z
          .string()
          .optional()
          .describe("Optional news category filter (e.g. Technology, Business, Geopolitics, Science)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe("Maximum number of articles to return (1-10, default: 5)"),
      }),
      execute: async ({ query, keywords, category, limit = 5 }) => {
        try {
          if (!prisma || !prisma.story || typeof prisma.story.findMany !== "function") {
            return { matches: [], note: "Archive unavailable" };
          }

          const searchTerm = (query || keywords || "").trim();
          const whereClause: Record<string, unknown> = {};

          if (companyId) {
            whereClause.companyId = companyId;
          }

          if (category && category.trim()) {
            whereClause.category = { contains: category.trim() };
          }

          if (searchTerm) {
            const words = searchTerm
              .split(/\s+/)
              .map((w) => w.trim())
              .filter((w) => w.length >= 3);

            const orConditions: Array<Record<string, unknown>> = [
              { title: { contains: searchTerm } },
              { description: { contains: searchTerm } },
              { fullContent: { contains: searchTerm } },
            ];

            for (const word of words) {
              if (word.toLowerCase() !== searchTerm.toLowerCase()) {
                orConditions.push(
                  { title: { contains: word } },
                  { description: { contains: word } },
                  { fullContent: { contains: word } }
                );
              }
            }

            whereClause.OR = orConditions;
          }

          const stories = await prisma.story.findMany({
            where: whereClause,
            take: Math.min(Math.max(1, limit), 10),
            orderBy: { pubDate: "desc" },
            select: {
              id: true,
              title: true,
              category: true,
              pubDate: true,
              link: true,
              description: true,
              fullContent: true,
            },
          });

          return {
            matches: stories.map((s) => ({
              id: s.id,
              title: s.title,
              category: s.category || "General",
              pubDate: s.pubDate ? s.pubDate.toISOString() : null,
              link: s.link,
              excerpt: (s.fullContent || s.description || "").slice(0, 300),
            })),
            total: stories.length,
          };
        } catch {
          return { matches: [], note: "Archive unavailable" };
        }
      },
    }),

    lookupPronunciationGlossary: tool({
      description:
        "Looks up broadcast phonetic pronunciation guidance and expansions for proper nouns, acronyms, tickers, and toponyms.",
      inputSchema: z.object({
        terms: z
          .array(z.string())
          .describe("List of terms, place names, tickers, or acronyms to look up"),
        language: z
          .string()
          .optional()
          .default("en")
          .describe("Target broadcast language ('en' or 'es', default: 'en')"),
      }),
      execute: async ({ terms, language = "en" }) => {
        let remoteGlossary: Record<string, string> = {};
        const isTestEnv = process.env.NODE_ENV === "test";
        const customServerUrl = process.env.MODERN_TTS_SERVER_URL;
        const shouldFetchRemote =
          (!isTestEnv || Boolean(customServerUrl)) && typeof globalThis.fetch === "function";

        if (shouldFetchRemote) {
          try {
            const baseUrl = (customServerUrl || "http://localhost:8005").replace(/\/+$/, "");
            const candidates = baseUrl.endsWith("/api")
              ? [`${baseUrl}/glossary`, baseUrl]
              : [`${baseUrl}/api/glossary`, `${baseUrl}/glossary`];

            let res: Response | null = null;
            for (const url of candidates) {
              try {
                const candidateRes = await fetch(url, { signal: AbortSignal.timeout(1200) });
                if (candidateRes.ok) {
                  res = candidateRes;
                  break;
                }
              } catch {
                // Try next endpoint candidate
              }
            }

            if (res && res.ok) {
              const data = await res.json();
              if (data && typeof data === "object") {
                const root =
                  "glossary" in data && typeof (data as { glossary: unknown }).glossary === "object"
                    ? ((data as { glossary: Record<string, unknown> }).glossary)
                    : (data as Record<string, unknown>);

                if (root && root[language] && typeof root[language] === "object") {
                  const langRules = root[language] as Record<string, unknown>;
                  const defaultRules =
                    typeof langRules.default === "object" && langRules.default !== null
                      ? (langRules.default as Record<string, string>)
                      : {};
                  remoteGlossary = { ...defaultRules, ...(langRules as Record<string, string>) };
                } else if (root) {
                  remoteGlossary = root as Record<string, string>;
                }
              }
            }
          } catch {
            // Modern-TTS-Server offline or timeout — gracefully proceed with built-in hints
          }
        }

        const pronunciations: Record<string, string> = {};

        for (const term of terms) {
          const trimmed = term.trim();
          if (!trimmed) continue;

          // 1. Check remote glossary exact match
          if (remoteGlossary[trimmed]) {
            pronunciations[trimmed] = remoteGlossary[trimmed];
            continue;
          }

          // 2. Normalize key for built-in table
          const normalizedKey = trimmed.toUpperCase().replace(/\s+/g, "_");
          if (BUILTIN_BROADCAST_PHONETICS[normalizedKey]) {
            pronunciations[trimmed] = BUILTIN_BROADCAST_PHONETICS[normalizedKey];
            continue;
          }

          // 2.1 Multi-word toponym or phrase matching (e.g. "City of Buenos Aires" or "Sendai, Japan")
          let matchedToponymPhonetic: string | undefined;
          for (const [key, phonetic] of BUILTIN_BROADCAST_ENTRIES) {
            const pattern = new RegExp(`\\b${key.replace(/_/g, "[\\s_]+")}\\b`, "i");
            if (pattern.test(trimmed)) {
              matchedToponymPhonetic = phonetic;
              break;
            }
          }
          if (matchedToponymPhonetic) {
            pronunciations[trimmed] = matchedToponymPhonetic;
            continue;
          }

          // 3. Fallback: Hyphenate all-caps acronyms (e.g., "USGS" -> "U-S-G-S")
          if (/^[A-Z0-9]{2,6}$/.test(trimmed)) {
            pronunciations[trimmed] = trimmed.split("").join("-");
            continue;
          }

          // 4. Default: word is clear as-is
          pronunciations[trimmed] = trimmed;
        }

        return {
          pronunciations,
          source: Object.keys(remoteGlossary).length > 0 ? "modern-tts-server" : "broadcast-builtin",
          language,
        };
      },
    }),

    verifyStockBrollKeywords: tool({
      description:
        "Validates candidate B-roll visual search terms, filters abstract concepts into concrete visual shots, and checks stock asset provider readiness.",
      inputSchema: z.object({
        keywords: z
          .array(z.string())
          .describe("Candidate B-roll search terms or conceptual topics"),
      }),
      execute: async ({ keywords }) => {
        const validatedKeywords: string[] = [];
        const suggestions: Record<string, string[]> = {};

        for (const rawKw of keywords) {
          const kw = rawKw.trim().toLowerCase();
          if (!kw || kw.length < 2) continue;

          if (ABSTRACT_TO_CONCRETE_MAP[kw]) {
            suggestions[rawKw] = ABSTRACT_TO_CONCRETE_MAP[kw];
            // Push the first concrete suggestion as primary validated visual
            validatedKeywords.push(ABSTRACT_TO_CONCRETE_MAP[kw][0]);
          } else {
            // Already a concrete or neutral keyword
            validatedKeywords.push(rawKw);
          }
        }

        const priority = (process.env.STOCK_PROVIDER_PRIORITY || "pexels,pixabay")
          .split(",")
          .map((p) => p.trim().toLowerCase())
          .filter(Boolean);

        const availableProviders: string[] = [];
        if (process.env.PEXELS_API_KEY) availableProviders.push("pexels");
        if (process.env.PIXABAY_API_KEY) availableProviders.push("pixabay");

        return {
          validatedKeywords,
          suggestions,
          availableProviders,
          priority,
        };
      },
    }),

    searchLiveBreakingWeb: tool({
      description:
        "Searches the live external web and breaking news wires for facts, real-time developments, quotes, and official source citations.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .describe("Search query to investigate breaking news or external facts on the live web"),
        topic: z
          .enum(["news", "general", "finance"])
          .optional()
          .default("news")
          .describe("Search vertical: 'news' for current events, 'finance' for markets, or 'general'"),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe("Maximum number of citations to return (1-10, default: 5)"),
        timeRange: z
          .enum(["day", "week", "month", "year"])
          .optional()
          .describe("Timeframe filter: 'day' for breaking 24h news, 'week', 'month', 'year'"),
        includeDomains: z
          .array(z.string())
          .optional()
          .describe("Optional whitelist of domains to include (e.g. ['reuters.com', 'bloomberg.com'])"),
        excludeDomains: z
          .array(z.string())
          .optional()
          .describe("Optional blacklist of domains to exclude"),
      }),
      execute: async ({ query, topic = "news", maxResults = 5, timeRange, includeDomains, excludeDomains }) => {
        return searchLiveWeb({
          query,
          topic,
          maxResults,
          timeRange,
          includeDomains,
          excludeDomains,
          companyId,
          clientOverride: options?.webSearchClientOverride,
        });
      },
    }),
  };
}
