/**
 * Background Music Pipeline — Unified search + storage download + DB record creation.
 *
 * Mirrors the stock provider architecture for easy expansion.
 * Currently supports Pixabay Music. Future providers (Jamendo, FMA, etc.)
 * are added to the ALL_PROVIDERS map.
 */

import https from "https";
import http from "http";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import type {
  MusicProvider,
  MusicTrack,
  MusicSearchOptions,
  MusicGenerationOptions,
  MusicGenerationResult,
  MusicMood,
} from "./types";
import { PixabayMusicProvider } from "./pixabay";
import { JamendoMusicProvider } from "./jamendo";
import { CCMixterMusicProvider } from "./ccmixter";
import { ACEStepMusicProvider } from "./aceStep";
import { createLogger } from "@/lib/logger";

const log = createLogger("music:index");

// ============================================================
// Provider Registry
// ============================================================

/** All known music providers — new providers are registered here */
const ALL_PROVIDERS: Record<string, () => MusicProvider> = {
  "acestep-music": () => new ACEStepMusicProvider(),
  "pixabay-music": () => new PixabayMusicProvider(),
  "jamendo-music": () => new JamendoMusicProvider(),
  "ccmixter-music": () => new CCMixterMusicProvider(),
};


/**
 * Get music providers in priority order.
 * Falls back to ["pixabay-music", "jamendo-music", "ccmixter-music"] if not configured.
 */
function getMusicProviderPriority(): string[] {
  const envPriority = process.env.MUSIC_PROVIDER_PRIORITY;
  if (envPriority) {
    return envPriority.split(",").map((s) => s.trim().toLowerCase());
  }
  return ["pixabay-music", "jamendo-music", "ccmixter-music"];
}

/**
 * Instantiate available providers in priority order.
 */
function getActiveProviders(): MusicProvider[] {
  const priority = getMusicProviderPriority();
  const providers: MusicProvider[] = [];

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
// Public API
// ============================================================

/**
 * Search for background music tracks across configured providers.
 * Tries providers in priority order.
 *
 * @param query Search keywords (e.g., "corporate news ambient")
 * @param options Search filters including mood
 * @returns Array of music tracks
 */
export async function searchMusic(
  query: string,
  options?: MusicSearchOptions
): Promise<MusicTrack[]> {
  const providers = getActiveProviders();
  const providerNames = providers.map(p => p.name).join(", ");
  log.info(`[Music Search] Active providers loaded: [${providerNames}]`);

  // Helper function to search across providers for a given query and options
  const runSearch = async (q: string, opts?: MusicSearchOptions): Promise<MusicTrack[]> => {
    for (const provider of providers) {
      try {
        log.info(`[Music Search] [${provider.name}] Querying search for query: "${q}" with mood "${opts?.mood || "none"}"`);
        const results = await provider.search(q, opts);
        if (results && results.length > 0) {
          log.info(`[Music Search] [${provider.name}] Successfully found ${results.length} tracks for query: "${q}"`);
          return results;
        } else {
          log.info(`[Music Search] [${provider.name}] No tracks returned for query: "${q}"`);
        }
      } catch (err) {
        console.error(`[Music Search] [${provider.name}] Error searching for "${q}":`, err);
      }
    }
    return [];
  };

  // 1. Try the primary query
  let results = await runSearch(query, options);
  if (results.length > 0) return results;

  // 2. Failover: Relax to individual words from the query if it has multiple words
  const words = query.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 1) {
    log.info(`[Music Search] Primary search failed. Relaxing query "${query}" to individual words...`);
    for (const word of words) {
      results = await runSearch(word, options);
      if (results.length > 0) {
        log.info(`[Music Search] Found matches using relaxed single-word query: "${word}"`);
        return results;
      }
    }
  }

  // 3. Failover: If a mood is specified, try searching for the mood category alone
  if (options?.mood) {
    log.info(`[Music Search] Word-based search failed. Trying search with mood category alone: "${options.mood}"`);
    results = await runSearch(options.mood, options);
    if (results.length > 0) return results;
  }

  // 4. Ultimate Failover: Try generic term "news background"
  log.info(`[Music Search] All failovers failed. Trying generic news background query...`);
  results = await runSearch("news background", options);
  if (results.length > 0) return results;

  // 5. Ultimate Fallback: Try generic term "ambient" without options or mood filter
  results = await runSearch("ambient");
  return results;
}

/**
 * Download a file from a URL using Node's https/http module with TLS validation disabled
 * to handle domains with expired/invalid certificates.
 */
function downloadFileInsecure(urlStr: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === "https:" ? https : http;

    const options: https.RequestOptions = {
      rejectUnauthorized: false,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://ccmixter.org/",
      }
    };

    const req = client.get(urlStr, options, (res) => {
      // Handle redirects (recursively follow location header)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith("http")) {
          redirectUrl = new URL(redirectUrl, url.origin).toString();
        }
        downloadFileInsecure(redirectUrl).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download file from ${urlStr}, status code: ${res.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error(`Download timeout for ${urlStr}`));
    });
  });
}

