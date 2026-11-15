/**
 * src/lib/storage/localAssets.ts
 *
 * Server/worker-only helper that discovers local public/assets/avatars directories
 * and resolves media paths & URLs (relative paths, /r2/... proxies, or Cloudflare R2 URLs)
 * to files on the local filesystem before falling back to remote R2 downloads.
 */

import fs from "fs";
import path from "path";
import { PERSONA_VEO_DIR_MAP } from "@/lib/ecommerce/actionLoopFsmEngine";

const EXCLUDED_VEO_DIRS = new Set([
  "old",
  "old2",
  "old3",
  "backups",
  "backup",
  "_retakes",
  "_extra_takes",
  "_unmapped",
  "analysis",
]);

const KNOWN_WEB_ROOT_PREFIXES = new Set([
  "assets",
  "avatars",
  "studio_environments",
  "studio_plates",
  "music",
  "sfx",
  "r2",
]);

function isExistingDir(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function isExistingFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function dedupeExistingDirs(candidates: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of candidates) {
    if (!candidate || !candidate.trim()) continue;
    const resolved = path.resolve(candidate.trim());
    const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) continue;
    if (isExistingDir(resolved)) {
      seen.add(key);
      result.push(resolved);
    }
  }

  return result;
}

function isInsideRoot(rootDir: string, candidatePath: string): boolean {
  const rootAbs = path.resolve(rootDir);
  const candAbs = path.resolve(candidatePath);
  const prefix = rootAbs.endsWith(path.sep) ? rootAbs : rootAbs + path.sep;
  if (process.platform === "win32") {
    return candAbs.toLowerCase().startsWith(prefix.toLowerCase());
  }
  return candAbs.startsWith(prefix);
}

/**
 * Returns all candidate local `public/` roots in priority order.
 */
export function getLocalPublicRoots(): string[] {
  const cwd = process.cwd();
  return dedupeExistingDirs([
    process.env.LOCAL_PUBLIC_ROOT,
    path.resolve(cwd, "public"),
    path.resolve(cwd, "..", "newsStudio", "public"),
    path.resolve(cwd, "..", "..", "newsStudio", "public"),
    path.resolve(cwd, "..", "..", "..", "newsStudio", "public"),
  ]);
}

/**
 * Returns all candidate `assets/action_loops` roots in priority order.
 */
export function getLocalActionLoopsRoots(): string[] {
  const publicRoots = getLocalPublicRoots();
  return dedupeExistingDirs([
    process.env.LOCAL_ACTION_LOOPS_ROOT,
    ...publicRoots.map((root) => path.join(root, "assets", "action_loops")),
  ]);
}

/**
 * Returns all candidate `avatars` roots in priority order.
 */
export function getLocalAvatarsRoots(): string[] {
  const publicRoots = getLocalPublicRoots();
  return dedupeExistingDirs([
    process.env.LOCAL_AVATARS_ROOT,
    ...publicRoots.map((root) => path.join(root, "avatars")),
  ]);
}

/**
 * Returns the primary local `public/` root containing heavy media (`avatars` or `assets/action_loops`),
 * falling back to `./public`.
 */
export function resolveLocalPublicRoot(): string {
  const roots = getLocalPublicRoots();
  const richRoot = roots.find(
    (root) =>
      isExistingDir(path.join(root, "assets", "action_loops")) ||
      isExistingDir(path.join(root, "avatars"))
  );
  return richRoot || roots[0] || path.resolve(process.cwd(), "public");
}

/**
 * Returns the local `assets/action_loops/veo` directory.
 */
export function resolveLocalVeoDir(): string {
  const loopRoots = getLocalActionLoopsRoots();
  for (const loopRoot of loopRoots) {
    const veoCandidate = path.join(loopRoot, "veo");
    if (isExistingDir(veoCandidate)) {
      return veoCandidate;
    }
  }
  return path.join(resolveLocalPublicRoot(), "assets", "action_loops", "veo");
}

