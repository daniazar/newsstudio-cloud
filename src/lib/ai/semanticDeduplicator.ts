/**
 * src/lib/ai/semanticDeduplicator.ts
 *
 * Unified Semantic Story Deduplication & Thematic Clustering Engine.
 * Features:
 *   - Cross-wire semantic deduplication (Reuters, AP, BBC reporting same breaking story)
 *   - Single-call vector batching via embedLlmMany (guaranteed identical dimensionality)
 *   - Zero-downtime deterministic lexical fallback (computeLexicalSimilarity)
 *   - Centroid-based agglomerative semantic clustering into broadcast StoryCluster[]
 */

import {
  embedLlmMany,
  cosineSimilarity,
  type AnyEmbeddingModel,
} from "@/lib/llm/aiSdkGateway";
import type { IngestedArticle } from "./autonomousIngest";
import type { StoryCluster } from "./roundupSynthesizer";

export interface SemanticDedupOptions {
  threshold?: number; // default: 0.86
  lexicalThreshold?: number; // default: 0.80
  companyId?: string | null;
  customEmbeddingModel?: AnyEmbeddingModel;
}

export interface SemanticDedupResult<T> {
  unique: T[];
  skippedCount: number;
  duplicates: Array<{ item: T; matchedTitle: string; similarity: number }>;
  method: "embedding" | "lexical-fallback";
}

export interface SemanticClusterOptions {
  maxClusters?: number; // default: 5
  similarityThreshold?: number; // default: 0.72
  companyId?: string | null;
  customEmbeddingModel?: AnyEmbeddingModel;
}

/**
 * Common stopwords across English to filter out uninformative high-frequency tokens.
 */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has",
  "had", "it", "its", "that", "this", "these", "those", "will", "would", "shall", "should",
  "can", "could", "may", "might", "must", "about", "after", "all", "also", "into", "more",
  "than", "then", "their", "there", "they", "we", "he", "she", "you", "who", "which",
  "news", "today", "here", "report", "breaking",
  "if", "so", "do", "no", "up", "my", "me", "go",
]);

function stem(word: string): string {
  if (word.length <= 3) return word;
  return word
    .replace(/(?:ingly|edly|able|ible|ment|ness|tion|sion|ing|ed|es|ly|s)$/, "")
    .trim();
}

/**
 * Checks whether a keyword matches within text respecting word boundaries.
 * Prevents substring false-positives (e.g., 'said' matching 'ai', 'software' matching 'war',
 * 'Sunday' matching 'un', 'approach' matching 'app').
 */
export function matchesWordBoundary(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i");
  return regex.test(text);
}

/**
 * Computes deterministic normalized word-unigram + bigram shingle cosine similarity
 * between two text strings. Returns a score between 0.0 and 1.0.
 */
export function computeLexicalSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0.0;

  const tokenize = (text: string) => {
    const clean = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = clean
      .split(" ")
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
      .map(stem)
      .filter((w) => w.length >= 2);
    const termFreq = new Map<string, number>();

    for (const w of words) {
      termFreq.set(w, (termFreq.get(w) ?? 0) + 1.0);
    }

    // Add bigram shingles with 0.5x weight to reward consecutive phrase matches
    for (let i = 0; i < words.length - 1; i++) {
      const shingle = `${words[i]}_${words[i + 1]}`;
      termFreq.set(shingle, (termFreq.get(shingle) ?? 0) + 0.5);
    }

    return termFreq;
  };

  const freqA = tokenize(textA);
  const freqB = tokenize(textB);

  if (freqA.size === 0 || freqB.size === 0) return 0.0;

  let dotProduct = 0.0;
  let normASq = 0.0;
  let normBSq = 0.0;

  for (const val of freqA.values()) {
    normASq += val * val;
  }
  for (const val of freqB.values()) {
    normBSq += val * val;
  }

  for (const [term, valA] of freqA.entries()) {
    const valB = freqB.get(term);
    if (valB !== undefined) {
      dotProduct += valA * valB;
    }
  }

  const denominator = Math.sqrt(normASq) * Math.sqrt(normBSq);
  if (denominator <= 0) return 0.0;

  const sim = dotProduct / denominator;
  return Math.min(1.0, Math.max(0.0, sim));
}

function extractStoryText(item: unknown): { title: string; fullText: string } {
  if (!item || typeof item !== "object") {
    return { title: "", fullText: "" };
  }
  const obj = item as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const desc =
    typeof obj.description === "string"
      ? obj.description.trim()
      : typeof obj.rawText === "string"
        ? obj.rawText.trim()
        : "";
  const fullText = desc ? `${title}. ${desc}` : title;
  return { title, fullText };
}

