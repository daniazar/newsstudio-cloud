import fs from "fs";
import path from "path";
import { getPersonaById } from "@/lib/tts/personas";
import {
  resolveLocalActionLoopVideo,
  resolveLocalPublicFile,
  resolveLocalPublicRoot,
  resolveLocalVeoDir,
} from "@/lib/storage/localAssets";

// Avatar resolution map with automatic fallbacks for e-commerce personas
export const AVATAR_FALLBACK_MAP: Record<string, string> = {
  sofia: "sofia.png",
  elena: "camila.png",
  bryce: "mateo.png",
  ryan: "diego.png",
  amy: "isabel.png",
  ruby: "ruby.png",
  blaze: "blaze.png",
  chloe: "jade.png",
  marcus: "adrian.png",
};

export function resolveAvatarPath(personaId: string): string {
  const normalized = (personaId || "sofia").toLowerCase();

  // 1. Direct file check across local avatar/public roots
  const directPath = resolveLocalPublicFile(`avatars/${normalized}.png`);
  if (directPath) return directPath;

  const directRefPath = resolveLocalPublicFile(`avatars/${normalized}_ref.png`);
  if (directRefPath) return directRefPath;

  // 2. Check Persona Vault definition
  const vaultPersona = getPersonaById(normalized);
  if (vaultPersona?.avatarUrl) {
    const fromVault = resolveLocalPublicFile(vaultPersona.avatarUrl);
    if (fromVault) return fromVault;
  }

  // 3. Known commercial aliases
  const mappedFilename = AVATAR_FALLBACK_MAP[normalized] || "ruby.png";
  const mappedPath = resolveLocalPublicFile(`avatars/${mappedFilename}`);
  if (mappedPath) return mappedPath;

  // 4. Ultimate fallback to ruby.png
  return (
    resolveLocalPublicFile("avatars/ruby.png") ||
    path.join(resolveLocalPublicRoot(), "avatars", "ruby.png")
  );
}

export interface ResolvedDriver {
  driverPath: string;
  avatarId: string;
  isVideo: boolean;
}

function findCachedAvatarId(candidates: (string | undefined | null)[]): string | null {
  const avatarsDir = path.join(process.cwd(), "storage", "cache", "avatars");
  if (!fs.existsSync(avatarsDir)) return null;
  for (const c of candidates) {
    if (!c) continue;
    const clean = c.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (fs.existsSync(path.join(avatarsDir, clean))) {
      return clean;
    }
  }
  return null;
}

/**
 * Intelligently resolves the presenter driver asset (action loop video, attire image, avatar)
 * ensuring the exact loop or attire chosen by the user is used instead of falling back to default portrait.
 */