/**
 * Returns the primary local `avatars` directory.
 */
export function resolveLocalAvatarsDir(): string {
  const roots = getLocalAvatarsRoots();
  return roots[0] || path.join(resolveLocalPublicRoot(), "avatars");
}

/**
 * Normalizes a local relative path, web root path, `/r2/...` proxy path, or R2/app URL
 * into a safe POSIX relative key inside `public/` (e.g. `assets/action_loops/veo/...`).
 * Returns `null` for external URLs or unsafe traversal inputs.
 */
export function normalizeAssetRelPath(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("\0")) return null;

  let relCandidate = trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }

    const configuredPublicBase = process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.trim().replace(/\/+$/, "");
    const configuredPrefix = (process.env.S3_KEY_PREFIX || "").trim().replace(/^\/+|\/+$/g, "");
    const urlWithoutQuery = `${parsed.origin}${parsed.pathname}`;

    if (configuredPublicBase && urlWithoutQuery.startsWith(configuredPublicBase)) {
      relCandidate = urlWithoutQuery.slice(configuredPublicBase.length);
      if (configuredPrefix && relCandidate.replace(/^\/+/, "").startsWith(`${configuredPrefix}/`)) {
        relCandidate = relCandidate.replace(/^\/+/, "").slice(configuredPrefix.length + 1);
      }
    } else if (/^pub-[a-z0-9]+\.r2\.dev$/i.test(parsed.hostname)) {
      relCandidate = parsed.pathname.replace(/^\/+/, "");
      if (configuredPrefix && relCandidate.startsWith(`${configuredPrefix}/`)) {
        relCandidate = relCandidate.slice(configuredPrefix.length + 1);
      } else if (relCandidate.startsWith("newsstudio/")) {
        relCandidate = relCandidate.slice("newsstudio/".length);
      }
    } else if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "newsstudio.up.railway.app"
    ) {
      const cleanPath = parsed.pathname.replace(/^\/+/, "");
      const topSegment = cleanPath.split("/")[0]?.toLowerCase() || "";
      if (!KNOWN_WEB_ROOT_PREFIXES.has(topSegment)) {
        return null;
      }
      relCandidate = cleanPath;
    } else {
      return null;
    }
  }

  // Strip query string and fragment hash
  relCandidate = relCandidate.split(/[?#]/)[0] || "";
  relCandidate = relCandidate.replace(/\\/g, "/");

  if (/^[a-z]:/i.test(relCandidate) || relCandidate.startsWith("//")) {
    return null;
  }

  relCandidate = relCandidate.replace(/^\/+/, "");
  if (relCandidate.startsWith("r2/")) {
    relCandidate = relCandidate.slice(3);
  }
  if (!relCandidate) return null;

  const rawSegments = relCandidate.split("/").filter((seg) => seg.length > 0);
  if (rawSegments.length === 0 || rawSegments.some((seg) => seg === "..")) {
    return null;
  }

  const normalized = path.posix.normalize(rawSegments.join("/"));
  if (!normalized || normalized === "." || normalized.startsWith("..") || normalized.startsWith("/")) {
    return null;
  }

  return normalized;
}

function resolveInsideRoot(rootDir: string, posixRelPath: string): string | null {
  const resolved = path.resolve(rootDir, ...posixRelPath.split("/"));
  if (!isInsideRoot(rootDir, resolved)) {
    return null;
  }
  return isExistingFile(resolved) ? resolved : null;
}

/**
 * Resolves a URL, web path, or relative key to an existing file on disk.
 * Checks override roots (`LOCAL_ACTION_LOOPS_ROOT`, `LOCAL_AVATARS_ROOT`, `LOCAL_PUBLIC_ROOT`)
 * and repo-relative public directories before returning `null`.
 */
export function resolveLocalPublicFile(urlOrRelPath: string): string | null {
  if (!urlOrRelPath || typeof urlOrRelPath !== "string") return null;
  const trimmed = urlOrRelPath.trim();
  if (!trimmed || trimmed.includes("\0")) return null;

  const cleanOsCandidate = trimmed.split(/[?#]/)[0] || "";
  const isOsAbsPath =
    /^[a-z]:[\\/]/i.test(cleanOsCandidate) ||
    cleanOsCandidate.startsWith("\\\\") ||
    (process.platform !== "win32" &&
      cleanOsCandidate.startsWith("/") &&
      !KNOWN_WEB_ROOT_PREFIXES.has(cleanOsCandidate.slice(1).split("/")[0]?.toLowerCase() || ""));

  if (isOsAbsPath && isExistingFile(cleanOsCandidate)) {
    return path.resolve(cleanOsCandidate);
  }

  const rel = normalizeAssetRelPath(trimmed);
  if (!rel) return null;

  if (rel.startsWith("assets/action_loops/")) {
    const subRel = rel.slice("assets/action_loops/".length);
    for (const loopRoot of getLocalActionLoopsRoots()) {
      const match = resolveInsideRoot(loopRoot, subRel);
      if (match) return match;
    }
  }

  if (rel.startsWith("avatars/")) {
    const subRel = rel.slice("avatars/".length);
    for (const avatarRoot of getLocalAvatarsRoots()) {
      const match = resolveInsideRoot(avatarRoot, subRel);
      if (match) return match;
    }
  }

  for (const publicRoot of getLocalPublicRoots()) {
    const match = resolveInsideRoot(publicRoot, rel);
    if (match) return match;
  }

  return null;
}

function isExcludedVeoDirName(dirName: string): boolean {
  const lower = dirName.toLowerCase();
  return EXCLUDED_VEO_DIRS.has(lower) || lower.includes("backup");
}

function extractPoseCode(input: string): "M1" | "M2" | "M3" | "M4" | "M5" | null {
  const upper = input.toUpperCase();
  const mMatch = upper.match(/\b(M[1-5])(?:_|\b)/);
  if (mMatch?.[1]) {
    return mMatch[1] as "M1" | "M2" | "M3" | "M4" | "M5";
  }
  const pMatch = upper.match(/\bP0?([1-5])(?:_|\b)/);
  if (pMatch?.[1]) {
    return `M${pMatch[1]}` as "M1" | "M2" | "M3" | "M4" | "M5";
  }
  return null;
}

function pickFromFilePool(files: string[], dirName: string, preferredClipOrPose?: string): string | null {
  if (files.length === 0) return null;
  const sorted = [...files].sort((a, b) => a.localeCompare(b));

  if (preferredClipOrPose && preferredClipOrPose.trim()) {
    const cleanClip = preferredClipOrPose.trim().replace(/\.mp4$/i, "").toLowerCase();
    const exactCandidates = new Set([
      `${cleanClip}.mp4`,
      `${dirName.toLowerCase()}_${cleanClip}.mp4`,
    ]);
    const exactMatch = sorted.find((f) => exactCandidates.has(f.toLowerCase()));
    if (exactMatch) return exactMatch;

    const pose = extractPoseCode(preferredClipOrPose);
    if (pose) {
      const poseLower = pose.toLowerCase();
      const posePriority = [
        `${dirName.toLowerCase()}_${poseLower}_loop_v1.mp4`,
        `${dirName.toLowerCase()}_${poseLower}_loop_v2.mp4`,
        `${dirName.toLowerCase()}_${poseLower}_dynamic_v1.mp4`,
      ];
      for (const target of posePriority) {
        const hit = sorted.find((f) => f.toLowerCase() === target);
        if (hit) return hit;
      }

      const anyPoseLoop = sorted.find(
        (f) =>
          f.toLowerCase().includes(`_${poseLower}_`) &&
          !f.toLowerCase().includes("_t") &&
          !/t\d_to_\d/i.test(f)
      );
      if (anyPoseLoop) return anyPoseLoop;
    }
  }

  const defaultPriority = [
    `${dirName.toLowerCase()}_m1_loop_v1.mp4`,
    `${dirName.toLowerCase()}_m1_dynamic_v1.mp4`,
  ];
  for (const target of defaultPriority) {
    const hit = sorted.find((f) => f.toLowerCase() === target);
    if (hit) return hit;
  }

  return (
    sorted.find((f) => /_m1_/i.test(f) && !/_t\d_to_\d/i.test(f)) ||
    sorted.find((f) => /_loop_/i.test(f)) ||
    sorted.find((f) => /_dynamic_/i.test(f)) ||
    sorted[0] ||
    null
  );
}

/**
 * Resolves the best local action loop `.mp4` on disk for a persona (across all 35+ local persona folders),
 * strictly preferring clean canonical files (no `__` candidate suffix) and excluding archive/backup folders.
 */
export function resolveLocalActionLoopVideo(
  personaId: string = "ruby",
  preferredClipOrPose?: string
): string | null {
  if (preferredClipOrPose && (preferredClipOrPose.includes("/") || preferredClipOrPose.includes("\\"))) {
    const direct = resolveLocalPublicFile(preferredClipOrPose);
    if (direct) return direct;
  }

  const normId = (personaId || "ruby").toLowerCase().trim();
  const veoDir = resolveLocalVeoDir();

  if (isExistingDir(veoDir)) {
    const entries = fs
      .readdirSync(veoDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !isExcludedVeoDirName(d.name));

    const mappedDirName = PERSONA_VEO_DIR_MAP[normId];
    const dirCandidates: string[] = [];

    if (mappedDirName) {
      dirCandidates.push(mappedDirName);
    }
    for (const ent of entries) {
      const lower = ent.name.toLowerCase();
      if (lower === normId || lower.startsWith(`${normId}_`)) {
        if (!dirCandidates.includes(ent.name)) {
          dirCandidates.push(ent.name);
        }
      }
    }
    if (normId.length >= 3) {
      for (const ent of entries) {
        if (ent.name.toLowerCase().includes(normId) && !dirCandidates.includes(ent.name)) {
          dirCandidates.push(ent.name);
        }
      }
    }

    for (const dirName of dirCandidates) {
      const subPath = path.join(veoDir, dirName);
      if (!isExistingDir(subPath)) continue;

      const mp4Files = fs.readdirSync(subPath).filter((f) => f.toLowerCase().endsWith(".mp4"));
      if (mp4Files.length === 0) continue;

      const canonicalFiles = mp4Files.filter((f) => !f.includes("__"));
      const chosen =
        pickFromFilePool(canonicalFiles, dirName, preferredClipOrPose) ||
        pickFromFilePool(mp4Files, dirName, preferredClipOrPose);

      if (chosen) {
        return path.join(subPath, chosen);
      }
    }

    const legacyPoolCandidates = [
      path.join(veoDir, `veo_${normId}_p01_standing_clasped_9x16_master.mp4`),
      path.join(veoDir, `veo_${normId}_p01_subtle_beat_4s_master.mp4`),
      path.join(veoDir, `veo_${normId}_p03_idle_4s_9672.mp4`),
    ];
    for (const cand of legacyPoolCandidates) {
      if (isExistingFile(cand)) return cand;
    }
  }

  const cwd = process.cwd();
  const fallbackCandidates = [
    path.join(cwd, "storage", "cache", "latents", normId, "video.mp4"),
    path.join(cwd, "storage", "cache", "latents", normId, "B01_p01_neutral_clasped", "video.mp4"),
  ];
  for (const cand of fallbackCandidates) {
    if (isExistingFile(cand)) return cand;
  }

  const publicFallbacks = [
    `action_library/${normId}_idle_loop.mp4`,
    `action_library/${normId}_standing_bg.mp4`,
    `avatars/${normId}.mp4`,
  ];
  for (const rel of publicFallbacks) {
    const resolved = resolveLocalPublicFile(rel);
    if (resolved) return resolved;
  }

  return null;
}
