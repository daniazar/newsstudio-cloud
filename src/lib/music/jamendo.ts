/**
 * Jamendo Music Provider — Search and retrieve Creative Commons background music.
 * API Docs: https://developer.jamendo.com/v3.0
 */

import type { MusicProvider, MusicTrack, MusicSearchOptions } from "./types";
import { createLogger } from "@/lib/logger";

const log = createLogger("music:jamendo");

interface JamendoMusicInfo {
  bpm?: string | number;
  genre?: string;
}

interface JamendoTrack {
  id: string | number;
  name?: string;
  artist_name?: string;
  shareurl?: string;
  audio?: string;
  audiodownload?: string;
  duration?: number;
  musicinfo?: JamendoMusicInfo;
  tags?: Record<string, string[] | string>;
}

export class JamendoMusicProvider implements MusicProvider {
  readonly name = "jamendo-music";
  private clientId: string | undefined;

  constructor() {
    this.clientId = process.env.JAMENDO_CLIENT_ID || "56d30c55";
  }

  isAvailable(): boolean {
    return true; // Configured via env, fallback provided
  }

  async search(query: string, options?: MusicSearchOptions): Promise<MusicTrack[]> {
    if (!this.clientId) {
      return [];
    }

    const perPage = options?.perPage ?? 10;

    const runRequest = async (params: Record<string, string>): Promise<MusicTrack[]> => {
      try {
        const url = new URL("https://api.jamendo.com/v3.0/tracks/");
        url.searchParams.set("client_id", this.clientId!);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", String(perPage));
        url.searchParams.set("audioformat", "mp32"); // VBR high quality mp3
        url.searchParams.set("include", "musicinfo"); // Fetch musical attributes like BPM
        url.searchParams.set("order", "popularity_total"); // Prioritize high-quality popular tracks

        for (const [key, val] of Object.entries(params)) {
          url.searchParams.set(key, val);
        }

        if (options?.mood) {
          // Map standard moods to Jamendo tags
          const moodMap: Record<string, string> = {
            upbeat: "upbeat",
            serious: "corporate",
            ambient: "ambient",
            dramatic: "dramatic",
            calm: "calm",
            energetic: "energetic",
          };
          const tag = moodMap[options.mood];
          if (tag) {
            url.searchParams.set("tags", tag);
          }
        }

        const response = await fetch(url.toString(), {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          console.warn(`[Music:Jamendo] Request failed with status ${response.status}`);
          return [];
        }

        const data = await response.json();
        const results = (data.results ?? []) as JamendoTrack[];

        return results
          .filter((track) => track.audio || track.audiodownload)
          .map((track): MusicTrack => {
            let bpm: number | undefined;
            if (track.musicinfo?.bpm) {
              const bpmVal = parseInt(String(track.musicinfo.bpm));
              if (!isNaN(bpmVal)) {
                bpm = bpmVal;
              }
            }

            // Extract tags
            let tags: string[] = [];
            if (track.tags) {
              tags = Object.values(track.tags)
                .flat()
                .map((t) => String(t).trim())
                .filter(Boolean);
            }

            return {
              externalId: String(track.id),
              provider: "jamendo-music",
              name: track.name || `Track ${track.id}`,
              artist: track.artist_name || undefined,
              mood: options?.mood ?? "ambient",
              url: track.shareurl || `https://www.jamendo.com/track/${track.id}`,
              previewUrl: track.audio || "",
              downloadUrl: track.audiodownload || track.audio || "",
              duration: track.duration ?? 0,
              bpm,
              license: "creative-commons",
              tags,
            };
          });
      } catch (error) {
        console.error(`[Music:Jamendo] Request failed for query "${query}":`, error);
        return [];
      }
    };

    // Stage 1: Try tag-based search + instrumental preference to avoid vocal clashes
    log.info(`[Music:Jamendo] Querying fuzzytags search (instrumental preferred) for: "${query}"`);
    let tracks = await runRequest({ fuzzytags: query, vocalinstrumental: "instrumental" });
    if (tracks.length > 0) return tracks;

    // Stage 2: Try tag-based search without instrumental filter (fallback)
    log.info(`[Music:Jamendo] Tag search with instrumental filter returned zero results. Retrying general tags for: "${query}"`);
    tracks = await runRequest({ fuzzytags: query });
    if (tracks.length > 0) return tracks;

    // Stage 3: Try namesearch (fallback if query matches specific song name)
    log.info(`[Music:Jamendo] Retrying namesearch for track matches: "${query}"`);
    tracks = await runRequest({ namesearch: query });
    return tracks;
  }
}
