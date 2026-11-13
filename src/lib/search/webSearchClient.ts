/**
 * src/lib/search/webSearchClient.ts
 *
 * SSRF-Safe Live Web Search Client for NewsStudio Editorial Reasoning Loops.
 * Wraps @tavily/core with:
 * - Deterministic BYOK credential resolution (tenant BYOK -> system setting -> env)
 * - Strict URL sanitization against SSRF, loopback, cloud metadata, and private CIDRs
 * - Domain whitelist and blacklist defensive filtering
 * - Timeout handling and structured logging with zero unhandled exceptions
 */

import { tavily, type TavilyClient, type TavilySearchOptions } from "@tavily/core";
import { resolveTavilyApiKey } from "@/lib/tenant/credentials";
import { isPrivateOrReservedIp, isPrivateOrReservedIpv6 } from "@/lib/security/ssrf";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "webSearchClient" });

export interface WebSearchCitation {
  title: string;
  url: string;
  publishedDate: string | null;
  score: number;
  snippet: string;
}

export interface LiveWebSearchParams {
  query: string;
  companyId?: string | null;
  apiKey?: string | null;
  topic?: "news" | "general" | "finance";
  searchDepth?: "basic" | "advanced" | "fast" | "ultra-fast";
  maxResults?: number;
  days?: number;
  timeRange?: "day" | "week" | "month" | "year";
  includeAnswer?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  timeoutMs?: number;
  clientOverride?: Pick<TavilyClient, "search">;
}

export interface LiveWebSearchResult {
  available: boolean;
  query: string;
  answer?: string;
  results: WebSearchCitation[];
  reason?: string;
}

/**
 * Validates a search citation URL against SSRF, loopback, cloud metadata, and domain filters.
 */
function isSafeCitationUrl(
  urlStr: string,
  includeDomains?: string[],
  excludeDomains?: string[]
): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return false;
  }

  if (
    hostname === "metadata.google.internal" ||
    hostname === "instance-data" ||
    hostname === "169.254.169.254" ||
    hostname === "fd00:ec2::254"
  ) {
    return false;
  }

  if (isPrivateOrReservedIp(hostname) || isPrivateOrReservedIpv6(hostname)) {
    return false;
  }

  if (includeDomains && includeDomains.length > 0) {
    const matchesInclude = includeDomains.some((d) => {
      const cleanDomain = d.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
      return hostname === cleanDomain || hostname.endsWith(`.${cleanDomain}`);
    });
    if (!matchesInclude) return false;
  }

  if (excludeDomains && excludeDomains.length > 0) {
    const matchesExclude = excludeDomains.some((d) => {
      const cleanDomain = d.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
      return hostname === cleanDomain || hostname.endsWith(`.${cleanDomain}`);
    });
    if (matchesExclude) return false;
  }

  return true;
}

/**
 * Executes an SSRF-safe live web search using Tavily.
 * Returns structured citations without throwing exceptions.
 */
export async function searchLiveWeb(
  params: LiveWebSearchParams
): Promise<LiveWebSearchResult> {
  const trimmedQuery = (params.query || "").trim();
  if (!trimmedQuery) {
    return {
      available: true,
      query: "",
      results: [],
      reason: "Empty search query",
    };
  }

  let client: Pick<TavilyClient, "search">;
  if (params.clientOverride) {
    client = params.clientOverride;
  } else {
    const apiKey = params.apiKey ?? (await resolveTavilyApiKey(params.companyId));
    if (!apiKey) {
      return {
        available: false,
        query: trimmedQuery,
        results: [],
        reason: "TAVILY_API_KEY not configured",
      };
    }
    client = tavily({ apiKey });
  }

  const timeoutMs = params.timeoutMs ?? 10_000;
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Web search timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();
  });

  try {
    const searchOptions: TavilySearchOptions = {
      topic: params.topic ?? "news",
      searchDepth: params.searchDepth ?? "basic",
      maxResults: params.maxResults ?? 5,
    };

    if (params.days !== undefined) searchOptions.days = params.days;
    if (params.timeRange !== undefined) searchOptions.timeRange = params.timeRange;
    if (params.includeAnswer !== undefined) searchOptions.includeAnswer = params.includeAnswer;
    if (params.includeDomains !== undefined) searchOptions.includeDomains = params.includeDomains;
    if (params.excludeDomains !== undefined) searchOptions.excludeDomains = params.excludeDomains;

    const searchExecution = client.search(trimmedQuery, searchOptions);
    const response = await Promise.race([searchExecution, timeoutPromise]);

    const results: WebSearchCitation[] = [];
    if (Array.isArray(response?.results)) {
      for (const r of response.results) {
        if (!r || typeof r.url !== "string") continue;
        if (!isSafeCitationUrl(r.url, params.includeDomains, params.excludeDomains)) {
          continue;
        }

        results.push({
          title: (r.title || "").trim(),
          url: r.url.trim(),
          publishedDate: r.publishedDate ? String(r.publishedDate).trim() : null,
          score: typeof r.score === "number" ? r.score : 0,
          snippet: (r.content || "").trim().slice(0, 600),
        });
      }
    }

    return {
      available: true,
      query: trimmedQuery,
      answer: typeof response?.answer === "string" ? response.answer.trim() : undefined,
      results,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: errMsg, query: trimmedQuery }, "Live web search failed or timed out");
    return {
      available: false,
      query: trimmedQuery,
      results: [],
      reason: errMsg,
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
