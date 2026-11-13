/**
 * src/app/api/ecommerce/render/route.ts
 *
 * API Route: Direct Remotion render engine & progress monitor for E-Commerce Product Ads.
 * Spawns Remotion CLI to render ProductAd-Vertical (9:16), Landscape (16:9), or Square (1:1),
 * tracks real-time progress, and serves completed .mp4 video files.
 */

import { prisma } from "@/lib/prisma";
import { checkRateLimit,rateLimitResponse,RateLimitTiers } from "@/lib/security/rateLimit";
import { assertSafePublicUrl } from "@/lib/security/ssrf";
import { requireTenant } from "@/lib/tenant";
import { broadcastWorkerWake } from "@/lib/worker-broker/supabaseWake";
import { type ChildProcess } from "child_process";
import crypto from "crypto";
import fs from "fs";
import { NextRequest,NextResponse } from "next/server";
import path from "path";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:ecommerce:render");

/**
 * Defensively downloads and caches remote external CDN assets locally to public/assets/cache/ecommerce/
 * Prevents headless Chromium timeouts in Remotion (e.g. RobustImg CDN stalls) and avoids 404s.
 */
async function preCacheRemoteAsset(
  remoteUrl: string | undefined | null,
  subfolder = "images"
): Promise<string | undefined> {
  if (!remoteUrl || typeof remoteUrl !== "string") return undefined;

  // If already a local path, data URI, or localhost server, keep as-is
  if (!remoteUrl.startsWith("http://") && !remoteUrl.startsWith("https://")) {
    return remoteUrl;
  }
  if (
    remoteUrl.includes("localhost:") ||
    remoteUrl.includes("127.0.0.1:") ||
    remoteUrl.includes("0.0.0.0:")
  ) {
    return remoteUrl;
  }

  // Avoid downloading large video files (Remotion streams videos or uses local disk without bloat)
  const cleanUrl = remoteUrl.split("?")[0].toLowerCase();
  if (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".mkv") ||
    cleanUrl.endsWith(".avi")
  ) {
    return remoteUrl;
  }

  // Validate URL against SSRF before fetching
  try {
    await assertSafePublicUrl(remoteUrl, {
      allowDevelopmentLoopback: process.env.NODE_ENV !== "production",
    });
  } catch {
    console.warn(`[Remotion E-Commerce] Blocked unsafe remote asset in pre-cache: ${remoteUrl}`);
    return undefined;
  }

  try {
    const cacheDir = path.join(process.cwd(), "public", "assets", "cache", "ecommerce", subfolder);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    let ext = path.extname(cleanUrl);
    if (!ext || ext.length > 5 || ext.length < 2) {
      ext = ".png";
    }

    const urlHash = crypto.createHash("md5").update(remoteUrl).digest("hex").slice(0, 16);
    const filename = `${urlHash}${ext}`;
    const localFilePath = path.join(cacheDir, filename);
    const localPublicUrl = `/assets/cache/ecommerce/${subfolder}/${filename}`;

    // Return cached asset immediately if already present on disk
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 100) {
      return localPublicUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      // Avoid downloading files over 15MB to prevent memory thrashing
      const contentLength = res.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
        console.warn(`[Remotion E-Commerce] Skipping pre-cache for oversized asset (>15MB): ${remoteUrl}`);
        return remoteUrl;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 0 && buffer.length <= 15 * 1024 * 1024) {
        fs.writeFileSync(localFilePath, buffer);
        log.info(`[Remotion E-Commerce] Pre-cached asset: ${remoteUrl.slice(0, 60)}... -> ${localPublicUrl}`);
        return localPublicUrl;
      }
    } else {
      console.warn(`[Remotion E-Commerce] Pre-cache returned HTTP ${res.status} for ${remoteUrl}`);
    }
  } catch (err: unknown) {
    console.warn(`[Remotion E-Commerce] Pre-cache warning for ${remoteUrl}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return remoteUrl;
}

// Active in-memory render progress tracker
interface ActiveRender {
  id: string;
  orgId: string;
  status: "rendering" | "completed" | "failed" | "canceled";
  progress: number;
  currentFrame: number;
  totalFrames: number;
  compositionId: string;
  outputPath: string;
  publicUrl: string;
  videoUrl?: string;
  error?: string;
  child?: ChildProcess;
  tempPropsFile?: string;
  startedAt: number;
}

const activeRenders = new Map<string, ActiveRender>();

/**
 * GET /api/ecommerce/render?renderId=... — Poll real-time rendering progress
 */
export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { searchParams } = new URL(req.url);
  const renderId = searchParams.get("renderId");

  if (!renderId) {
    return NextResponse.json({ error: "Missing renderId parameter" }, { status: 400 });
  }

  // 1. Check database GenerationJob first (distributed across containers)
  const dbJob = await prisma.generationJob.findFirst({
    where: { id: renderId, companyId: orgId },
  });

  if (dbJob) {
    interface DbJobConfig {
      result?: { outputPath?: string };
      totalFrames?: number;
      compositionId?: string;
      [key: string]: unknown;
    }
    let parsedConfig: DbJobConfig = {};
    if (dbJob.config) {
      try {
        parsedConfig = typeof dbJob.config === "string" ? JSON.parse(dbJob.config) : dbJob.config;
      } catch {}
    }

    if (dbJob.status === "DONE") {
      const publicUrl =
        parsedConfig.result?.outputPath ||
        `/assets/completed/${renderId}.mp4`;

      return NextResponse.json({
        id: renderId,
        status: "completed",
        progress: 100,
        currentFrame: parsedConfig.totalFrames || 600,
        totalFrames: parsedConfig.totalFrames || 600,
        compositionId: parsedConfig.compositionId || "ProductAd-Vertical",
        publicUrl,
      });
    }

    if (dbJob.status === "FAILED") {
      return NextResponse.json({
        id: renderId,
        status: "failed",
        progress: 0,
        currentFrame: 0,
        totalFrames: parsedConfig.totalFrames || 600,
        compositionId: parsedConfig.compositionId || "ProductAd-Vertical",
        publicUrl: `/assets/completed/${renderId}.mp4`,
        error: dbJob.errorLog || "Render job failed",
      });
    }

    if (dbJob.status === "CANCELLED") {
      return NextResponse.json({
        id: renderId,
        status: "canceled",
        progress: 0,
        currentFrame: 0,
        totalFrames: parsedConfig.totalFrames || 600,
        compositionId: parsedConfig.compositionId || "ProductAd-Vertical",
        publicUrl: `/assets/completed/${renderId}.mp4`,
      });
    }

    // Still processing (QUEUED, RENDER_IN_PROGRESS, CLAIMED)
    const totalFrames = parsedConfig.totalFrames || 600;
    const progress = dbJob.totalSteps > 0
      ? Math.max(5, Math.min(99, Math.round((dbJob.doneSteps / dbJob.totalSteps) * 100)))
      : (dbJob.status === "QUEUED" ? 2 : 10);
    const currentFrame = Math.round((progress / 100) * totalFrames);

    return NextResponse.json({
      id: renderId,
      status: "rendering",
      progress,
      currentFrame,
      totalFrames,
      compositionId: parsedConfig.compositionId || "ProductAd-Vertical",
      publicUrl: `/assets/completed/${renderId}.mp4`,
    });
  }

  // 2. In-memory fallback
  const render = activeRenders.get(renderId);
  if (render && render.orgId === orgId) {
    return NextResponse.json({
      id: render.id,
      status: render.status,
      progress: render.progress,
      currentFrame: render.currentFrame,
      totalFrames: render.totalFrames,
      compositionId: render.compositionId,
      publicUrl: render.publicUrl,
      error: render.error,
    });
  }

  // 3. Check if the MP4 file already exists on disk
  const completedPath = path.join(process.cwd(), "public", "assets", "completed", `${renderId}.mp4`);
  if (fs.existsSync(completedPath)) {
    return NextResponse.json({
      id: renderId,
      status: "completed",
      progress: 100,
      publicUrl: `/assets/completed/${renderId}.mp4`,
    });
  }

  return NextResponse.json({ error: "Render not found or expired" }, { status: 404 });
}

/**
 * POST /api/ecommerce/render — Trigger Remotion render or cancel active render
 */
export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();

    // Rate limit render creation requests
    if (body.action !== "cancel") {
      const rateLimitResult = checkRateLimit(orgId, RateLimitTiers.AI_EXPENSIVE);
      if (!rateLimitResult.allowed) {
        return rateLimitResponse(rateLimitResult, "Rendering rate limit exceeded. Please wait before triggering another render.");
      }
    }

    // 1. Cancellation request
    if (body.action === "cancel") {
      const { renderId } = body;
      if (!renderId) {
        return NextResponse.json({ error: "Missing renderId" }, { status: 400 });
      }

      // Cancel database GenerationJob if active
      await prisma.generationJob.updateMany({
        where: {
          id: renderId,
          companyId: orgId,
          status: { in: ["QUEUED", "CLAIMED", "RENDER_IN_PROGRESS"] },
        },
        data: { status: "CANCELLED" },
      });

      // Cancel in-memory if present
      const render = activeRenders.get(renderId);
      if (render) {
        if (render.orgId !== orgId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        if (render.child) {
          try {
            render.child.kill("SIGKILL");
          } catch {}
          render.status = "canceled";
        }
        if (render?.tempPropsFile && fs.existsSync(render.tempPropsFile)) {
          try { fs.unlinkSync(render.tempPropsFile); } catch {}
        }
      }
      return NextResponse.json({ success: true, status: "canceled" });
    }

    // 2. Build & Render Request
    const {
      productSpec,
      script,
      aspectRatio = "9:16",
      audioMode = "voiceover_tts",
      audioUrl,
      musicBedUrl = "/music/energetic_upbeat.mp3",
      accentColorOverride,
      backdrop,
      captionStyle,
      presenter,
      watermark,
      usVsThem,
      qrCode,
      socialPopup,
      intro,
      outro,
      baseMusicVolume = 0.35,
      duckingDb = -14,
      quality = "master",
      campaignId,
      storyId: _storyId,
      showPresenter,
      captionOffsetY,
      captionOffsetX,
      showCaptions,
      headlineOffsetY,
      headlineOffsetX,
      showHeadline,
      productOffsetX,
      productOffsetY,
      productScale,
      showProductVisual,
      badgeOffsetY,
      badgeOffsetX,
      showFactBadge,
      featureBadgeText,
      showPricePromo,
      pricePromoOffsetX,
      pricePromoOffsetY,
      pricePromoScale,
      showCtaButton,
      ctaOffsetX,
      ctaOffsetY,
      ctaScale,
      showTickerTape,
      tickerTapeOffsetY,
      showBackdrop,
      showWatermark,
      showBrandLogo,
      brandLogoOffsetX,
      brandLogoOffsetY,
      brandLogoScale,
      showFeaturePills,
      featurePillsOffsetX,
      featurePillsOffsetY,
      showReviewCard,
      reviewCardOffsetX,
      reviewCardOffsetY,
      reviewCardScale,
      turntablePedestal,
    } = body;

    if (!productSpec || !script) {
      return NextResponse.json(
        { error: "productSpec and script are required to trigger an e-commerce render" },
        { status: 400 }
      );
    }

    // Determine target composition
    let compositionId = "ProductAd-Vertical";
    if (aspectRatio === "16:9" || aspectRatio === "landscape") {
      compositionId = "ProductAd-Landscape";
    } else if (aspectRatio === "1:1" || aspectRatio === "square") {
      compositionId = "ProductAd-Square";
    }

    // Calculate frame durations
    const introFrames = intro?.enabled ? (intro.durationFrames || 60) : 0;
    const outroFrames = outro?.enabled ? (outro.durationFrames || 75) : 0;
    const scenes = script?.scenes || [];
    const lastScene = scenes[scenes.length - 1];
    const scenesDuration = lastScene ? (lastScene.startFrame + lastScene.durationFrames) : (script.totalFrames || 600);
    const totalFrames = Math.max(90, introFrames + scenesDuration + outroFrames);

    // Setup paths
    const outputDir = path.join(process.cwd(), "public", "assets", "completed");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const renderId = `ecom-${(productSpec.id || "ad").replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}`;

    const publicUrl = `/assets/completed/${renderId}.mp4`;


    // Resolve & defensively validate background music track to avoid Chromium MediaError 404 stalls
    let resolvedMusicBedUrl: string | undefined = musicBedUrl;
    if (resolvedMusicBedUrl === "none" || resolvedMusicBedUrl === "") {
      resolvedMusicBedUrl = undefined;
    } else if (
      resolvedMusicBedUrl &&
      !resolvedMusicBedUrl.startsWith("http://") &&
      !resolvedMusicBedUrl.startsWith("https://") &&
      !resolvedMusicBedUrl.startsWith("data:")
    ) {
      let cleanPath = resolvedMusicBedUrl.startsWith("/")
        ? resolvedMusicBedUrl.slice(1)
        : resolvedMusicBedUrl;
      if (cleanPath.startsWith("public/")) {
        cleanPath = cleanPath.slice(7);
      }
      const diskPath = path.join(process.cwd(), "public", cleanPath);
      if (!fs.existsSync(diskPath)) {
        console.warn(
          `[Remotion E-Commerce] Warning: Music track not found on disk at ${diskPath}. Omitting musicBedUrl to avoid Remotion MediaError crash.`
        );
        resolvedMusicBedUrl = undefined;
      } else {
        resolvedMusicBedUrl = `/${cleanPath}`;
      }
    }

    // Pre-cache remote brand logo and product images concurrently in parallel
    const sanitizedProductSpec = JSON.parse(JSON.stringify(productSpec));
    const preCachePromises: Promise<unknown>[] = [];

    if (sanitizedProductSpec.brand?.logoUrl) {
      preCachePromises.push(
        preCacheRemoteAsset(sanitizedProductSpec.brand.logoUrl, "logos").then((res) => {
          sanitizedProductSpec.brand.logoUrl = res;
        })
      );
    }
    if (sanitizedProductSpec.brand?.faviconUrl) {
      preCachePromises.push(
        preCacheRemoteAsset(sanitizedProductSpec.brand.faviconUrl, "logos").then((res) => {
          sanitizedProductSpec.brand.faviconUrl = res;
        })
      );
    }
    if (sanitizedProductSpec.heroImageUrl) {
      preCachePromises.push(
        preCacheRemoteAsset(sanitizedProductSpec.heroImageUrl, "products").then((res) => {
          sanitizedProductSpec.heroImageUrl = res;
        })
      );
    }
    if (Array.isArray(sanitizedProductSpec.assets)) {
      for (const asset of sanitizedProductSpec.assets) {
        if (asset?.url) {
          preCachePromises.push(
            preCacheRemoteAsset(asset.url, "products").then((res) => {
              asset.url = res;
            })
          );
        }
      }
    }
    if (preCachePromises.length > 0) {
      await Promise.all(preCachePromises);
    }

    // Sanitize script scenes: strip or heal any ephemeral 'blob:' URLs before Remotion CLI starts
    const sanitizedScript = JSON.parse(JSON.stringify(script));
    const sanitizedScenes = sanitizedScript?.scenes || [];

    const sceneMediaPromises: Promise<unknown>[] = [];
    for (const scene of sanitizedScenes) {
      if (scene.primaryMediaUrl) {
        sceneMediaPromises.push(
          preCacheRemoteAsset(scene.primaryMediaUrl, "scenes").then((res) => {
            scene.primaryMediaUrl = res;
          })
        );
      }
      if (scene.secondaryMediaUrl) {
        sceneMediaPromises.push(
          preCacheRemoteAsset(scene.secondaryMediaUrl, "scenes").then((res) => {
            scene.secondaryMediaUrl = res;
          })
        );
      }
      if (scene.productAssetUrl) {
        sceneMediaPromises.push(
          preCacheRemoteAsset(scene.productAssetUrl, "scenes").then((res) => {
            scene.productAssetUrl = res;
          })
        );
      }
    }
    await Promise.all(sceneMediaPromises);

    for (const scene of sanitizedScenes) {
      // 1. Sanitize audioUrl (blob: is strictly forbidden in Remotion CLI)
      if (scene.audioUrl && scene.audioUrl.startsWith("blob:")) {
        console.warn(`[Remotion E-Commerce] Healing invalid blob audioUrl in scene ${scene.id}...`);
        let healedUrl: string | undefined = undefined;
        if (Array.isArray(scene.mediaHistory)) {
          const validHistory = scene.mediaHistory.find(
            (h: { audioUrl?: string }) =>
              h?.audioUrl &&
              (h.audioUrl.startsWith("http://") || h.audioUrl.startsWith("https://")) &&
              !h.audioUrl.startsWith("blob:")
          );
          if (validHistory) {
            healedUrl = validHistory.audioUrl;
          }
        }
        if (healedUrl) {
          log.info(`[Remotion E-Commerce] Healed audioUrl for scene ${scene.id} -> ${healedUrl}`);
          scene.audioUrl = healedUrl;
        } else {
          console.warn(`[Remotion E-Commerce] No valid audio in mediaHistory for scene ${scene.id}, unsetting to prevent crash.`);
          scene.audioUrl = undefined;
        }
      }

      // 2. Sanitize presenter videos (blob: is strictly forbidden)
      if (scene.presenterVideoUrl && scene.presenterVideoUrl.startsWith("blob:")) {
        scene.presenterVideoUrl = scene.actionLoopSlices?.[0]?.videoUrl || "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4";
      }
      if (scene.presenter?.videoUrl && scene.presenter.videoUrl.startsWith("blob:")) {
        scene.presenter.videoUrl = scene.actionLoopSlices?.[0]?.videoUrl || "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4";
      }
      if (scene.presenterConfig?.videoUrl && scene.presenterConfig.videoUrl.startsWith("blob:")) {
        scene.presenterConfig.videoUrl = scene.actionLoopSlices?.[0]?.videoUrl || "/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4";
      }

      // 3. Auto-upgrade presenter videos to 32-bit transparent WebM if companion file exists on disk
      const checkWebmCompanion = async (videoUrl: string | undefined): Promise<string | undefined> => {
        if (!videoUrl || videoUrl.toLowerCase().endsWith(".webm")) return videoUrl;
        const cleanPath = videoUrl.split("?")[0];
        const baseWebm = cleanPath.replace(/\.mp4$/i, ".webm");
        const filename = path.basename(baseWebm);

        // Check cache directory first
        const cacheWebmPath = path.join(process.cwd(), "public", "assets", "cache", "ecommerce", filename);
        if (fs.existsSync(cacheWebmPath) && fs.statSync(cacheWebmPath).size > 1000) {
          return `/assets/cache/ecommerce/${filename}`;
        }

        // Check exact local public path
        const directPublicPath = cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath;
        const directWebmPath = path.join(process.cwd(), "public", directPublicPath.replace(/\.mp4$/i, ".webm"));
        if (fs.existsSync(directWebmPath) && fs.statSync(directWebmPath).size > 1000) {
          return `/${directPublicPath.replace(/\.mp4$/i, ".webm")}`;
        }

        // If companion WebM exists on disk, use it; otherwise use MP4 directly.
        // Remotion's WebGL ChromaKeyVideo shader handles real-time chroma removal at 60fps with zero disk or CPU bloat.
        return videoUrl;
      };

      if (scene.presenterVideoUrl) scene.presenterVideoUrl = await checkWebmCompanion(scene.presenterVideoUrl);
      if (scene.presenter?.videoUrl) scene.presenter.videoUrl = await checkWebmCompanion(scene.presenter.videoUrl);
      if (scene.presenterConfig?.videoUrl) scene.presenterConfig.videoUrl = await checkWebmCompanion(scene.presenterConfig.videoUrl);

      if (Array.isArray(scene.actionLoopSlices)) {
        for (const slice of scene.actionLoopSlices) {
          if (slice.videoUrl) slice.videoUrl = await checkWebmCompanion(slice.videoUrl);
        }
      }
      if (Array.isArray(scene.presenterConfig?.actionLoopSlices)) {
        for (const slice of scene.presenterConfig.actionLoopSlices) {
          if (slice.videoUrl) slice.videoUrl = await checkWebmCompanion(slice.videoUrl);
        }
      }
      if (Array.isArray(scene.presenter?.actionLoopSlices)) {
        for (const slice of scene.presenter.actionLoopSlices) {
          if (slice.videoUrl) slice.videoUrl = await checkWebmCompanion(slice.videoUrl);
        }
      }
    }

    // Also auto-upgrade top-level presenter video if defined
    const sanitizedPresenter = presenter ? JSON.parse(JSON.stringify(presenter)) : undefined;
    if (sanitizedPresenter?.videoUrl) {
      const checkWebmCompanion = async (videoUrl: string | undefined): Promise<string | undefined> => {
        if (!videoUrl || videoUrl.toLowerCase().endsWith(".webm")) return videoUrl;
        const cleanPath = videoUrl.split("?")[0];
        const baseWebm = cleanPath.replace(/\.mp4$/i, ".webm");
        const filename = path.basename(baseWebm);
        const cacheWebmPath = path.join(process.cwd(), "public", "assets", "cache", "ecommerce", filename);
        if (fs.existsSync(cacheWebmPath) && fs.statSync(cacheWebmPath).size > 1000) {
          return `/assets/cache/ecommerce/${filename}`;
        }
        return videoUrl;
      };
      sanitizedPresenter.videoUrl = await checkWebmCompanion(sanitizedPresenter.videoUrl);
    }

    let sanitizedMasterAudioUrl = audioUrl;
    if (sanitizedMasterAudioUrl && sanitizedMasterAudioUrl.startsWith("blob:")) {
      sanitizedMasterAudioUrl = undefined;
    }

    const inputProps = {
      productSpec: sanitizedProductSpec,
      script: sanitizedScript,
      aspectRatio,
      audioMode,
      audioUrl: sanitizedMasterAudioUrl,
      musicBedUrl: resolvedMusicBedUrl,
      baseMusicVolume,
      duckingDb,
      accentColorOverride,
      backdrop,
      captionStyle,
      presenter: sanitizedPresenter,
      watermark,
      usVsThem,
      qrCode,
      socialPopup,
      intro,
      outro,
      showSafeZones: false,
      showPresenter,
      captionOffsetY,
      captionOffsetX,
      showCaptions,
      headlineOffsetY,
      headlineOffsetX,
      showHeadline,
      productOffsetX,
      productOffsetY,
      productScale,
      showProductVisual,
      badgeOffsetY,
      badgeOffsetX,
      showFactBadge,
      featureBadgeText,
      showPricePromo,
      pricePromoOffsetX,
      pricePromoOffsetY,
      pricePromoScale,
      showCtaButton,
      ctaOffsetX,
      ctaOffsetY,
      ctaScale,
      showTickerTape,
      tickerTapeOffsetY,
      showBackdrop,
      showWatermark,
      showBrandLogo,
      brandLogoOffsetX,
      brandLogoOffsetY,
      brandLogoScale,
      showFeaturePills,
      featurePillsOffsetX,
      featurePillsOffsetY,
      showReviewCard,
      reviewCardOffsetX,
      reviewCardOffsetY,
      reviewCardScale,
      turntablePedestal,
    };

    // 4. Enqueue GenerationJob for distributed pipeline worker
    const job = await prisma.generationJob.create({
      data: {
        id: renderId,
        companyId: orgId,
        storyId: campaignId || "ecommerce",
        type: "render",
        status: "QUEUED",
        totalSteps: 4,
        config: JSON.stringify({
          videoId: renderId,
          compositionId,
          aspectRatio,
          inputProps,
          quality,
          campaignId,
          script,
          totalFrames,
          durationSeconds: Number((totalFrames / 30).toFixed(1)),
        }),
      },
    });

    log.info(
      `[Remotion E-Commerce] Enqueued render job ${job.id} (${quality || "master"}): ${compositionId} (${totalFrames} frames, duration=${(totalFrames / 30).toFixed(1)}s)`
    );

    void broadcastWorkerWake("job_queued");

    return NextResponse.json({
      success: true,
      renderId,
      jobId: job.id,
      compositionId,
      totalFrames,
      durationSeconds: Number((totalFrames / 30).toFixed(1)),
      publicUrl,
      message: "Render job queued successfully for worker execution",
    });
  } catch (error: unknown) {
    console.error("Failed to execute e-commerce render:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to trigger Remotion render" },
      { status: 500 }
    );
  }
}

