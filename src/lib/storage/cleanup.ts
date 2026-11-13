import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/**
 * Normalizes a stored URL or assetPath into a raw storage key.
 * If the path is a remote external URL (e.g. from Pexels, Pixabay, Unsplash), it returns null.
 */
function extractStorageKey(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // External stock or CDN URL - do not attempt to delete from our storage
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    const s3Endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    if (trimmed.startsWith(s3Endpoint)) {
      // It is an S3 URL pointing to our bucket: e.g. http://localhost:9000/bucket-name/key
      const parts = trimmed.replace(s3Endpoint, "").replace(/^\/+/, "").split("/");
      // Remove the bucket name (first part)
      parts.shift();
      return parts.join("/");
    }
    return null;
  }

  // Local assets served from /assets/key
  if (trimmed.startsWith("/assets/")) {
    return trimmed.replace(/^\/assets\//, "");
  }

  return trimmed.replace(/^\/+/, "");
}

/**
 * Deletes all physical/cloud storage assets associated with a story:
 * - Script segment audio (.wav)
 * - Segment presenter videos / lip-sync outputs (.mp4)
 * - Segment B-roll downloads
 * - Final rendered video (.mp4)
 * - Presenter video & audio tracks
 */
export async function deleteStoryStorageAssets(storyId: string): Promise<{ deletedCount: number }> {
  try {
    // 1. Gather all asset references from DB before cascade deletion
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        script: {
          include: {
            segments: {
              select: {
                audioPath: true,
                presenterVideoPath: true,
                assetPath: true,
              },
            },
          },
        },
        video: {
          select: {
            outputPath: true,
            presenterVideoPath: true,
            presenterAudioPath: true,
            globalBgVideoPath: true,
            bgMusicPath: true,
          },
        },
      },
    });

    if (!story) return { deletedCount: 0 };

    const keysToDelete = new Set<string>();

    // Collect segment keys
    if (story.script?.segments) {
      for (const seg of story.script.segments) {
        const audioKey = extractStorageKey(seg.audioPath);
        if (audioKey) keysToDelete.add(audioKey);

        const videoKey = extractStorageKey(seg.presenterVideoPath);
        if (videoKey) keysToDelete.add(videoKey);

        const assetKey = extractStorageKey(seg.assetPath);
        if (assetKey) keysToDelete.add(assetKey);
      }
    }

    // Collect video keys
    if (story.video) {
      const outputKey = extractStorageKey(story.video.outputPath);
      if (outputKey) keysToDelete.add(outputKey);

      const presVideoKey = extractStorageKey(story.video.presenterVideoPath);
      if (presVideoKey) keysToDelete.add(presVideoKey);

      const presAudioKey = extractStorageKey(story.video.presenterAudioPath);
      if (presAudioKey) keysToDelete.add(presAudioKey);

      const bgVideoKey = extractStorageKey(story.video.globalBgVideoPath);
      if (bgVideoKey) keysToDelete.add(bgVideoKey);
    }

    const keysArray = Array.from(keysToDelete);
    if (keysArray.length === 0) {
      return { deletedCount: 0 };
    }

    // 2. Perform deletion using batch delete if available, else Promise.allSettled
    if (storage.deleteMany) {
      await storage.deleteMany(keysArray).catch((err) => {
        console.warn(`[Storage Cleanup] Batch delete error for story ${storyId}:`, err);
      });
    } else {
      await Promise.allSettled(
        keysArray.map(async (key) => {
          try {
            await storage.delete(key);
          } catch (err) {
            console.warn(`[Storage Cleanup] Failed to delete key ${key}:`, err);
          }
        })
      );
    }

    return { deletedCount: keysArray.length };
  } catch (error) {
    console.error(`[Storage Cleanup] Error cleaning up assets for story ${storyId}:`, error);
    return { deletedCount: 0 };
  }
}

/**
 * Deletes all physical/cloud storage assets associated with a specific segment:
 * - audioPath (.wav)
 * - presenterVideoPath (.mp4)
 * - assetPath (b-roll / image)
 */
export async function deleteSegmentStorageAssets(segment: {
  audioPath?: string | null;
  presenterVideoPath?: string | null;
  assetPath?: string | null;
}): Promise<{ deletedCount: number }> {
  try {
    const keysToDelete = new Set<string>();

    const audioKey = extractStorageKey(segment.audioPath);
    if (audioKey) keysToDelete.add(audioKey);

    const presVideoKey = extractStorageKey(segment.presenterVideoPath);
    if (presVideoKey) keysToDelete.add(presVideoKey);

    const assetKey = extractStorageKey(segment.assetPath);
    if (assetKey) keysToDelete.add(assetKey);

    const keysArray = Array.from(keysToDelete);
    if (keysArray.length === 0) {
      return { deletedCount: 0 };
    }

    if (storage.deleteMany) {
      await storage.deleteMany(keysArray).catch((err) => {
        console.warn("[Storage Cleanup] Batch delete error for segment:", err);
      });
    } else {
      await Promise.allSettled(
        keysArray.map(async (key) => {
          try {
            await storage.delete(key);
          } catch (err) {
            console.warn(`[Storage Cleanup] Failed to delete key ${key}:`, err);
          }
        })
      );
    }

    return { deletedCount: keysArray.length };
  } catch (error) {
    console.error("[Storage Cleanup] Error cleaning up assets for segment:", error);
    return { deletedCount: 0 };
  }
}

