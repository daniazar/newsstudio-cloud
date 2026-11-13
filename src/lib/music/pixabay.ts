/**
 * Pixabay Music Provider — Search royalty-free background music.
 * Uses the same Pixabay API key as the image/video provider.
 * API Docs: https://pixabay.com/api/docs/#api_search_music (undocumented but stable)
 *
 * Note: Pixabay's music API is accessible via the same key.
 * All tracks are royalty-free and safe for YouTube/Instagram/TikTok monetization.
 */

import type { MusicProvider, MusicTrack, MusicSearchOptions, MusicMood } from "./types";

const PIXABAY_MUSIC_URL = "https://pixabay.com/api/music/";

/**
 * Map our mood categories to Pixabay music genre/category keywords.
 */
const MOOD_TO_GENRE: Record<MusicMood, string[]> = {
  upbeat: ["pop", "electronic", "dance"],
  serious: ["corporate", "cinematic"],
  ambient: ["ambient", "lounge", "meditation"],
  dramatic: ["cinematic", "trailer", "epic"],
  calm: ["acoustic", "classical", "piano"],
  energetic: ["rock", "hip hop", "electronic"],
};

export class PixabayMusicProvider implements MusicProvider {
  readonly name = "pixabay-music";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PIXABAY_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options?: MusicSearchOptions): Promise<MusicTrack[]> {
    if (!this.apiKey) {
      return [];
    }

    const perPage = Math.min(options?.perPage ?? 10, 200);
    const page = options?.page ?? 1;

    try {
      const url = new URL(PIXABAY_MUSIC_URL);
      url.searchParams.set("key", this.apiKey);

      // Build the search query: combine user query with mood-based genre hints
      let searchTerms = query;
      if (options?.mood) {
        const genreHints = MOOD_TO_GENRE[options.mood];
        if (genreHints) {
          searchTerms = `${query} ${genreHints[0]}`;
        }
      }
      url.searchParams.set("q", searchTerms);
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("page", String(page));
      url.searchParams.set("safesearch", "true");

      if (options?.minDuration) {
        url.searchParams.set("min_duration", String(options.minDuration));
      }
      if (options?.maxDuration) {
        url.searchParams.set("max_duration", String(options.maxDuration));
      }

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        // Pixabay music API may not be available — fail gracefully
        console.warn(`[Music:Pixabay] API returned ${response.status}, music search unavailable`);
        return [];
      }

      const data = await response.json();
      const hits = data.hits ?? [];

      return hits.map((hit: PixabayMusicHit): MusicTrack => ({
        externalId: String(hit.id),
        provider: "pixabay-music",
        name: hit.title || `Track ${hit.id}`,
        artist: hit.user || undefined,
        mood: options?.mood ?? "ambient",
        url: hit.pageURL || `https://pixabay.com/music/id-${hit.id}/`,
        previewUrl: hit.audio || hit.url || "",
        downloadUrl: hit.audio || hit.url || "",
        duration: hit.duration ?? 0,
        bpm: undefined, // Pixabay doesn't expose BPM
        license: "pixabay",
        tags: hit.tags ? hit.tags.split(",").map((t: string) => t.trim()) : [],
      }));
    } catch (error) {
      console.error(`[Music:Pixabay] Search failed for "${query}":`, error);
      return [];
    }
  }
}

// ============================================================
// Pixabay Music API Response Types (internal)
// ============================================================

interface PixabayMusicHit {
  id: number;
  title?: string;
  user?: string;
  tags?: string;
  audio?: string;
  url?: string;
  pageURL?: string;
  duration?: number;
  downloads?: number;
}
