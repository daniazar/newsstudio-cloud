/**
 * src/lib/video/remotionUtils.ts
 *
 * Centralized Remotion CLI & Bundle Utilities.
 * Detects persistent pre-bundled Remotion compositions (build/index.html)
 * to skip the 25-30s Webpack compilation overhead during headless rendering.
 * Includes automated freshness detection against src/remotion/ to ensure
 * new layer modifications and editor fixes are never masked by stale bundles.
 */

import fs from "fs";
import path from "path";
import os from "os";

export interface RemotionEntryPointInfo {
  entryPoint: string;
  isPrebundled: boolean;
  isStale?: boolean;
  prebundlePath: string;
}

/**
 * Finds the latest modification time (mtimeMs) within a directory recursively.
 */
function getLatestDirMtime(dirPath: string): number {
  let latest = 0;
  if (!fs.existsSync(dirPath)) return latest;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        const subLatest = getLatestDirMtime(fullPath);
        if (subLatest > latest) latest = subLatest;
      } else {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs > latest) latest = stat.mtimeMs;
      }
    } catch {
      // Ignore stat errors for deleted or temporary files
    }
  }
  return latest;
}

/**
 * Checks whether the prebundled Remotion directory is stale compared to src/remotion/.
 */
export function isRemotionBundleStale(
  prebundlePath = path.resolve(process.cwd(), "build"),
  remotionSrcDir = path.resolve(process.cwd(), "src", "remotion")
): boolean {
  if (process.env.REMOTION_FORCE_FRESH === "true") return true;

  const indexPath = path.join(prebundlePath, "index.html");
  if (!fs.existsSync(indexPath)) return false;

  const bundleMtime = fs.statSync(indexPath).mtimeMs;
  const srcMtime = getLatestDirMtime(remotionSrcDir);

  // If any source file in src/remotion is newer than build/index.html (with 2s safety buffer)
  return srcMtime > bundleMtime + 2000;
}

/**
 * Resolves the Remotion CLI entry point.
 * If 'build/index.html' exists and is fresh, returns 'build' directly (<1.5s startup).
 * If the bundle is missing or stale compared to src/remotion, falls back to 'src/remotion/Root.tsx'
 * to ensure all editor optimizations and layer fixes reflect immediately.
 */
export function getRemotionEntryPoint(): RemotionEntryPointInfo {
  const prebundlePath = path.resolve(process.cwd(), "build");
  const indexPath = path.join(prebundlePath, "index.html");
  const hasPrebundle = fs.existsSync(indexPath);

  if (!hasPrebundle) {
    return {
      entryPoint: "src/remotion/Root.tsx",
      isPrebundled: false,
      isStale: false,
      prebundlePath,
    };
  }

  const isStale = isRemotionBundleStale(prebundlePath);
  if (isStale) {
    console.warn(
      `[Remotion] ⚠️ Pre-bundle at '${prebundlePath}' is older than recent changes in src/remotion/. ` +
        `Falling back to 'src/remotion/Root.tsx' to ensure latest editor updates are rendered. ` +
        `(Run 'npm run remotion:bundle' to re-cache).`
    );
    return {
      entryPoint: "src/remotion/Root.tsx",
      isPrebundled: false,
      isStale: true,
      prebundlePath,
    };
  }

  return {
    entryPoint: "build",
    isPrebundled: true,
    isStale: false,
    prebundlePath,
  };
}

/**
 * Resolves the direct Remotion CLI executable path from node_modules/.bin,
 * avoiding slow npx registry resolution overhead.
 */
export function getRemotionBinPath(): string {
  const isWin = process.platform === "win32";
  const remotionBin = path.join(process.cwd(), "node_modules", ".bin", isWin ? "remotion.cmd" : "remotion");
  if (fs.existsSync(remotionBin)) {
    return remotionBin;
  }
  return isWin ? "npx.cmd" : "npx";
}

/**
 * Calculates optimal Remotion render concurrency based on system RAM and CPU cores.
 * Caps at 6 concurrent workers to prevent NVDEC hardware decode session exhaustion on consumer GPUs.
 */
export function getOptimalRemotionConcurrency(isDraft = false): number {
  const logicalCores = os.cpus()?.length || 4;
  const totalRamGb = os.totalmem() ? Math.floor(os.totalmem() / (1024 * 1024 * 1024)) : 8;
  const maxWorkersByRam = Math.max(2, Math.floor(totalRamGb / 2.5));
  const maxWorkersByCpu = Math.max(2, Math.floor(logicalCores * 0.75));
  const concurrency = Math.min(6, Math.min(maxWorkersByRam, maxWorkersByCpu));

  return isDraft ? Math.min(logicalCores, concurrency + 2) : concurrency;
}
