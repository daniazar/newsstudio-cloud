/**
 * src/lib/video/presenterSanitizer.ts
 *
 * Neural Presenter Video Sanitizer & Transparent Companion Generator.
 * 1. Scans presenter videos to detect and heal pitch-black inpainting face boxes at the end of clips.
 * 2. Automatically generates 32-bit transparent VP9 WebM companion files for zero-jitter Remotion playback.
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Sanitizes an MP4 presenter video by replacing any frames that have corrupted black face boxes
 * with the last valid clean frame.
 */
export async function sanitizePresenterVideo(videoPath: string): Promise<boolean> {
  if (!videoPath || typeof videoPath !== "string" || videoPath.includes("\0") || !fs.existsSync(videoPath)) {
    return false;
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sanitize_presenter_video.py");
  if (!fs.existsSync(scriptPath)) {
    console.warn("[PresenterSanitizer] sanitize_presenter_video.py not found, skipping.");
    return false;
  }

  try {
    await execFileAsync("python", [scriptPath, videoPath]);
    return true;
  } catch (err: unknown) {
    console.warn(`[PresenterSanitizer] Failed to sanitize ${path.basename(videoPath)}:`, (err as Error)?.message || err);
    return false;
  }
}

/**
 * Ensures that a 32-bit transparent VP9 WebM companion file exists for an MP4 presenter video.
 * Returns the public URL of the transparent WebM (e.g. /assets/cache/ecommerce/...webm).
 */
export async function ensureTransparentWebmCompanion(mp4Path: string): Promise<string | null> {
  if (!mp4Path || typeof mp4Path !== "string" || mp4Path.includes("\0") || !fs.existsSync(mp4Path)) {
    return null;
  }

  const webmPath = mp4Path.replace(/\.mp4$/i, ".webm");
  const filename = path.basename(webmPath);
  const publicWebmUrl = `/assets/cache/ecommerce/${filename}`;

  // If already exists and valid size, return immediately
  if (fs.existsSync(webmPath) && fs.statSync(webmPath).size > 1000) {
    return publicWebmUrl;
  }

  const chromaScript = path.join(process.cwd(), "scripts", "fast_chroma_webm.py");
  if (!fs.existsSync(chromaScript)) return null;

  try {
    await execFileAsync("python", [chromaScript, mp4Path, webmPath]);
    if (fs.existsSync(webmPath) && fs.statSync(webmPath).size > 1000) {
      return publicWebmUrl;
    }
  } catch (err: unknown) {
    console.warn(`[PresenterSanitizer] WebM conversion failed for ${path.basename(mp4Path)}:`, (err as Error)?.message || err);
  }

  return null;
}