/**
 * Generic semantic deduplication engine.
 * Batches candidates + existing stories in ONE single embedLlmMany call,
 * filters out near-duplicates >= threshold, and keeps the fuller candidate on intra-batch duplicates.
 * Falls back cleanly to deterministic lexical cosine similarity if embeddings fail.
 */
export async function deduplicateStoriesSemantically<T>(
  candidates: T[],
  existingStories?: Array<{ title: string; description?: string | null }>,
  options?: SemanticDedupOptions
): Promise<SemanticDedupResult<T>> {
  if (!candidates || candidates.length === 0) {
    return {
      unique: [],
      skippedCount: 0,
      duplicates: [],
      method: "embedding",
    };
  }

  const existingList = existingStories ?? [];
  const existingData = existingList.map((s) => extractStoryText(s));
  const existingTexts = existingData.map((s) => s.fullText);

  const candidateData = candidates.map((c) => extractStoryText(c));
  const candidateTexts = candidateData.map((c) => c.fullText);

  // All texts batched together in ONE single embedLlmMany call
  const allTexts = [...existingTexts, ...candidateTexts];
  // Sanitize empty strings to prevent external embedding APIs (Gemini/Ollama) from throwing 400 Bad Request
  const textsToEmbed = allTexts.map((t) => (t && t.trim().length > 0 ? t.trim() : "untitled story"));

  let embeddings: number[][] | null = null;
  let method: "embedding" | "lexical-fallback" = "embedding";

  try {
    const embedResult = await embedLlmMany({
      values: textsToEmbed,
      companyId: options?.companyId,
      customEmbeddingModel: options?.customEmbeddingModel,
    });
    if (embedResult.embeddings && embedResult.embeddings.length === allTexts.length) {
      embeddings = embedResult.embeddings;
    } else {
      method = "lexical-fallback";
    }
  } catch (err) {
    console.warn(
      "[deduplicateStoriesSemantically] Embedding model unavailable, activating zero-downtime offline lexical fallback:",
      err instanceof Error ? err.message : String(err)
    );
    method = "lexical-fallback";
  }

  const threshold =
    method === "embedding"
      ? (options?.threshold ?? 0.86)
      : (options?.lexicalThreshold ?? 0.80);

  interface AcceptedItem {
    item: T;
    vector?: number[];
    text: string;
    title: string;
  }

  const accepted: AcceptedItem[] = [];
  const duplicates: Array<{ item: T; matchedTitle: string; similarity: number }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const { title: candTitle, fullText: candText } = candidateData[i];
    const candVector =
      method === "embedding" && embeddings ? embeddings[existingTexts.length + i] : undefined;

    // 1. Check against existingStories
    let matchedExisting: { title: string; similarity: number } | null = null;
    for (let e = 0; e < existingList.length; e++) {
      let sim = 0;
      if (method === "embedding" && candVector && embeddings) {
        sim = cosineSimilarity(candVector, embeddings[e]);
      } else {
        const titleSim = computeLexicalSimilarity(candTitle, existingData[e].title);
        const fullSim = computeLexicalSimilarity(candText, existingTexts[e]);
        sim = Math.max(titleSim, fullSim);
      }

      if (sim >= threshold) {
        if (!matchedExisting || sim > matchedExisting.similarity) {
          matchedExisting = { title: existingData[e].title || existingList[e].title, similarity: sim };
        }
      }
    }

    if (matchedExisting) {
      duplicates.push({
        item: candidate,
        matchedTitle: matchedExisting.title,
        similarity: matchedExisting.similarity,
      });
      continue;
    }

    // 2. Check intra-batch semantic duplicates
    const matchingAccepted: Array<{ index: number; similarity: number; item: AcceptedItem }> = [];
    for (let a = 0; a < accepted.length; a++) {
      let sim = 0;
      const priorVec = accepted[a].vector;
      if (method === "embedding" && candVector && priorVec) {
        sim = cosineSimilarity(candVector, priorVec);
      } else {
        const titleSim = computeLexicalSimilarity(candTitle, accepted[a].title);
        const fullSim = computeLexicalSimilarity(candText, accepted[a].text);
        sim = Math.max(titleSim, fullSim);
      }

      if (sim >= threshold) {
        matchingAccepted.push({ index: a, similarity: sim, item: accepted[a] });
      }
    }

    if (matchingAccepted.length > 0) {
      matchingAccepted.sort((x, y) => y.similarity - x.similarity);
      const bestMatch = matchingAccepted[0];
      const maxPriorLength = Math.max(...matchingAccepted.map((m) => m.item.text.length));

      // Keep candidate with fuller text or earlier appearance
      if (candText.length > maxPriorLength) {
        duplicates.push({
          item: bestMatch.item.item,
          matchedTitle: candTitle,
          similarity: bestMatch.similarity,
        });
        accepted[bestMatch.index] = {
          item: candidate,
          vector: candVector,
          text: candText,
          title: candTitle,
        };

        // Prune secondary matches from accepted to prevent duplicates remaining in unique
        if (matchingAccepted.length > 1) {
          const secondary = matchingAccepted.slice(1).sort((a, b) => b.index - a.index);
          for (const m of secondary) {
            duplicates.push({
              item: m.item.item,
              matchedTitle: candTitle,
              similarity: m.similarity,
            });
            accepted.splice(m.index, 1);
          }
        }
      } else {
        duplicates.push({
          item: candidate,
          matchedTitle: bestMatch.item.title,
          similarity: bestMatch.similarity,
        });
      }
      continue;
    }

    // Passed all checks: unique candidate
    accepted.push({
      item: candidate,
      vector: candVector,
      text: candText,
      title: candTitle,
    });
  }

  return {
    unique: accepted.map((a) => a.item),
    skippedCount: duplicates.length,
    duplicates,
    method,
  };
}

