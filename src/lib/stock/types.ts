/**
 * Stock Asset Provider — Unified interface for searching royalty-free stock footage and photos.
 * Providers: Pexels, Pixabay, (future: Unsplash, Coverr, Mixkit, Videvo, Pxhere)
 */

// ============================================================
// Search Options
// ============================================================

export type StockAssetType = "video" | "photo";

export type StockOrientation = "landscape" | "portrait" | "square";

export interface StockSearchOptions {
  /** Type of asset to search for */
  type?: StockAssetType;
  /** Number of results per page (default: 10) */
  perPage?: number;
  /** Minimum duration in seconds (for videos only) */
  minDuration?: number;
  /** Preferred orientation */
  orientation?: StockOrientation;
  /** Page number for pagination */
  page?: number;
}

// ============================================================
// Search Results
// ============================================================

export interface StockResult {
  /** Provider's unique ID for this asset */
  externalId: string;
  /** Provider name */
  provider: string;
  /** Asset type */
  type: StockAssetType;
  /** Full-resolution URL (for display/reference) */
  url: string;
  /** Lower-resolution preview URL (thumbnails, quick preview) */
  previewUrl: string;
  /** Low-resolution video URL for hover previews */
  previewVideoUrl?: string;
  /** Direct download URL for the highest quality version */
  downloadUrl: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Duration in seconds (for videos only) */
  duration?: number;
  /** License type */
  license: string;
  /** Alt text or description */
  alt?: string;
}

// ============================================================
// Provider Interface
// ============================================================

export interface StockProvider {
  /** Provider identifier (e.g., "pexels", "pixabay") */
  readonly name: string;

  /**
   * Search for stock assets matching the query.
   * @param query Search keywords
   * @param options Search filters
   * @returns Array of matching stock results
   */
  search(query: string, options?: StockSearchOptions): Promise<StockResult[]>;

  /**
   * Whether this provider is currently configured (has API key, etc.)
   */
  isAvailable(): boolean;
}