/**
 * Deletes all physical/cloud storage assets associated with an E-Commerce campaign:
 * - Extracted product image cutouts (mattedKey, storageKey)
 * - Rendered variation MP4/WebM videos
 * - Rendered GIF previews & thumbnails
 */
export async function deleteCampaignStorageAssets(campaignId: string): Promise<{ deletedCount: number }> {
  try {
    const campaign = await prisma.productCampaign.findUnique({
      where: { id: campaignId },
      include: {
        assets: {
          select: {
            storageKey: true,
            mattedKey: true,
          },
        },
        variations: {
          select: {
            renderedVideoKey: true,
            renderedWebmKey: true,
            renderedGifKey: true,
            thumbnailKey: true,
          },
        },
      },
    });

    if (!campaign) return { deletedCount: 0 };

    const keysToDelete = new Set<string>();

    for (const asset of campaign.assets) {
      const sKey = extractStorageKey(asset.storageKey);
      if (sKey) keysToDelete.add(sKey);

      const mKey = extractStorageKey(asset.mattedKey);
      if (mKey) keysToDelete.add(mKey);
    }

    for (const variation of campaign.variations) {
      const vKey = extractStorageKey(variation.renderedVideoKey);
      if (vKey) keysToDelete.add(vKey);

      const wKey = extractStorageKey(variation.renderedWebmKey);
      if (wKey) keysToDelete.add(wKey);

      const gKey = extractStorageKey(variation.renderedGifKey);
      if (gKey) keysToDelete.add(gKey);

      const tKey = extractStorageKey(variation.thumbnailKey);
      if (tKey) keysToDelete.add(tKey);
    }

    const keysArray = Array.from(keysToDelete);
    if (keysArray.length === 0) {
      return { deletedCount: 0 };
    }

    if (storage.deleteMany) {
      await storage.deleteMany(keysArray).catch((err) => {
        console.warn(`[Storage Cleanup] Batch delete error for campaign ${campaignId}:`, err);
      });
    } else {
      await Promise.allSettled(
        keysArray.map(async (key) => {
          try {
            await storage.delete(key);
          } catch (err) {
            console.warn(`[Storage Cleanup] Failed to delete key ${key}:`, err);
          }
        })
      );
    }

    return { deletedCount: keysArray.length };
  } catch (error) {
    console.error(`[Storage Cleanup] Error cleaning up assets for campaign ${campaignId}:`, error);
    return { deletedCount: 0 };
  }
}

export interface PruneCacheOptions {
  maxAgeMs?: number; // Default: 48 hours
  dryRun?: boolean;
}

export interface PruneCacheResult {
  scannedCount: number;
  cleanedCount: number;
  freedBytes: number;
  freedMB: number;
  errors: string[];
}

/**
 * Sweeps and prunes expired or orphaned temporary cache files in:
 * - public/assets/cache/ecommerce/
 * - public/assets/cache/ecommerce/images/
 * - storage/cache/ecommerce/
 *
 * Checks file modification time against maxAgeMs (default 48 hours)
 * and cross-references active campaigns in the database to avoid deleting referenced assets.
 */
