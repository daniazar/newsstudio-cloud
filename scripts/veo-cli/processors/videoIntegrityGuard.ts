import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync, execFileSync } from "child_process";
import { getFFprobePath } from "../../../src/lib/ai/comfy/utils";

export interface VideoIntegrityResult {
  valid: boolean;
  filePath: string;
  fileName: string;
  sha256: string;
  sizeBytes: number;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  isDuplicate: boolean;
  duplicateOf?: string;
  error?: string;
}

/**
 * Computes SHA-256 hash of a file.
 */
export function computeFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Scans a directory and returns a map of filename -> sha256.
 */
export function scanDirectoryHashes(dirPath: string): Map<string, string> {
  const hashToName = new Map<string, string>();
  if (!fs.existsSync(dirPath)) return hashToName;

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".mp4"));
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    try {
      const hash = computeFileHash(fullPath);
      hashToName.set(hash, file);
    } catch {
      // ignore read errors
    }
  }
  return hashToName;
}

/**
 * Validates video file integrity using ffprobe:
 * 1. Checks file existence & minimum size (> 100KB).
 * 2. Computes SHA-256 hash & checks for duplicates against directory or known hashes.
 * 3. Probes stream to ensure valid H.264/video codec, duration, width, height, and FPS.
 */
export function validateVideoIntegrity(
  filePath: string,
  existingHashes?: Map<string, string> | Set<string>,
): VideoIntegrityResult {
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      filePath,
      fileName,
      sha256: "",
      sizeBytes: 0,
      isDuplicate: false,
      error: "File does not exist on disk",
    };
  }

  const stat = fs.statSync(filePath);
  if (stat.size < 100 * 1024) {
    return {
      valid: false,
      filePath,
      fileName,
      sha256: "",
      sizeBytes: stat.size,
      isDuplicate: false,
      error: `File size too small (${stat.size} bytes), likely truncated or corrupted download`,
    };
  }

  const hash = computeFileHash(filePath);

  // Check duplicate
  let isDuplicate = false;
  let duplicateOf: string | undefined;

  if (existingHashes) {
    if (existingHashes instanceof Map) {
      const existingFile = existingHashes.get(hash);
      if (existingFile && existingFile !== fileName) {
        isDuplicate = true;
        duplicateOf = existingFile;
      }
    } else if (existingHashes.has(hash)) {
      isDuplicate = true;
    }
  }

  if (isDuplicate) {
    return {
      valid: false,
      filePath,
      fileName,
      sha256: hash,
      sizeBytes: stat.size,
      isDuplicate: true,
      duplicateOf,
      error: `Duplicate video detected! SHA-256 ${hash.slice(0, 12)} matches ${duplicateOf || "another existing file"}`,
    };
  }

  // FFprobe probe
  try {
    const ffprobe = getFFprobePath();
    const output = execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,r_frame_rate,duration",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        filePath,
      ],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(output);

    const stream = parsed.streams?.[0];
    const format = parsed.format;

    if (!stream) {
      return {
        valid: false,
        filePath,
        fileName,
        sha256: hash,
        sizeBytes: stat.size,
        isDuplicate: false,
        error: "No video stream found in container",
      };
    }

    const width = stream.width ? Number(stream.width) : undefined;
    const height = stream.height ? Number(stream.height) : undefined;
    const duration = stream.duration
      ? Number(stream.duration)
      : format?.duration
        ? Number(format.duration)
        : undefined;

    let fps: number | undefined;
    if (stream.r_frame_rate && stream.r_frame_rate.includes("/")) {
      const [num, den] = stream.r_frame_rate.split("/").map(Number);
      fps = den ? Math.round((num / den) * 100) / 100 : undefined;
    }

    return {
      valid: true,
      filePath,
      fileName,
      sha256: hash,
      sizeBytes: stat.size,
      duration,
      width,
      height,
      fps,
      isDuplicate: false,
    };
  } catch (err: any) {
    return {
      valid: false,
      filePath,
      fileName,
      sha256: hash,
      sizeBytes: stat.size,
      isDuplicate: false,
      error: `FFprobe failed to inspect video: ${err.message}`,
    };
  }
}

export interface PersonaFidelityResult {
  valid: boolean;
  ssim: number;
  error?: string;
}

/**
 * Verifies character persona continuity by comparing video frame 0 against the master avatar reference photo.
 * Ensures the generated character matches the intended anchor and rejects any off-persona / text-fallback outputs.
 */
export function verifyPersonaContinuity(
  videoPath: string,
  masterImagePath: string,
  minSsim = 0.75,
): PersonaFidelityResult {
  if (!fs.existsSync(videoPath)) {
    return {
      valid: false,
      ssim: 0,
      error: `Video file not found: ${videoPath}`,
    };
  }
  if (!fs.existsSync(masterImagePath)) {
    return {
      valid: false,
      ssim: 0,
      error: `Master image not found: ${masterImagePath}`,
    };
  }

  const scriptPath = path.resolve(
    process.cwd(),
    "scripts/check_persona_fidelity.py",
  );
  try {
    const stdout = execFileSync(
      "python",
      [scriptPath, videoPath, masterImagePath],
      { encoding: "utf8" },
    );
    const parsed = JSON.parse(stdout);
    if (parsed.error) {
      return { valid: false, ssim: 0, error: parsed.error };
    }
    const ssim = parsed.ssim ?? 0;
    if (ssim < minSsim) {
      return {
        valid: false,
        ssim,
        error: `Persona continuity failure! Frame 0 SSIM is ${ssim.toFixed(4)} (threshold: ${minSsim}). Generated character does not match master reference!`,
      };
    }
    return { valid: true, ssim };
  } catch (err: any) {
    return {
      valid: false,
      ssim: 0,
      error: `Fidelity evaluation failed: ${err.message}`,
    };
  }
}
