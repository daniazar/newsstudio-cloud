/**
 * Pexels Stock Provider — Search and retrieve royalty-free videos and photos.
 * API Docs: https://www.pexels.com/api/documentation/
 * License: Free to use, no attribution required.
 */

import type { StockProvider, StockResult, StockSearchOptions } from "./types";

const PEXELS_BASE_URL = "https://api.pexels.com";

export class PexelsProvider implements StockProvider {
  readonly name = "pexels";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options?: StockSearchOptions): Promise<StockResult[]> {
    if (!this.apiKey) {
      return [];
    }

    const type = options?.type ?? "video";
    const perPage = options?.perPage ?? 10;
    const orientation = options?.orientation ?? "portrait";
    const page = options?.page ?? 1;

    try {
      if (type === "video") {
        return await this.searchVideos(query, perPage, orientation, page);
      } else {
        return await this.searchPhotos(query, perPage, orientation, page);
      }
    } catch (error) {
      console.error(`[Stock:Pexels] Search failed for "${query}":`, error);
      return [];
    }
  }

  private async searchVideos(
    query: string,
    perPage: number,
    orientation: string,
    page: number
  ): Promise<StockResult[]> {
    const url = new URL(`${PEXELS_BASE_URL}/videos/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: { Authorization: this.apiKey! },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Pexels API returned ${response.status}`);
    }

    const data = await response.json();
    const videos = data.videos ?? [];

    return videos.map((video: PexelsVideo): StockResult => {
      // Pick the best video file — prefer HD (1280px wide) or the largest available
      const bestFile =
        video.video_files.find(
          (f: PexelsVideoFile) => f.width >= 1080 && f.width <= 1920 && f.quality === "hd"
        ) ??
        video.video_files.find((f: PexelsVideoFile) => f.quality === "hd") ??
        video.video_files[0];

      const lowResFile = 
        video.video_files.find((f: PexelsVideoFile) => f.quality === "sd") ??
        video.video_files[0];

      return {
        externalId: String(video.id),
        provider: "pexels",
        type: "video",
        url: video.url,
        previewUrl: video.image,
        previewVideoUrl: lowResFile?.link,
        downloadUrl: bestFile?.link ?? video.url,
        width: bestFile?.width ?? video.width,
        height: bestFile?.height ?? video.height,
        duration: video.duration,
        license: "pexels",
        alt: video.url,
      };
    });
  }

  private async searchPhotos(
    query: string,
    perPage: number,
    orientation: string,
    page: number
  ): Promise<StockResult[]> {
    const url = new URL(`${PEXELS_BASE_URL}/v1/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: { Authorization: this.apiKey! },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Pexels API returned ${response.status}`);
    }

    const data = await response.json();
    const photos = data.photos ?? [];

    return photos.map((photo: PexelsPhoto): StockResult => ({
      externalId: String(photo.id),
      provider: "pexels",
      type: "photo",
      url: photo.src.original,
      previewUrl: photo.src.medium,
      downloadUrl: photo.src.large2x,
      width: photo.width,
      height: photo.height,
      license: "pexels",
      alt: photo.alt || undefined,
    }));
  }
}

// ============================================================
// Pexels API Response Types (internal)
// ============================================================

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}
