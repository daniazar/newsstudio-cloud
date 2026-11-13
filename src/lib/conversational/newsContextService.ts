/**
 * src/lib/conversational/newsContextService.ts
 *
 * Real-Time Newsroom Database Grounding (RAG) Service for Conversational AI Anchors.
 * Directly interfaces with the SQLite database via Prisma to extract recent stories,
 * breaking wire bulletins, and market ticker metrics.
 * 
 * Inspired by tooling/discord-voice-bot/src/ai/newsService.ts.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  marketDataService,
  MarketTickerItem as MarketDataTickerItem,
} from "@/lib/markets/marketDataService";

export interface NewsStoryItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  link: string;
  pubDate: string | null;
  createdAt: string;
  fullContentSnippet?: string | null;
}

export type MarketTickerItem = MarketDataTickerItem;

export class NewsContextService {
  /**
   * Fetches top recent stories from the database, optionally filtered by topic/category.
   */
  public async getLatestNewsBriefing(options?: {
    topic?: string;
    limit?: number;
  }): Promise<NewsStoryItem[]> {
    try {
      const limit = options?.limit || 6;
      const topic = options?.topic?.trim().toLowerCase();

      const whereClause: Prisma.StoryWhereInput = {};
      if (topic && topic !== "all" && topic !== "general") {
        whereClause.OR = [
          { category: { contains: topic } },
          { title: { contains: topic } },
          { description: { contains: topic } },
        ];
      }

      const stories = await prisma.story.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          link: true,
          pubDate: true,
          createdAt: true,
          fullContent: true,
        },
      });

      return stories.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        link: s.link,
        pubDate: s.pubDate ? s.pubDate.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
        fullContentSnippet: s.fullContent ? s.fullContent.slice(0, 300) : null,
      }));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("[NewsContextService] Failed to query Prisma stories:", errorMsg);
      return [];
    }
  }

  /**
   * Returns current market ticker snapshots for financial updates.
   * Leverages marketDataService cached quotes or standard defaults.
   */
  public getMarketTickerSnapshot(): MarketTickerItem[] {
    return marketDataService.getMarketTickerSnapshot();
  }

  /**
   * Asynchronously fetches live market tickers from Yahoo Finance.
   */
  public async getLiveMarketTickers(): Promise<MarketTickerItem[]> {
    return marketDataService.getLiveMarketTickers();
  }

  /**
   * Formats real-time news headlines and live market metrics into an injection prompt for local Ollama / LLM.
   */
  public formatNewsPromptContext(
    stories: NewsStoryItem[],
    language: "es" | "en" | "auto" = "auto",
    liveMarkets?: MarketTickerItem[]
  ): string {
    if (!stories || stories.length === 0) {
      return language === "es"
        ? "INFORMACIÓN EN TIEMPO REAL: No hay cables de noticias urgentes de último minuto en este momento."
        : "REAL-TIME NEWSROOM BULLETINS: No urgent breaking news wire bulletins at this exact moment.";
    }

    const isEs = language === "es";
    const header = isEs
      ? "INFORMACIÓN EN TIEMPO REAL DEL CENTRO DE NOTICIAS (CABLES RECIENTES):"
      : "REAL-TIME NEWSROOM BULLETINS (LATEST WIRE REPORT):";

    const items = stories
      .map((s, idx) => {
        const cat = s.category ? `[${s.category.toUpperCase()}] ` : "";
        const desc = s.description ? ` — ${s.description.slice(0, 160)}` : "";
        return `${idx + 1}. ${cat}${s.title}${desc} (StoryID: ${s.id})`;
      })
      .join("\n");

    const tickers = liveMarkets && liveMarkets.length > 0
      ? liveMarkets
      : this.getMarketTickerSnapshot();

    const marketData = tickers
      .map((m) => `${m.symbol}: ${m.value} (${m.change})`)
      .join(" | ");

    const footer = isEs
      ? `\n\nINDICADORES DE MERCADO ACTUALES (EN TIEMPO REAL): ${marketData}\n\nINSTRUCCIÓN: Entrega estos hechos verificados con tono carismático, seguro y ritmo de presentador de noticias de televisión.`
      : `\n\nCURRENT MARKET INDICES (REAL-TIME): ${marketData}\n\nINSTRUCTION: Deliver these verified facts with charismatic broadcast anchor authority and natural conversational cadence.`;

    return `${header}\n${items}${footer}`;
  }
}

export const newsContextService = new NewsContextService();
