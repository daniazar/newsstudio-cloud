/**
 * scripts/veo-cli/artifactManager.ts
 *
 * Artifact organization, directory routing, and file sync manager for Google Veo video outputs.
 */

import fs from "fs";
import path from "path";

export function getVeoActionLoopsDir(): string {
  const dir = path.join(process.cwd(), "public", "assets", "action_loops", "veo");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getVeoBrollDir(): string {
  const dir = path.join(process.cwd(), "public", "assets", "broll", "veo");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getVeoStudioLoopsDir(): string {
  const dir = path.join(process.cwd(), "public", "assets", "studio_loops", "veo");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function printClickablePath(absolutePath: string) {
  const normalized = absolutePath.replace(/\\/g, "/");
  console.log(`\x1b[36mfile:///${normalized}\x1b[0m`);
}

/**
 * Searches the Antigravity artifact directory for recently produced .mp4 video files
 */
export function findAndSyncVideoArtifact(
  baseName: string,
  startTimeMs: number = 0,
  targetDestination?: string
): string | null {
  const targetDir = targetDestination
    ? (fs.existsSync(targetDestination) && fs.statSync(targetDestination).isDirectory()
        ? targetDestination
        : path.dirname(targetDestination))
    : getVeoActionLoopsDir();

  const directTargetFile = targetDestination && path.extname(targetDestination)
    ? targetDestination
    : path.join(targetDir, `${baseName}.mp4`);

  if (fs.existsSync(directTargetFile)) {
    const stats = fs.statSync(directTargetFile);
    if (stats.mtimeMs >= startTimeMs - 5000 && stats.size > 100000) {
      return directTargetFile;
    }
  }

  // Scan Antigravity brain and flow-output directories
  const baseHome = process.env.USERPROFILE || "C:\\Users\\danie";
  const searchDirs = [
    path.join(baseHome, "flow-output"),
    path.join(baseHome, ".gemini", "antigravity", "brain"),
    path.join(baseHome, ".gemini", "antigravity-cli", "brain"),
    path.join(baseHome, ".gemini", "antigravity-ide", "brain"),
    path.join(baseHome, ".gemini", "brain"),
    path.join(process.cwd(), "public", "assets", "broll"),
    path.join(process.cwd(), "public", "assets", "action_loops", "veo"),
  ];

  for (const sDir of searchDirs) {
    if (!fs.existsSync(sDir)) continue;
    try {
      // 1. Direct file check in this directory
      const files = fs.readdirSync(sDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith(".mp4") && (file.toLowerCase().includes(baseName.toLowerCase()) || Date.now() - fs.statSync(path.join(sDir, file)).mtimeMs < 180000)) {
          const srcPath = path.join(sDir, file);
          const stats = fs.statSync(srcPath);
          if (stats.size > 100000 && (startTimeMs === 0 || stats.mtimeMs >= startTimeMs - 5000)) {
            const destPath = directTargetFile;
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(srcPath, destPath);
            return destPath;
          }
        }
      }

      // 2. Scan one subfolder level (e.g. brain/<conv-id>/)
      for (const sub of files) {
        const subPath = path.join(sDir, sub);
        try {
          if (fs.statSync(subPath).isDirectory()) {
            const subFiles = fs.readdirSync(subPath);
            for (const file of subFiles) {
              if (file.toLowerCase().endsWith(".mp4") && file.toLowerCase().includes(baseName.toLowerCase())) {
                const srcPath = path.join(subPath, file);
                const stats = fs.statSync(srcPath);
                if (stats.size > 100000 && (startTimeMs === 0 || stats.mtimeMs >= startTimeMs - 5000)) {
                  const destPath = directTargetFile;
                  fs.mkdirSync(path.dirname(destPath), { recursive: true });
                  fs.copyFileSync(srcPath, destPath);
                  return destPath;
                }
              }
            }
          }
        } catch {}
      }
    } catch {}
  }

  return null;
}

