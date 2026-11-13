/**
 * Stock Asset Pipeline — Unified search + DB caching + storage download.
 *
 * Tries providers in configurable priority order until results are found.
 * Caches search results in the StockAsset table to avoid re-fetching.
 * Downloads assets to the storage abstraction layer for use in Remotion.
 */

import { prisma } from "@/lib/prisma";
import type { StockAsset } from "@prisma/client";
import { storage, withTenant } from "@/lib/storage";
import type { StockProvider, StockResult, StockSearchOptions } from "./types";
import { PexelsProvider } from "./pexels";
import { PixabayProvider } from "./pixabay";
import { createLogger } from "@/lib/logger";

const log = createLogger("stock:index");

// ============================================================
// Provider Registry
// ============================================================

/** All known providers — new providers are registered here */
const ALL_PROVIDERS: Record<string, () => StockProvider> = {
  pexels: () => new PexelsProvider(),
  pixabay: () => new PixabayProvider(),
  // Future: unsplash, coverr, mixkit, videvo, pxhere
};

/**
 * Get providers in priority order based on env config.
 * Falls back to ["pexels", "pixabay"] if not configured.
 */
function getProviderPriority(): string[] {
  const envPriority = process.env.STOCK_PROVIDER_PRIORITY;
  if (envPriority) {
    return envPriority.split(",").map((s) => s.trim().toLowerCase());
  }
  return ["pexels", "pixabay"];
}

/**
 * Instantiate providers in priority order, filtering to only available ones.
 */
function getActiveProviders(): StockProvider[] {
  const priority = getProviderPriority();
  const providers: StockProvider[] = [];

  for (const name of priority) {
    const factory = ALL_PROVIDERS[name];
    if (factory) {
      const provider = factory();
      if (provider.isAvailable()) {
        providers.push(provider);
      }
    }
  }

  return providers;
}

// ============================================================
// Cache Configuration
// ============================================================

/** How long to consider cached results valid (24 hours) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Public API
// ============================================================

/**
 * Search for stock assets across all configured providers.
 * Tries providers in priority order, returns first successful result set.
 * Results are cached in the StockAsset DB table.
 *
 * @param query Search keywords
 * @param options Search filters
 * @returns Array of stock results
 */
export async function searchStock(
  query: string,
  options?: StockSearchOptions,
): Promise<StockResult[]> {
  const type = options?.type ?? "video";

  // Helper function to search across cache and providers for a query
  const runSearch = async (q: string): Promise<StockResult[]> => {
    // 1. Check DB cache first
    const cached = await getCachedResults(q, type);
    if (cached.length > 0) {
      return cached;
    }

    // 2. Search providers in priority order
    const providers = getActiveProviders();

    for (const provider of providers) {
      try {
        const results = await provider.search(q, options);
        if (results.length > 0) {
          // Cache results in DB
          await cacheResults(q, results);
          return results;
        }
      } catch (err) {
        console.error(
          `[Stock Search] Provider ${provider.name} failed for "${q}":`,
          err,
        );
      }
    }
    return [];
  };

  // 1. Try the primary query
  let results = await runSearch(query);
  if (results.length > 0) return results;

  // 2. Failover: Relax to individual words from the query if it has multiple words
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 1) {
    log.info(
      `[Stock Search] Primary search failed. Relaxing query "${query}" to individual words...`,
    );
    for (const word of words) {
      results = await runSearch(word);
      if (results.length > 0) {
        log.info(
          `[Stock Search] Found stock assets using relaxed single-word query: "${word}"`,
        );
        return results;
      }
    }
  }

  // 3. Failover: Try generic terms
  log.info(
    `[Stock Search] Word-based search failed. Trying generic query "abstract background"...`,
  );
  results = await runSearch("abstract background");
  if (results.length > 0) return results;

  // 4. Ultimate Fallback: Try generic term "office workspace"
  results = await runSearch("office workspace");
  return results;
}

/**
 * Download a stock asset to the storage layer and return the storage key.
 * Also creates/updates the StockAsset DB record with usedCount.
 *
 * @param result The stock result to download
 * @param companyId The owning tenant — keys are namespaced under tenants/{companyId}/
 * @param segmentKey Optional key prefix (e.g., "broll/story-abc/seg-0")
 * @returns The tenant-scoped storage key where the asset was saved
 */
export async function downloadToStorage(
  result: StockResult,
  companyId: string,
  segmentKey?: string,
): Promise<string> {
  const extension = result.type === "video" ? "mp4" : "jpg";
  const key = withTenant(
    companyId,
    segmentKey
      ? `${segmentKey}.${extension}`
      : `stock/${result.provider}/${result.externalId}.${extension}`,
  );

  // Check if already downloaded
  const exists = await storage.exists(key);
  if (exists) {
    await updateUsageCount(result);
    return key;
  }

  // Download the asset
  const response = await fetch(result.downloadUrl, {
    signal: AbortSignal.timeout(60000), // 60s timeout for large video files
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download stock asset: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = result.type === "video" ? "video/mp4" : "image/jpeg";

  await storage.upload(key, buffer, contentType);
  await updateUsageCount(result);

  return key;
}

// ============================================================
// DB Cache Helpers
// ============================================================

async function getCachedResults(
  query: string,
  type: string,
): Promise<StockResult[]> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS);

  const cached = await prisma.stockAsset.findMany({
    where: {
      query: query.toLowerCase(),
      type,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (cached.length === 0) return [];

  return cached.map((row: StockAsset) => ({
    externalId: row.externalId,
    provider: row.provider,
    type: row.type as "video" | "photo",
    url: row.url,
    previewUrl: row.previewUrl ?? row.url,
    downloadUrl: row.downloadUrl,
    width: row.width ?? 0,
    height: row.height ?? 0,
    duration: row.duration ?? undefined,
    license: row.license ?? "unknown",
  }));
}

async function cacheResults(
  query: string,
  results: StockResult[],
): Promise<void> {
  const data = results.map((r) => ({
    provider: r.provider,
    externalId: r.externalId,
    query: query.toLowerCase(),
    type: r.type,
    url: r.url,
    previewUrl: r.previewUrl,
    downloadUrl: r.downloadUrl,
    width: r.width,
    height: r.height,
    duration: r.duration ?? null,
    license: r.license,
  }));

  // Use createMany with skipDuplicates to avoid constraint violations
  // on re-caching the same external IDs from the same provider
  await prisma.stockAsset.createMany({
    data,
    skipDuplicates: true,
  });
}

async function updateUsageCount(result: StockResult): Promise<void> {
  const existing = await prisma.stockAsset.findFirst({
    where: {
      provider: result.provider,
      externalId: result.externalId,
    },
  });

  if (existing) {
    await prisma.stockAsset.update({
      where: { id: existing.id },
      data: {
        usedCount: existing.usedCount + 1,
        lastUsedAt: new Date(),
      },
    });
  }
}

/**
 * Download an arbitrary external URL (like crawled article images) to the storage layer
 * to bypass CORS and hotlinking restrictions in the browser.
 *
 * @param url The external URL to download
 * @param storageKey The destination storage key (e.g. "broll/story-123/seg-0.jpg")
 * @returns The storage key where the asset was saved
 */
export async function downloadExternalAssetToStorage(
  url: string,
  storageKey: string,
): Promise<string> {
  const exists = await storage.exists(storageKey);
  if (exists) {
    return storageKey;
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download external asset: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await storage.upload(storageKey, buffer, contentType);
  return storageKey;
}

export type { StockProvider, StockResult, StockSearchOptions } from "./types";
