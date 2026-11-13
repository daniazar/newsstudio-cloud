/**
 * src/lib/security/pathSanitizer.ts
 *
 * Path traversal sanitization and confinement utilities to prevent Arbitrary File Read (LFI)
 * and unauthorized filesystem access across media processing endpoints.
 */

import path from "path";
import fs from "fs";

/**
 * Checks whether `targetPath` resides strictly inside `parentDir` without escaping.
 */
export function isPathInside(parentDir: string, targetPath: string): boolean {
  const resolvedParent = path.resolve(parentDir);
  const resolvedTarget = path.resolve(targetPath);

  if (resolvedParent === resolvedTarget) return true;
  return resolvedTarget.startsWith(resolvedParent + path.sep);
}

/**
 * Confines a user-supplied path to allowed root directories.
 * Prevents traversal attacks like `../../etc/passwd` or `C:\Windows\...`.
 */
export function resolveSafeMediaFilePath(
  userInput: string,
  allowedDirs: string[] = [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "storage"),
  ],
  allowedExtensions?: string[]
): string | null {
  if (!userInput || typeof userInput !== "string") return null;
  // Guard against null byte injection
  if (userInput.includes("\0")) return null;

  // Normalize path separators
  const normalized = userInput.replace(/\\/g, "/");

  // Determine potential relative candidate paths
  const relativeCandidates: string[] = [];

  if (normalized.includes("/public/")) {
    relativeCandidates.push(normalized.split("/public/")[1]);
  }
  if (normalized.includes("/storage/")) {
    relativeCandidates.push(normalized.split("/storage/")[1]);
  }
  relativeCandidates.push(normalized.replace(/^(\.[\/\\]|\/+)+/, ""));
  relativeCandidates.push(path.basename(normalized));

  for (const baseDir of allowedDirs) {
    const resolvedBase = path.resolve(baseDir);

    // If direct absolute path provided, test confinement first
    if (path.isAbsolute(userInput)) {
      const resolvedInput = path.resolve(userInput);
      if (isPathInside(resolvedBase, resolvedInput) && fs.existsSync(resolvedInput)) {
        if (allowedExtensions && !hasValidExtension(resolvedInput, allowedExtensions)) {
          return null;
        }
        return resolvedInput;
      }
    }

    // Try relative candidates inside baseDir
    for (const rel of relativeCandidates) {
      const candidate = path.resolve(resolvedBase, rel);
      if (isPathInside(resolvedBase, candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        if (allowedExtensions && !hasValidExtension(candidate, allowedExtensions)) {
          return null;
        }
        return candidate;
      }
    }
  }

  return null;
}

function hasValidExtension(filePath: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, "");
  return allowedExtensions.map((e) => e.toLowerCase().replace(/^\./, "")).includes(ext);
}

/**
 * Validates a voice sample filename against path traversal and ensures valid audio extension.
 * Returns the sanitized basename or null if invalid.
 */
export function validateVoiceFilename(filename: string): string | null {
  if (!filename || typeof filename !== "string") return null;
  const safeFilename = path.basename(filename);
  if (!/^[a-zA-Z0-9_.-]+\.(wav|mp3|ogg)$/i.test(safeFilename)) {
    return null;
  }
  return safeFilename;
}

/**
 * Validates a motion output filename against path traversal and ensures valid video/image extension.
 * Returns the sanitized basename or null if invalid.
 */
export function validateOutputFilename(filename: string): string | null {
  if (!filename || typeof filename !== "string") return null;
  const safeFilename = path.basename(filename);
  if (!/^[a-zA-Z0-9_.-]+\.(mp4|webm|png|jpg|jpeg|gif)$/i.test(safeFilename)) {
    return null;
  }
  return safeFilename;
}
