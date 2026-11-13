import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * POST /api/presenter/preprocess-avatar
 * 
 * Preprocesses an avatar image or video for ultra-fast (<10ms) MuseTalk cached inference.
 * Generates the 7-file master asset packet:
 * - frames.pt (uint8 background anchor frames)
 * - latents.pt (float16 8-channel UNet latents: masked mouth + reference face context)
 * - masks.pt (depthwise Gaussian blurred blending masks)
 * - geometry.pkl (safe boundary-clamped coordinate tuples)
 * - coords.pkl (facial landmark bounding boxes)
 * - mask_coords.pkl (mirror landmark coordinates for mask registration)
 * - avator_info.json (metadata manifest)
 * 
 * Supports JSON or multipart/form-data.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const avatarId = searchParams.get("avatarId") || searchParams.get("avatar_id");
  const engine = (searchParams.get("engine") || "musetalk").toLowerCase().trim();

  if (!avatarId) {
    return NextResponse.json({ error: "avatarId is required" }, { status: 400 });
  }

  const normalized = avatarId.toLowerCase().trim();

  if (engine === "ditto") {
    const cacheDir = path.join(process.cwd(), "storage", "cache", "avatars", "ditto", normalized);
    const altCacheDir = path.join(process.cwd(), "storage", "cache", "avatars", normalized, "ditto");

    const requiredFiles = ["f_s.pt", "x_s_info.pt", "grids.pt", "masks.pt", "frames.pt", "ditto_info.json"];
    const inPrimary = requiredFiles.every(f => fs.existsSync(path.join(cacheDir, f)));
    const inAlt = requiredFiles.every(f => fs.existsSync(path.join(altCacheDir, f)));
    const isPreprocessed = inPrimary || inAlt;

    return NextResponse.json({
      avatarId: normalized,
      engine: "ditto",
      preprocessed: isPreprocessed,
      cacheDir: isPreprocessed ? (inPrimary ? cacheDir : altCacheDir) : null,
      requiredFiles,
    });
  }

  // Default: MuseTalk
  const cacheDir = path.join(process.cwd(), "storage", "cache", "avatars", normalized);
  const altCacheDir = path.join(process.cwd(), "storage", "cache", "talking_heads", "anchors", normalized, "musetalk");

  const requiredFiles = ["latents.pt", "masks.pt", "geometry.pkl", "frames.pt"];
  const isPreprocessed =
    requiredFiles.every(f => fs.existsSync(path.join(cacheDir, f))) ||
    requiredFiles.every(f => fs.existsSync(path.join(altCacheDir, f)));

  return NextResponse.json({
    avatarId: normalized,
    engine: "musetalk",
    preprocessed: isPreprocessed,
    cacheDir: isPreprocessed ? cacheDir : null,
    requiredFiles,
  });
}