export function resolvePresenterDriver(options: {
  personaId?: string;
  videoUrl?: string;
  loopId?: string;
  attire?: string;
  avatarUrl?: string;
}): ResolvedDriver {
  const { personaId = "sofia", videoUrl, loopId, attire, avatarUrl } = options;

  // 1. Explicit videoUrl (local public roots, R2 URLs, or absolute paths)
  if (videoUrl && typeof videoUrl === "string" && videoUrl.trim()) {
    const cleanInput = videoUrl.trim();
    const sharedLocal = resolveLocalPublicFile(cleanInput);
    let localPath = sharedLocal || "";
    if (!localPath) {
      let cleanUrl = cleanInput;
      if (cleanUrl.startsWith("http")) {
        try {
          cleanUrl = new URL(cleanUrl).pathname;
        } catch {}
      }
      localPath = cleanUrl.startsWith("/")
        ? path.join(resolveLocalPublicRoot(), cleanUrl.replace(/^\//, ""))
        : path.isAbsolute(cleanUrl)
        ? cleanUrl
        : path.join(process.cwd(), cleanUrl);
    }

    if (localPath && fs.existsSync(localPath)) {
      const ext = path.extname(localPath).toLowerCase();
      const isVideo = [".mp4", ".webm", ".mov", ".mkv"].includes(ext);
      const base = path.basename(localPath, ext).toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const normalizedLoop = loopId ? loopId.toLowerCase().replace(/[^a-z0-9_]/g, "_") : "";
      const strippedLoop = normalizedLoop.replace(/^ruby_burgundy_/, "");
      const prefixedLoop = normalizedLoop ? `ruby_burgundy_${strippedLoop}` : "";

      const cachedAvatar = findCachedAvatarId([
        base,
        prefixedLoop,
        normalizedLoop,
        strippedLoop,
      ]);

      const avatarId = cachedAvatar || (normalizedLoop || base);
      return { driverPath: localPath, avatarId, isVideo };
    }
  }

  // 2. Action loop ID (resolve across any persona's veo folder first, then legacy Ruby paths)
  if (loopId && typeof loopId === "string" && loopId.trim()) {
    const cleanLoopId = loopId.trim();
    const normalizedLoop = cleanLoopId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const strippedLoop = normalizedLoop.replace(/^ruby_burgundy_/, "");
    const veoDir = resolveLocalVeoDir();

    let foundPath: string | null =
      resolveLocalActionLoopVideo(personaId, cleanLoopId) ||
      (personaId.toLowerCase() !== "ruby" ? resolveLocalActionLoopVideo("ruby", cleanLoopId) : null);

    if (!foundPath) {
      const candidatePaths = [
        path.join(veoDir, "ruby_burgundy", `${cleanLoopId}.mp4`),
        path.join(veoDir, "ruby_burgundy", `ruby_burgundy_${cleanLoopId}.mp4`),
        path.join(veoDir, "ruby_burgundy", `ruby_burgundy_${cleanLoopId.toUpperCase()}.mp4`),
        path.join(veoDir, "ruby_burgundy", cleanLoopId),
        resolveLocalPublicFile(`assets/action_loops/${cleanLoopId}.mp4`),
        resolveLocalPublicFile(`assets/action_loops/${cleanLoopId}`),
        path.join(process.cwd(), "storage", "cache", "precompile_inputs", `${cleanLoopId}.mp4`),
        path.join(process.cwd(), "storage", "cache", "precompile_inputs", `${normalizedLoop}.mp4`),
      ].filter((cand): cand is string => Boolean(cand));

      for (const cand of candidatePaths) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          foundPath = cand;
          break;
        }
      }
    }

    if (!foundPath) {
      const rubyVeoDir = path.join(veoDir, "ruby_burgundy");
      if (fs.existsSync(rubyVeoDir)) {
        try {
          const files = fs.readdirSync(rubyVeoDir);
          const match = files.find((f) => {
            const fNorm = f.toLowerCase().replace(/\.[^/.]+$/, "");
            const fStripped = fNorm.replace(/^ruby_burgundy_/, "");
            return fNorm === normalizedLoop || fStripped === strippedLoop || fNorm === `ruby_burgundy_${strippedLoop}`;
          });
          if (match) {
            foundPath = path.join(rubyVeoDir, match);
          }
        } catch {}
      }
    }

    if (foundPath) {
      const ext = path.extname(foundPath).toLowerCase();
      const isVideo = [".mp4", ".webm", ".mov", ".mkv"].includes(ext);
      const base = path.basename(foundPath, ext).toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const cachedAvatar = findCachedAvatarId([
        base,
        `ruby_burgundy_${strippedLoop}`,
        normalizedLoop,
        strippedLoop,
      ]);
      const avatarId = cachedAvatar || normalizedLoop;
      return {
        driverPath: foundPath,
        avatarId,
        isVideo,
      };
    }
  }

  // 3. Pose / Wardrobe Attire
  if (attire && typeof attire === "string" && attire.trim()) {
    const cleanAttire = attire.trim();
    const normAttire = cleanAttire.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Check if wardrobe attire is Ruby Burgundy Velvet Corset suite
    if (normAttire.includes("burgundy")) {
      const continuousPath =
        resolveLocalPublicFile("assets/action_loops/veo/ruby_burgundy/ruby_burgundy_continuous.mp4") ||
        resolveLocalPublicFile("assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_continuous.mp4");
      if (continuousPath) {
        return {
          driverPath: continuousPath,
          avatarId: "ruby_burgundy_continuous",
          isVideo: true,
        };
      }
      const m1Path =
        resolveLocalPublicFile("assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4") ||
        resolveLocalActionLoopVideo("ruby", "M1");
      if (m1Path) {
        return {
          driverPath: m1Path,
          avatarId: "ruby_burgundy_m1_loop_v1",
          isVideo: true,
        };
      }
    }

    const candidateAttires = [
      path.join(process.cwd(), "storage", "avatars", "master_ruby", `${cleanAttire}.jpg`),
      path.join(process.cwd(), "storage", "avatars", "master_ruby", `${cleanAttire}.png`),
      resolveLocalPublicFile(`avatars/master_ruby_archive/chroma_master_poses/${cleanAttire}.jpg`),
      resolveLocalPublicFile(`avatars/${cleanAttire}.jpg`),
      resolveLocalPublicFile(`avatars/${cleanAttire}.png`),
    ].filter((cand): cand is string => Boolean(cand));
    for (const cand of candidateAttires) {
      if (fs.existsSync(cand)) {
        return {
          driverPath: cand,
          avatarId: normAttire,
          isVideo: false,
        };
      }
    }
  }

  // 4. avatarUrl
  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim()) {
    const cleanInput = avatarUrl.trim();
    const sharedLocal = resolveLocalPublicFile(cleanInput);
    let localPath = sharedLocal || "";
    if (!localPath) {
      let cleanUrl = cleanInput;
      if (cleanUrl.startsWith("http")) {
        try {
          cleanUrl = new URL(cleanUrl).pathname;
        } catch {}
      }
      localPath = cleanUrl.startsWith("/")
        ? path.join(resolveLocalPublicRoot(), cleanUrl.replace(/^\//, ""))
        : path.isAbsolute(cleanUrl)
        ? cleanUrl
        : path.join(process.cwd(), cleanUrl);
    }

    if (localPath && fs.existsSync(localPath)) {
      const ext = path.extname(localPath).toLowerCase();
      const isVideo = [".mp4", ".webm", ".mov", ".mkv"].includes(ext);
      const base = path.basename(localPath, ext).toLowerCase().replace(/[^a-z0-9_]/g, "_");
      return { driverPath: localPath, avatarId: base, isVideo };
    }
  }

  // 5. Ultimate Fallback to persona avatar headshot
  const fallbackPath = resolveAvatarPath(personaId);
  const ext = path.extname(fallbackPath).toLowerCase();
  const isVideo = [".mp4", ".webm", ".mov", ".mkv"].includes(ext);
  const normPersona = (personaId || "ruby").toLowerCase();
  return {
    driverPath: fallbackPath,
    avatarId: normPersona,
    isVideo,
  };
}