export type BroadcastCategory =
  | "ai"
  | "crypto"
  | "markets"
  | "tech"
  | "world"
  | "entertainment"
  | "science";

const CATEGORY_KEYWORDS: Record<BroadcastCategory, string[]> = {
  ai: [
    "ai", "artificial intelligence", "llm", "gemini", "openai", "gpt", "model",
    "anthropic", "robot", "neural", "deep learning", "machine learning", "copilot",
  ],
  crypto: [
    "crypto", "bitcoin", "btc", "ethereum", "eth", "blockchain", "solana", "token",
    "defi", "binance", "coinbase", "wallet", "ledger",
  ],
  markets: [
    "market", "stocks", "nasdaq", "dow", "s&p", "fed", "inflation", "economy",
    "shares", "invest", "yield", "trade", "interest rate", "treasury", "central bank",
  ],
  tech: [
    "tech", "apple", "google", "microsoft", "meta", "nvidia", "hardware", "software",
    "startup", "app", "device", "semiconductor", "chip", "quantum", "smartphone",
  ],
  world: [
    "war", "election", "president", "summit", "global", "un", "treaty", "nation",
    "diplomacy", "minister", "foreign", "parliament", "conflict", "prime minister",
  ],
  entertainment: [
    "movie", "film", "music", "hollywood", "actor", "series", "box office", "gaming",
    "streamer", "disney", "netflix", "award",
  ],
  science: [
    "space", "nasa", "physics", "climate", "biology", "research", "mars", "satellite",
    "energy", "fusion", "james webb", "telescope",
  ],
};

function inferClusterCategory(articles: IngestedArticle[]): BroadcastCategory {
  const combinedText = articles
    .map((a) => `${a.title || ""} ${a.rawText || ""} ${a.category || ""}`.toLowerCase())
    .join(" ");

  let bestCat: BroadcastCategory = "tech";
  let maxScore = -1;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [BroadcastCategory, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (matchesWordBoundary(combinedText, kw)) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    for (const a of articles) {
      if (a.category && a.category.toLowerCase().includes(cat)) {
        score += 3;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCat = cat;
    }
  }

  return maxScore > 0 ? bestCat : "tech";
}

function extractClusterKeywords(articles: IngestedArticle[]): string[] {
  const words = articles
    .flatMap((a) => (a.title || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/))
    .filter((w) => (w.length >= 3 || w === "ai") && !STOPWORDS.has(w));

  const counts = new Map<string, number>();
  for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 5);
}

/**
 * Deterministic keyword-based fallback clustering when vector embeddings are unavailable.
 */
export function clusterArticlesByLexicalTheme(
  articles: IngestedArticle[],
  options: { maxClusters?: number } = {}
): StoryCluster[] {
  const maxClusters = Math.max(1, options.maxClusters || 5);
  const buckets: Record<string, IngestedArticle[]> = {
    ai: [],
    tech: [],
    markets: [],
    crypto: [],
    world: [],
    entertainment: [],
    science: [],
  };

  const uncategorized: IngestedArticle[] = [];

  for (const article of articles) {
    const text = `${article.title || ""} ${article.rawText || ""} ${article.category || ""}`.toLowerCase();
    let assigned = false;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((k) => matchesWordBoundary(text, k))) {
        buckets[cat].push(article);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      if (article.category && buckets[article.category.toLowerCase()]) {
        buckets[article.category.toLowerCase()].push(article);
      } else {
        uncategorized.push(article);
      }
    }
  }

  if (uncategorized.length > 0) {
    for (const art of uncategorized) {
      buckets.tech.push(art);
    }
  }

  const clusters: StoryCluster[] = [];

  for (const [category, arts] of Object.entries(buckets)) {
    if (arts.length === 0) continue;

    const uniqueKeywords = extractClusterKeywords(arts);
    const topHeadline = arts[0].title;

    clusters.push({
      id: `cluster_${category}_${Date.now()}_${clusters.length}`,
      category: category as StoryCluster["category"],
      headline: topHeadline,
      articles: arts,
      keywords: uniqueKeywords,
      importanceScore: Math.min(100, arts.length * 20 + 40),
    });
  }

  return clusters
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, maxClusters);
}

