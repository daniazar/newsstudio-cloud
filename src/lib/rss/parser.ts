import RssParser from "rss-parser";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { StoryInput, IngestResult } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("rss:parser");

// Singleton parser instance
let parserInstance: RssParser | null = null;

function getParser(): RssParser {
  if (!parserInstance) {
    parserInstance = new RssParser({
      timeout: 10000,
      headers: {
        Accept:
          "application/rss+xml, application/xml, text/xml, application/atom+xml",
      },
    });
  }
  return parserInstance;
}

/**
 * Normalize a raw RSS item into our StoryInput format.
 * Handles missing fields gracefully.
 */
export function normalizeStoryInput(
  item: RssParser.Item,
  feedId: string
): StoryInput {
  return {
    title: item.title?.trim() ?? "Untitled",
    link: item.link?.trim() ?? "",
    description: item.contentSnippet?.trim() ?? item.content?.trim() ?? "",
    author: item.creator ?? (item as Record<string, string>)["dc:creator"] ?? undefined,
    pubDate: item.isoDate ? new Date(item.isoDate) : undefined,
    guid: item.guid?.trim() ?? item.link?.trim() ?? `${Date.now()}-${Math.random()}`,
    category: item.categories?.[0] ?? undefined,
    feedId,
  };
}

/**
 * Parse a single RSS feed and return normalized story items.
 * Gracefully returns empty array on failure.
 */
export async function parseFeed(
  url: string,
  feedId: string,
  parser?: RssParser
): Promise<StoryInput[]> {
  const rssParser = parser ?? getParser();

  try {
    const feed = await rssParser.parseURL(url);
    return (feed.items ?? []).map((item) => normalizeStoryInput(item, feedId));
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error(`Failed to parse feed ${url}: ${errorMsg}`);
    return [];
  }
}

import { deduplicateStoriesSemantically } from "@/lib/ai/semanticDeduplicator";
import type { AnyEmbeddingModel } from "@/lib/llm/aiSdkGateway";

/**
 * Filter out stories whose guids or links already exist in the database,
 * and optionally deduplicate semantically across recent stories and intra-batch wire reports.
 */
export async function deduplicateStories(
  stories: StoryInput[],
  options?: {
    semantic?: boolean;
    similarityThreshold?: number;
    companyId?: string;
    customEmbeddingModel?: AnyEmbeddingModel;
  }
): Promise<StoryInput[]> {
  if (stories.length === 0) return [];

  const guids = stories.map((s) => s.guid).filter(Boolean);
  const links = stories.map((s) => s.link).filter(Boolean);

  const existing = await prisma.story.findMany({
    where: {
      OR: [
        { guid: { in: guids } },
        { link: { in: links } },
      ],
    },
    select: { guid: true, link: true },
  });

  const existingList = Array.isArray(existing) ? existing : [];
  const existingGuids = new Set(existingList.map((e) => e.guid).filter(Boolean));
  const existingLinks = new Set(existingList.map((e) => e.link).filter(Boolean));

  // Step 1: Filter out stories that already exist in DB by guid or link
  const nonDbStories = stories.filter(
    (s) => !existingGuids.has(s.guid) && (!s.link || !existingLinks.has(s.link))
  );

  // Step 1b: Intra-batch deduplication by exact guid and link
  const seenGuids = new Set<string>();
  const seenLinks = new Set<string>();
  const exactUnique: StoryInput[] = [];
  for (const s of nonDbStories) {
    if (s.guid && seenGuids.has(s.guid)) continue;
    if (s.link && seenLinks.has(s.link)) continue;
    if (s.guid) seenGuids.add(s.guid);
    if (s.link) seenLinks.add(s.link);
    exactUnique.push(s);
  }

  // If semantic dedup is not explicitly requested, return immediately without extra DB queries!
  if (!options?.semantic) {
    return exactUnique;
  }

  // If exact deduplication already filtered out everything, return immediately without querying DB!
  if (exactUnique.length === 0) {
    return [];
  }

  // Step 2: Semantic Deduplication against recent stories in DB + intra-batch
  let recentDbStories: Array<{ title: string; description?: string | null }> = [];
  try {
    const fetched = await prisma.story.findMany({
      where: options.companyId ? { companyId: options.companyId } : undefined,
      take: 100,
      orderBy: { createdAt: "desc" },
      select: { title: true, description: true },
    });
    if (Array.isArray(fetched)) {
      recentDbStories = fetched;
    }
  } catch {
    recentDbStories = [];
  }

  const result = await deduplicateStoriesSemantically(
    exactUnique,
    recentDbStories,
    {
      threshold: options.similarityThreshold,
      companyId: options.companyId,
      customEmbeddingModel: options.customEmbeddingModel,
    }
  );

  return result.unique;
}