/**
 * Download a music track to storage and create a BackgroundMusic DB record.
 * Returns the BackgroundMusic record ID.
 *
 * @param track The music track to download
 * @param companyId The owning tenant — keys are namespaced under tenants/{companyId}/
 * @returns The BackgroundMusic DB record
 */
export async function downloadMusicToStorage(
  track: MusicTrack,
  companyId: string
): Promise<{ id: string; storageKey: string }> {
  const storageKey = withTenant(companyId, `music/${track.provider}/${track.externalId}.mp3`);

  // Check if already exists in DB
  const existing = await prisma.backgroundMusic.findFirst({
    where: {
      name: track.name,
      mood: track.mood,
    },
  });

  if (existing) {
    return { id: existing.id, storageKey: existing.storageKey };
  }

  // Download the track
  const alreadyStored = await storage.exists(storageKey);
  if (!alreadyStored) {
    log.info(`[Music Download] Downloading track "${track.name}" from ${track.downloadUrl}`);
    const buffer = await downloadFileInsecure(track.downloadUrl);
    log.info(`[Music Download] Downloaded ${buffer.length} bytes for track "${track.name}"`);
    await storage.upload(storageKey, buffer, "audio/mpeg");
  }

  // Create DB record
  const record = await prisma.backgroundMusic.create({
    data: {
      name: track.name,
      mood: track.mood,
      url: track.url,
      storageKey,
      duration: track.duration,
      bpm: track.bpm ?? null,
      isDefault: false,
    },
  });

  return { id: record.id, storageKey };
}

/**
 * Synthesizes music with ACE-Step via Modern-TTS-Server, with seamless fallback
 * to copyright-safe stock music search (Pixabay -> Jamendo -> ccMixter).
 *
 * @param options Music generation parameters (prompt, mood, duration, etc.)
 * @param companyId Tenant ID for storage partitioning
 * @returns MusicGenerationResult with DB record ID, storageKey, and provenance
 */
export async function generateOrFallbackMusic(
  options: MusicGenerationOptions,
  companyId: string
): Promise<MusicGenerationResult> {
  const aceStep = new ACEStepMusicProvider();

  // 1. Try ACE-Step AI generation
  if (aceStep.isAvailable()) {
    try {
      log.info(
        `[Music Pipeline] Attempting ACE-Step music generation for "${options.prompt}" (${options.duration || 15}s)...`
      );
      const result = await aceStep.generateAndSave(options, companyId);
      log.info(`[Music Pipeline] ✅ ACE-Step generation succeeded: ${result.storageKey}`);
      return result;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Music Pipeline] ⚠️ ACE-Step generation failed or server offline (${errMsg}). Cascading to stock providers...`
      );
    }
  }

  // 2. Fallback to Royalty-Free Stock Catalogs
  const fallbackMood = (options.mood as MusicMood) || "serious";
  const searchQueries = [
    options.prompt,
    typeof options.mood === "string" ? options.mood : "",
    "news background",
    "ambient news",
    "corporate news",
  ].filter(Boolean) as string[];

  for (const query of searchQueries) {
    try {
      log.info(`[Music Pipeline:Fallback] Searching stock providers for query: "${query}"`);
      const tracks = await searchMusic(query, {
        mood: fallbackMood,
        perPage: 3,
        minDuration: Math.min(options.duration || 15, 30),
      });

      if (tracks && tracks.length > 0) {
        const bestTrack = tracks[0];
        log.info(
          `[Music Pipeline:Fallback] Found stock track "${bestTrack.name}" (${bestTrack.provider}). Downloading...`
        );
        const { id, storageKey } = await downloadMusicToStorage(bestTrack, companyId);

        return {
          id,
          storageKey,
          name: bestTrack.name,
          mood: bestTrack.mood || fallbackMood,
          duration: bestTrack.duration,
          provider: bestTrack.provider,
          isAiGenerated: false,
          isFallback: true,
          fallbackProvider: bestTrack.provider,
          track: bestTrack,
        };
      }
    } catch (searchErr: unknown) {
      const errMsg = searchErr instanceof Error ? searchErr.message : String(searchErr);
      console.warn(`[Music Pipeline:Fallback] Search error for "${query}":`, errMsg);
    }
  }

  throw new Error(
    `Failed to generate or find background music across ACE-Step and stock providers.`
  );
}

export { ACEStepMusicProvider } from "./aceStep";
export type {
  MusicProvider,
  MusicTrack,
  MusicSearchOptions,
  MusicMood,
  MusicGenerationOptions,
  MusicGenerationResult,
} from "./types";