export async function POST(req: NextRequest) {
  const musetalkUrl = process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL || "http://localhost:8010";
  const talkingHeadUrl = process.env.TALKINGHEAD_SERVER_URL || process.env.TALKING_HEAD_SERVER_URL || "http://localhost:8010";

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const avatarId = (formData.get("avatarId") || formData.get("avatar_id")) as string;
      const engine = ((formData.get("engine") as string) || "musetalk").toLowerCase().trim();
      const file = formData.get("file") as File | null;
      const cycleFrames = formData.get("cycleFrames") || formData.get("cycle_frames") || "25";
      const bboxShift = formData.get("bboxShift") || formData.get("bbox_shift") || "0";
      const aliases = formData.get("aliases") as string | null;

      if (!avatarId) {
        return NextResponse.json({ error: "avatarId is required" }, { status: 400 });
      }

      if (engine === "ditto") {
        const sourcePath = (formData.get("sourcePath") || formData.get("imagePath") || formData.get("videoPath")) as string;
        const resolvedPath = sourcePath ? resolveSourcePath(sourcePath) : undefined;
        const res = await fetch(`${talkingHeadUrl}/preprocess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatar_id: avatarId,
            engine: "ditto",
            video_path: resolvedPath,
            options: { cycle_frames: cycleFrames },
          }),
          signal: AbortSignal.timeout(120000),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }

      const forwardFormData = new FormData();
      forwardFormData.append("avatar_id", avatarId);
      forwardFormData.append("cycle_frames", String(cycleFrames));
      forwardFormData.append("bbox_shift", String(bboxShift));
      if (aliases) forwardFormData.append("aliases", aliases);

      if (file) {
        forwardFormData.append("file", file, file.name);
      } else {
        const sourcePath = (formData.get("sourcePath") || formData.get("imagePath") || formData.get("videoPath")) as string;
        if (sourcePath) {
          forwardFormData.append("source_path", resolveSourcePath(sourcePath));
        }
      }

      const res = await fetch(`${musetalkUrl}/preprocess`, {
        method: "POST",
        body: forwardFormData,
        signal: AbortSignal.timeout(120000),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });

    } else {
      // JSON body
      const body = await req.json();
      const {
        avatarId,
        avatar_id,
        engine = "musetalk",
        imagePath,
        videoPath,
        sourcePath,
        cycleFrames = 25,
        bboxShift = 0,
        aliases = []
      } = body;

      const effectiveAvatarId = avatarId || avatar_id;
      if (!effectiveAvatarId) {
        return NextResponse.json({ error: "avatarId is required" }, { status: 400 });
      }

      const rawPath = imagePath || videoPath || sourcePath;
      if (!rawPath) {
        return NextResponse.json({ error: "imagePath, videoPath, or sourcePath is required" }, { status: 400 });
      }

      const resolvedPath = resolveSourcePath(rawPath);
      const cleanEngine = (engine as string).toLowerCase().trim();

      if (cleanEngine === "ditto") {
        const res = await fetch(`${talkingHeadUrl}/preprocess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatar_id: effectiveAvatarId,
            engine: "ditto",
            video_path: resolvedPath,
            options: { cycle_frames: cycleFrames },
          }),
          signal: AbortSignal.timeout(120000),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }

      const res = await fetch(`${musetalkUrl}/preprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar_id: effectiveAvatarId,
          source_path: resolvedPath,
          cycle_frames: cycleFrames,
          bbox_shift: bboxShift,
          aliases: Array.isArray(aliases) ? aliases : [aliases].filter(Boolean)
        }),
        signal: AbortSignal.timeout(120000),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to preprocess avatar";
    console.error("[Preprocess Avatar API Error]:", errorMsg);
    return NextResponse.json({
      error: errorMsg,
      status: 500
    }, { status: 500 });
  }
}

/**
 * Resolves a web path (e.g. /avatars/ruby.png) or repo relative path into a path accessible by container.
 */
function resolveSourcePath(rawPath: string): string {
  // If already a container path starting with /app
  if (rawPath.startsWith("/app/")) {
    return rawPath;
  }

  // Check if it's inside public/
  let localPath = rawPath;
  if (rawPath.startsWith("/")) {
    localPath = path.join(process.cwd(), "public", rawPath);
  } else if (!path.isAbsolute(rawPath)) {
    localPath = path.join(process.cwd(), rawPath);
  }

  if (fs.existsSync(localPath)) {
    // If inside storage/, map to /app/storage/
    const storageDir = path.join(process.cwd(), "storage");
    if (localPath.startsWith(storageDir)) {
      const rel = path.relative(storageDir, localPath).replace(/\\/g, "/");
      return `/app/storage/${rel}`;
    }

    // Otherwise copy to storage/cache/precompile_inputs/ so Docker container can access it
    const cacheInputsDir = path.join(storageDir, "cache", "precompile_inputs");
    if (!fs.existsSync(cacheInputsDir)) {
      fs.mkdirSync(cacheInputsDir, { recursive: true });
    }
    const destName = `${Date.now()}_${path.basename(localPath)}`;
    const destPath = path.join(cacheInputsDir, destName);
    fs.copyFileSync(localPath, destPath);
    return `/app/storage/cache/precompile_inputs/${destName}`;
  }

  return rawPath;
}
