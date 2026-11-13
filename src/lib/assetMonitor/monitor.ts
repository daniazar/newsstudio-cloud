/**
 * Asset Monitor — Checks the pending assets directory for AI-generated files.
 * Scans /public/assets/pending/[videoId]/ for .mp4 and .wav files.
 */

import fs from "fs";
import path from "path";
import type { AssetCheckResult } from "@/lib/types";
import { storage } from "@/lib/storage";

/**
 * Check if pending assets exist for a given video ID.
 * Looks in storage first, then falls back to /public/assets/pending/[videoId]/.
 */
export async function checkPendingAssets(
  videoId: string
): Promise<AssetCheckResult> {
  const result: AssetCheckResult = {
    videoId,
    hasPresenterVideo: false,
    hasPresenterAudio: false,
    hasBRollAssets: false,
    bRollPaths: [],
    isComplete: false,
  };

  // 1. Check storage abstraction layer first (in cloud deployments with MinIO/Azure)
  if (process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== "local") {
    try {
      const videoKey = `videos/${videoId}/presenter.mp4`;
      const audioKey = `audio/${videoId}/presenter.wav`;
      const hasVideo = await storage.exists(videoKey);
      const hasAudio = await storage.exists(audioKey);

      if (hasVideo) {
        result.hasPresenterVideo = true;
        result.presenterVideoPath = storage.getUrl(videoKey);
      }
      if (hasAudio) {
        result.hasPresenterAudio = true;
        result.presenterAudioPath = storage.getUrl(audioKey);
      }
      result.isComplete = result.hasPresenterVideo && result.hasPresenterAudio;
      if (result.isComplete) {
        return result;
      }
    } catch {
      // Non-fatal, check local fallback directory
    }
  }

  const pendingDir = path.resolve(
    process.cwd(),
    process.env.ASSETS_PENDING_DIR ?? "public/assets/pending",
    videoId
  );

  if (!fs.existsSync(pendingDir)) {
    return result;
  }

  const files = fs.readdirSync(pendingDir);

  for (const file of files) {
    const filePath = path.join(pendingDir, file);
    const ext = path.extname(file).toLowerCase();
    const name = path.basename(file, ext).toLowerCase();

    // Presenter video (lip-synced Ruby)
    if (
      (name.includes("presenter") || name.includes("ruby")) &&
      ext === ".mp4"
    ) {
      result.hasPresenterVideo = true;
      result.presenterVideoPath = filePath;
    }
    // Presenter audio
    else if (
      (name.includes("presenter") || name.includes("ruby") || name.includes("voice")) &&
      (ext === ".wav" || ext === ".mp3")
    ) {
      result.hasPresenterAudio = true;
      result.presenterAudioPath = filePath;
    }
    // B-roll assets
    else if (
      name.includes("broll") || name.includes("b-roll") || name.includes("scene")
    ) {
      result.hasBRollAssets = true;
      result.bRollPaths.push(filePath);
    }
  }

  // Assets are complete when we have at least the presenter video and audio
  result.isComplete = result.hasPresenterVideo && result.hasPresenterAudio;

  return result;
}