/**
 * Ingest all active feeds: fetch, normalize, deduplicate, and store.
 * Uses Promise.allSettled so one failing feed doesn't block the rest.
 */
export async function ingestFeeds(
  feedIds?: string[],
  companyId?: string,
  options?: {
    semantic?: boolean;
    similarityThreshold?: number;
    customEmbeddingModel?: AnyEmbeddingModel;
  }
): Promise<IngestResult[]> {
  // Get feeds from DB
  const whereClause: Prisma.RssFeedWhereInput = feedIds
    ? { id: { in: feedIds }, isActive: true }
    : { isActive: true };

  if (companyId) {
    whereClause.companyId = companyId;
  }

  const feeds = await prisma.rssFeed.findMany({ where: whereClause });

  // 1. Fetch and parse all feeds concurrently
  const parseResults = await Promise.allSettled(
    feeds.map(async (feed) => {
      const stories = await parseFeed(feed.url, feed.id);
      return { feed, stories };
    })
  );

  const finalResults: IngestResult[] = [];
  const allStoriesToDeduplicate: StoryInput[] = [];

  // Gather successful parses
  parseResults.forEach((r) => {
    if (r.status === "fulfilled") {
      allStoriesToDeduplicate.push(...r.value.stories);
    }
  });

  // 2. Deduplicate all stories in ONE query (eliminates N+1 query issue)
  const enableSemantic =
    options?.semantic === true ||
    (options?.semantic !== false && process.env.NODE_ENV !== "test");

  const newStories = await deduplicateStories(allStoriesToDeduplicate, {
    semantic: enableSemantic,
    similarityThreshold: options?.similarityThreshold,
    companyId,
    customEmbeddingModel: options?.customEmbeddingModel,
  });

  // Group new stories by feedId for result reporting
  const newStoriesByFeedId = newStories.reduce((acc, story) => {
    if (!acc[story.feedId]) acc[story.feedId] = [];
    acc[story.feedId].push(story);
    return acc;
  }, {} as Record<string, StoryInput[]>);

  const allNewMappedStories: Prisma.StoryCreateManyInput[] = [];

  // 3. Construct results
  parseResults.forEach((r, i) => {
    const feed = feeds[i];
    if (r.status === "fulfilled") {
      const parsedStoriesCount = r.value.stories.length;
      const feedNewStories = newStoriesByFeedId[feed.id] || [];

      finalResults.push({
        feedId: feed.id,
        feedName: feed.name,
        totalItems: parsedStoriesCount,
        newItems: feedNewStories.length,
        skippedItems: parsedStoriesCount - feedNewStories.length,
        errors: [],
      });

      allNewMappedStories.push(
        ...feedNewStories.map((s) => ({
          companyId: feed.companyId,
          feedId: s.feedId,
          title: s.title,
          link: s.link,
          description: s.description,
          author: s.author,
          pubDate: s.pubDate,
          guid: s.guid,
          category: s.category,
          status: "INGESTED",
        }))
      );
    } else {
      const reasonMsg = r.reason instanceof Error ? r.reason.message : String(r.reason ?? "Unknown error");
      finalResults.push({
        feedId: feed.id,
        feedName: feed.name,
        totalItems: 0,
        newItems: 0,
        skippedItems: 0,
        errors: [reasonMsg],
      });
    }
  });

  // 4. Bulk insert new stories
  if (allNewMappedStories.length > 0) {
    await prisma.story.createMany({
      data: allNewMappedStories,
    });
  }

  return finalResults;
}