export async function pruneExpiredEcommerceCache(
  options: PruneCacheOptions = {}
): Promise<PruneCacheResult> {
  const maxAgeMs = options.maxAgeMs ?? 48 * 60 * 60 * 1000; // 48 Hours
  const dryRun = options.dryRun ?? false;
  const now = Date.now();

  const result: PruneCacheResult = {
    scannedCount: 0,
    cleanedCount: 0,
    freedBytes: 0,
    freedMB: 0,
    errors: [],
  };

  // Directories to scan
  const targetDirs = [
    path.join(process.cwd(), "public", "assets", "cache", "ecommerce"),
    path.join(process.cwd(), "public", "assets", "cache", "ecommerce", "images"),
    path.join(process.cwd(), "storage", "cache", "ecommerce"),
  ];

  // 1. Gather active database fingerprints to protect active campaigns
  let activeCampaignMetadata = "";
  try {
    const campaigns = await prisma.productCampaign.findMany({
      select: { rawMetadata: true },
    });
    activeCampaignMetadata = campaigns.map((c) => c.rawMetadata).join(" ");
  } catch (dbErr) {
    // If database lookup is unavailable (e.g. during standalone test), continue gracefully
    console.warn("[Cache Pruning] Database fingerprint query skipped or failed:", dbErr);
  }

  // 2. Scan and prune eligible expired files
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (entry.name.startsWith(".")) continue; // Skip hidden/gitkeep

        const filePath = path.join(dir, entry.name);
        result.scannedCount++;

        try {
          const stat = fs.statSync(filePath);
          const age = now - stat.mtimeMs;

          if (age > maxAgeMs) {
            // Check if active campaign metadata references this file
            if (activeCampaignMetadata && activeCampaignMetadata.includes(entry.name)) {
              // Still actively referenced in a product campaign, do not delete
              continue;
            }

            const fileSize = stat.size;
            if (!dryRun) {
              fs.unlinkSync(filePath);
            }

            result.cleanedCount++;
            result.freedBytes += fileSize;
          }
        } catch (fileErr) {
          const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
          result.errors.push(`Failed to inspect/delete ${entry.name}: ${msg}`);
        }
      }
    } catch (dirErr) {
      const msg = dirErr instanceof Error ? dirErr.message : String(dirErr);
      result.errors.push(`Failed to read cache directory ${dir}: ${msg}`);
    }
  }

  result.freedMB = Math.round((result.freedBytes / (1024 * 1024)) * 100) / 100;
  return result;
}

export interface CleanupTempFilesOptions {
  maxAgeMs?: number; // default: 24h
  dryRun?: boolean;
}

/**
 * Sweeps and deletes orphaned temporary files (e.g. tmp-props-*.json from Remotion renders,
 * storage/temp/, and transient scratch files) older than the specified retention threshold.
 */
export async function cleanupStaleTempFiles(
  options: CleanupTempFilesOptions = {}
): Promise<PruneCacheResult> {
  const { maxAgeMs = 24 * 60 * 60 * 1000, dryRun = false } = options;
  const now = Date.now();

  const result: PruneCacheResult = {
    scannedCount: 0,
    cleanedCount: 0,
    freedBytes: 0,
    freedMB: 0,
    errors: [],
  };

  const rootDir = process.cwd();

  // 1. Root directory tmp-props-*.json or tmp-*.json
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (
        entry.name.startsWith("tmp-props-") ||
        entry.name.startsWith("tmp-remotion-") ||
        (entry.name.startsWith("tmp-") && entry.name.endsWith(".json"))
      ) {
        result.scannedCount++;
        const filePath = path.join(rootDir, entry.name);
        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > maxAgeMs) {
            const size = stat.size;
            if (!dryRun) {
              fs.unlinkSync(filePath);
            }
            result.cleanedCount++;
            result.freedBytes += size;
          }
        } catch (e: unknown) {
          result.errors.push(`Failed to clean ${entry.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Failed to scan root temp files: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Storage temp directories
  const storageTempDirs = [
    path.join(rootDir, "storage", "temp"),
    path.join(rootDir, "storage", "cache", "temp"),
    path.join(rootDir, "public", "assets", "temp"),
  ];

  for (const dir of storageTempDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (entry.name.startsWith(".")) continue;
        result.scannedCount++;
        const filePath = path.join(dir, entry.name);
        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > maxAgeMs) {
            const size = stat.size;
            if (!dryRun) {
              fs.unlinkSync(filePath);
            }
            result.cleanedCount++;
            result.freedBytes += size;
          }
        } catch (e: unknown) {
          result.errors.push(`Failed to clean ${entry.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (err: unknown) {
      result.errors.push(`Failed to scan temp dir ${dir}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  result.freedMB = Math.round((result.freedBytes / (1024 * 1024)) * 100) / 100;
  return result;
}

export interface PruneDbRecordsResult {
  deletedNotificationsCount: number;
  deletedJobLogsCount: number;
}

/**
 * Prunes expired historical DB records to keep the PostgreSQL/SQLite database lean:
 * - Read notifications older than retention days (default: 30 days)
 * - Old pipeline JobLogs older than retention days (default: 14 days)
 */
export async function pruneExpiredDbRecords(
  options: { notificationRetentionDays?: number; jobLogRetentionDays?: number } = {}
): Promise<PruneDbRecordsResult> {
  const { notificationRetentionDays = 30, jobLogRetentionDays = 14 } = options;

  const notificationThreshold = new Date(Date.now() - notificationRetentionDays * 24 * 60 * 60 * 1000);
  const jobLogThreshold = new Date(Date.now() - jobLogRetentionDays * 24 * 60 * 60 * 1000);

  const notifResult = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: notificationThreshold },
      isRead: true,
    },
  });

  const jobLogResult = await prisma.jobLog.deleteMany({
    where: {
      createdAt: { lt: jobLogThreshold },
    },
  });

  return {
    deletedNotificationsCount: notifResult.count,
    deletedJobLogsCount: jobLogResult.count,
  };
}