export { clusterArticlesByLexicalTheme as clusterArticlesByTheme };

/**
 * Agglomerative centroid-based semantic article clustering using embeddings and cosine similarity.
 * Automatically infers broadcast category, extracts top keywords, and falls back to lexical grouping
 * if embeddings fail.
 */
export async function clusterArticlesSemantically(
  articles: IngestedArticle[],
  options?: SemanticClusterOptions
): Promise<StoryCluster[]> {
  if (!articles || articles.length === 0) return [];

  const maxClusters = Math.max(1, options?.maxClusters ?? 5);
  const threshold = options?.similarityThreshold ?? 0.72;

  const texts = articles.map((a) => {
    const raw = `${a.title || ""}. ${a.rawText || ""}`.trim();
    return raw.length > 0 ? raw : "untitled article";
  });

  let embeddings: number[][] | null = null;
  try {
    const res = await embedLlmMany({
      values: texts,
      companyId: options?.companyId,
      customEmbeddingModel: options?.customEmbeddingModel,
    });
    if (res.embeddings && res.embeddings.length === articles.length) {
      embeddings = res.embeddings;
    }
  } catch (err) {
    console.warn(
      "[clusterArticlesSemantically] Embedding model unavailable, falling back to lexical theme clustering:",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (!embeddings) {
    return clusterArticlesByLexicalTheme(articles, { maxClusters });
  }

  interface VectorCluster {
    articles: IngestedArticle[];
    vectors: number[][];
    centroid: number[];
  }

  const clusters: VectorCluster[] = [];

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    const vec = embeddings[i];

    let bestClusterIdx = -1;
    let bestSim = -Infinity;

    for (let c = 0; c < clusters.length; c++) {
      const sim = cosineSimilarity(vec, clusters[c].centroid);
      if (sim > bestSim) {
        bestSim = sim;
        bestClusterIdx = c;
      }
    }

    if (bestClusterIdx !== -1 && bestSim >= threshold) {
      const cl = clusters[bestClusterIdx];
      cl.articles.push(art);
      cl.vectors.push(vec);
      // Update centroid
      const dim = vec.length;
      const newCentroid = new Array(dim).fill(0);
      for (const v of cl.vectors) {
        for (let d = 0; d < dim; d++) {
          newCentroid[d] += v[d];
        }
      }
      for (let d = 0; d < dim; d++) {
        newCentroid[d] /= cl.vectors.length;
      }
      cl.centroid = newCentroid;
    } else {
      clusters.push({
        articles: [art],
        vectors: [vec],
        centroid: [...vec],
      });
    }
  }

  // Merge closest clusters if clusters.length > maxClusters
  while (clusters.length > maxClusters) {
    let mergeA = -1;
    let mergeB = -1;
    let highestSim = -Infinity;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = cosineSimilarity(clusters[i].centroid, clusters[j].centroid);
        if (sim > highestSim) {
          highestSim = sim;
          mergeA = i;
          mergeB = j;
        }
      }
    }

    if (mergeA === -1 || mergeB === -1) break;

    const target = clusters[mergeA];
    const source = clusters[mergeB];
    target.articles.push(...source.articles);
    target.vectors.push(...source.vectors);
    const dim = target.vectors[0].length;
    const newCentroid = new Array(dim).fill(0);
    for (const v of target.vectors) {
      for (let d = 0; d < dim; d++) {
        newCentroid[d] += v[d];
      }
    }
    for (let d = 0; d < dim; d++) {
      newCentroid[d] /= target.vectors.length;
    }
    target.centroid = newCentroid;

    clusters.splice(mergeB, 1);
  }

  // Construct StoryCluster outputs
  const result: StoryCluster[] = clusters.map((c, idx) => {
    const category = inferClusterCategory(c.articles);
    const keywords = extractClusterKeywords(c.articles);

    let bestHeadline = c.articles[0].title;
    let bestDist = -Infinity;
    for (let i = 0; i < c.articles.length; i++) {
      const sim = cosineSimilarity(c.vectors[i], c.centroid);
      if (sim > bestDist) {
        bestDist = sim;
        bestHeadline = c.articles[i].title;
      }
    }

    return {
      id: `cluster_${category}_${Date.now()}_${idx}`,
      category,
      headline: bestHeadline,
      articles: c.articles,
      keywords,
      importanceScore: Math.min(100, c.articles.length * 20 + 40),
    };
  });

  return result.sort((a, b) => b.importanceScore - a.importanceScore);
}
