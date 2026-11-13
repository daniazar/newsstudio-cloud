/**
 * Pixabay Stock Provider — Search and retrieve royalty-free videos and photos.
 * API Docs: https://pixabay.com/api/docs/
 * License: Pixabay Content License (free for commercial use, no attribution required).
 */

import type { StockProvider, StockResult, StockSearchOptions } from "./types";

const PIXABAY_BASE_URL = "https://pixabay.com/api";

export class PixabayProvider implements StockProvider {
  readonly name = "pixabay";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PIXABAY_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options?: StockSearchOptions): Promise<StockResult[]> {
    if (!this.apiKey) {
      return [];
    }

    const type = options?.type ?? "video";
    const perPage = Math.min(options?.perPage ?? 10, 200);
    const page = options?.page ?? 1;

    try {
      if (type === "video") {
        return await this.searchVideos(query, perPage, page, options);
      } else {
        return await this.searchPhotos(query, perPage, page, options);
      }
    } catch (error) {
      console.error(`[Stock:Pixabay] Search failed for "${query}":`, error);
      return [];
    }
  }

  private async searchVideos(
    query: string,
    perPage: number,
    page: number,
    options?: StockSearchOptions
  ): Promise<StockResult[]> {
    const url = new URL(`${PIXABAY_BASE_URL}/videos/`);
    url.searchParams.set("key", this.apiKey!);
    url.searchParams.set("q", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    url.searchParams.set("safesearch", "true");

    if (options?.minDuration) {
      url.searchParams.set("min_length", String(options.minDuration));
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Pixabay API returned ${response.status}`);
    }

    const data = await response.json();
    const hits = data.hits ?? [];

    return hits.map((hit: PixabayVideoHit): StockResult => {
      // Prefer "large" video, fallback to "medium" or "small"
      const bestVideo = hit.videos.large ?? hit.videos.medium ?? hit.videos.small;
      const tinyVideo = hit.videos.tiny ?? hit.videos.small ?? bestVideo;

      return {
        externalId: String(hit.id),
        provider: "pixabay",
        type: "video",
        url: hit.pageURL,
        previewUrl: `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg`,
        previewVideoUrl: tinyVideo.url,
        downloadUrl: bestVideo.url,
        width: bestVideo.width,
        height: bestVideo.height,
        duration: hit.duration,
        license: "pixabay",
        alt: hit.tags || undefined,
      };
    });
  }

  private async searchPhotos(
    query: string,
    perPage: number,
    page: number,
    options?: StockSearchOptions
  ): Promise<StockResult[]> {
    const url = new URL(`${PIXABAY_BASE_URL}/`);
    url.searchParams.set("key", this.apiKey!);
    url.searchParams.set("q", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("image_type", "photo");

    if (options?.orientation && options.orientation !== "square") {
      url.searchParams.set("orientation", options.orientation === "portrait" ? "vertical" : "horizontal");
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Pixabay API returned ${response.status}`);
    }

    const data = await response.json();
    const hits = data.hits ?? [];

    return hits.map((hit: PixabayPhotoHit): StockResult => ({
      externalId: String(hit.id),
      provider: "pixabay",
      type: "photo",
      url: hit.pageURL,
      previewUrl: hit.webformatURL,
      downloadUrl: hit.largeImageURL,
      width: hit.imageWidth,
      height: hit.imageHeight,
      license: "pixabay",
      alt: hit.tags || undefined,
    }));
  }
}

// ============================================================
// Pixabay API Response Types (internal)
// ============================================================

interface PixabayVideoSize {
  url: string;
  width: number;
  height: number;
  size: number;
}

interface PixabayVideoHit {
  id: number;
  pageURL: string;
  tags: string;
  duration: number;
  picture_id: string;
  videos: {
    large: PixabayVideoSize;
    medium: PixabayVideoSize;
    small: PixabayVideoSize;
    tiny: PixabayVideoSize;
  };
}

interface PixabayPhotoHit {
  id: number;
  pageURL: string;
  tags: string;
  imageWidth: number;
  imageHeight: number;
  webformatURL: string;
  largeImageURL: string;
  fullHDURL?: string;
}
