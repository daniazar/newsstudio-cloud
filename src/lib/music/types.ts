/**
 * Background Music Provider — Unified interface for searching royalty-free music.
 * Providers: Pixabay Music (current), (future: Jamendo, FMA, ccMixter, Musopen)
 */

// ============================================================
// Music Moods
// ============================================================

export type MusicMood = "upbeat" | "serious" | "ambient" | "dramatic" | "calm" | "energetic";

// ============================================================
// Search Options
// ============================================================

export interface MusicSearchOptions {
  /** Filter by mood/genre */
  mood?: MusicMood;
  /** Minimum duration in seconds */
  minDuration?: number;
  /** Maximum duration in seconds */
  maxDuration?: number;
  /** Number of results per page */
  perPage?: number;
  /** Page number */
  page?: number;
}

// ============================================================
// Track Result
// ============================================================

export interface MusicTrack {
  /** Provider's unique ID */
  externalId: string;
  /** Provider name */
  provider: string;
  /** Track title */
  name: string;
  /** Artist / creator */
  artist?: string;
  /** Mood classification */
  mood: string;
  /** Page URL */
  url: string;
  /** Direct preview/stream URL */
  previewUrl: string;
  /** Direct download URL (highest quality) */
  downloadUrl: string;
  /** Duration in seconds */
  duration: number;
  /** BPM if available */
  bpm?: number;
  /** License type */
  license: string;
  /** Tags/genres */
  tags?: string[];
}

// ============================================================
// Provider Interface
// ============================================================

export interface MusicProvider {
  /** Provider identifier */
  readonly name: string;

  /**
   * Search for music tracks matching the query.
   * @param query Search keywords
   * @param options Search filters
   * @returns Array of matching music tracks
   */
  search(query: string, options?: MusicSearchOptions): Promise<MusicTrack[]>;

  /**
   * Whether this provider is currently configured
   */
  isAvailable(): boolean;
}

// ============================================================
// AI Music Generation Options & Results
// ============================================================

export interface MusicGenerationOptions {
  /** Descriptive prompt for the track style, instrumentation, or aesthetic */
  prompt: string;
  /** Music mood category */
  mood?: MusicMood | string;
  /** Target duration in seconds (default: 15) */
  duration?: number;
  /** Optional lyric text for vocal or singing synthesis */
  lyrics?: string;
  /** Target tempo in BPM if applicable */
  bpm?: number;
  /** Whether to strictly generate an instrumental bed (default: true) */
  instrumental?: boolean;
}

export interface MusicGenerationResult {
  /** BackgroundMusic database record ID */
  id: string;
  /** Storage key for referencing the stored audio */
  storageKey: string;
  /** Name/Title of the generated or retrieved track */
  name: string;
  /** Mood of the track */
  mood: string;
  /** Actual or calculated duration in seconds */
  duration: number;
  /** Provider name (e.g. 'acestep-music', 'pixabay-music', etc.) */
  provider: string;
  /** Whether this track was synthesized via AI (ACE-Step) */
  isAiGenerated: boolean;
  /** Whether fallback to a stock provider occurred */
  isFallback: boolean;
  /** If fallback occurred, which provider supplied the track */
  fallbackProvider?: string;
  /** Full track metadata */
  track?: MusicTrack;
}

