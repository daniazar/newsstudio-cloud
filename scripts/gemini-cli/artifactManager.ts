/**
 * scripts/gemini-cli/artifactManager.ts
 *
 * Ultra-resilient discovery and synchronization of generated image artifacts
 * across Antigravity CLI and IDE brain directories.
 */

import fs from "fs";
import path from "path";

export function getCompositedScenesDir(): string {
  const dir = path.join(process.cwd(), "public", "studio_environments", "composited_scenes");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Discovers and copies newly generated images created AFTER startTimeMs.
 * If targetDestination is supplied, copies directly to targetDestination path or directory.
 */
export function findAndSyncArtifact(
  baseName: string,
  startTimeMs: number = Date.now() - 60000,
  targetDestination?: string
): string | null {
  const outputDir = targetDestination
    ? (fs.existsSync(targetDestination) && fs.statSync(targetDestination).isDirectory()
        ? targetDestination
        : path.dirname(targetDestination))
    : getCompositedScenesDir();

  // 1. Instant check: Was the file written directly to outputDir / targetDestination?
  const possibleExts = [".png", ".jpg", ".jpeg", ".webp"];
  for (const ext of possibleExts) {
    const directTarget = targetDestination && path.extname(targetDestination)
      ? targetDestination
      : path.join(outputDir, `${baseName}${ext}`);
    if (fs.existsSync(directTarget)) {
      const stat = fs.statSync(directTarget);
      if (stat.mtimeMs >= startTimeMs - 2000) {
        return directTarget;
      }
    }
  }

  // 2. Fallback scan across Antigravity brain artifact storage
  const baseHome = process.env.USERPROFILE || "C:/Users/danie";
  const searchDirs = [
    path.join(baseHome, ".gemini", "antigravity", "brain"),
    path.join(baseHome, ".gemini", "antigravity-cli", "brain"),
    path.join(baseHome, ".gemini", "antigravity-ide", "brain"),
    path.join(baseHome, ".gemini", "brain"),
    path.join(baseHome, ".gemini"),
  ];

  const tokens = baseName.toLowerCase().split(/[_ -]+/).filter((t) => t.length > 2);

  let bestMatch: { file: string; score: number; mtime: number } | null = null;
  let newestAfterStart: { file: string; mtime: number } | null = null;

  function scanDir(dir: string, depth: number = 0) {
    if (depth > 4) return;
    try {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (!f.startsWith(".") || f === ".tempmediaStorage") {
              scanDir(full, depth + 1);
            }
          } else {
            const ext = path.extname(f).toLowerCase();
            if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
              // STRICT CHECK: Only consider files modified AFTER startTimeMs (-2s margin)
              if (stat.mtimeMs >= startTimeMs - 2000) {
                if (!newestAfterStart || stat.mtimeMs > newestAfterStart.mtime) {
                  newestAfterStart = { file: full, mtime: stat.mtimeMs };
                }

                // Calculate token match score
                const lowerName = f.toLowerCase();
                let score = 0;
                if (lowerName.includes(baseName.toLowerCase())) {
                  score += 100;
                }
                for (const token of tokens) {
                  if (lowerName.includes(token)) score += 10;
                }

                if (score > 0) {
                  if (!bestMatch || score > bestMatch.score || (score === bestMatch.score && stat.mtimeMs > bestMatch.mtime)) {
                    bestMatch = { file: full, score, mtime: stat.mtimeMs };
                  }
                }
              }
            }
          }
        } catch {}
      }
    } catch {}
  }

  for (const sDir of searchDirs) {
    scanDir(sDir, 0);
  }

  // Only accept if a matching file with positive score was genuinely created after startTimeMs
  const chosen: string | null = bestMatch ? (bestMatch as any).file : newestAfterStart ? (newestAfterStart as any).file : null;

  if (chosen && fs.existsSync(chosen)) {
    const ext = path.extname(chosen);
    const destPath = targetDestination && path.extname(targetDestination)
      ? targetDestination
      : path.join(outputDir, `${baseName}${ext}`);
    
    const parentDir = path.dirname(destPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.copyFileSync(chosen, destPath);
    return destPath;
  }

  return null;
}

export function printClickablePath(filePath: string) {
  const formatted = filePath.replace(/\\/g, "/");
  console.log(`\n📁 Clickable Local File Path (Alt + Click to Open):`);
  console.log(`file:///${formatted}\n`);
}
