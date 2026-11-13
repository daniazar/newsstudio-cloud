/**
 * src/app/api/ecommerce/presenter/lip-sync/route.ts
 *
 * Real-Time MuseTalk 350+ FPS Lip-Sync API for E-Commerce Studio.
 * Generates an authentic talking presenter video from persona avatar assets and synthesized speech audio.
 */

import { checkMuseTalkHealth,ensureAvatarPreprocessed,generateMuseTalkLipSync } from "@/lib/ai/musetalkClient";
import { checkModelEngineStatus,generateTalkingHeadInference } from "@/lib/ai/talkingHeadsClient";
import { resolvePresenterDriver } from "@/lib/ecommerce/avatarResolver";
import { storage,withTenant } from "@/lib/storage";
import fs from "fs";
import { NextRequest,NextResponse } from "next/server";
import path from "path";

import { getFFmpegPath } from "@/lib/ai/comfy/utils";
import { SceneClipSlice } from "@/lib/ecommerce/actionLoopFsmEngine";
import { requireTenant } from "@/lib/tenant";
import { ensureTransparentWebmCompanion,sanitizePresenterVideo } from "@/lib/video/presenterSanitizer";
import { prisma } from "@/lib/prisma";
import { broadcastWorkerWake } from "@/lib/worker-broker/supabaseWake";

function isRemoteWorkerMode(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.FORCE_REMOTE_WORKER === "true" ||
    (process.env.NODE_ENV !== "test" && process.env.ALLOW_API_SPAWN !== "true")
  );
}
import { createLogger } from "@/lib/logger";

const log = createLogger("api:ecommerce:presenter:lip-sync");

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const companyId = t.tenant.orgId;

  try {
    const body = await req.json();
    const {
      personaId = "sofia",
      engine = "musetalk",
      audioBase64,
      audioUrl,
      fps = 30,
      videoUrl,
      loopId,
      attire,
      avatarUrl,
      startFrameOffset = 0,
      slices,
      asyncWebm = true,
    } = body;

    if (isRemoteWorkerMode()) {
      let resolvedAudioUrl = typeof audioUrl === "string" ? audioUrl : undefined;
      if (audioBase64 && typeof audioBase64 === "string") {
        const audioBuf = Buffer.from(audioBase64, "base64");
        const key = withTenant(companyId, `ecommerce/lipsync/audio/${personaId}_${Date.now()}.wav`);
        resolvedAudioUrl = await storage.upload(key, audioBuf, "audio/wav");
      } else if (resolvedAudioUrl && resolvedAudioUrl.startsWith("data:audio")) {
        const base64Part = resolvedAudioUrl.split(",")[1];
        if (base64Part) {
          const audioBuf = Buffer.from(base64Part, "base64");
          const key = withTenant(companyId, `ecommerce/lipsync/audio/${personaId}_${Date.now()}.wav`);
          resolvedAudioUrl = await storage.upload(key, audioBuf, "audio/wav");
        }
      }

      if (!resolvedAudioUrl) {
        return NextResponse.json(
          { success: false, error: "Valid audioBase64 or audioUrl is required for lip-sync." },
          { status: 400 }
        );
      }

      const createdJob = await prisma.generationJob.create({
        data: {
          companyId,
          storyId: `ecommerce_lipsync_${personaId}`,
          type: "ecommerce_lipsync",
          status: "QUEUED",
          totalSteps: 2,
          doneSteps: 0,
          currentStep: "Queued for local worker",
          config: JSON.stringify({
            personaId,
            engine,
            audioUrl: resolvedAudioUrl,
            fps,
            videoUrl: videoUrl || null,
            loopId: loopId || null,
            attire: attire || null,
            avatarUrl: avatarUrl || null,
            startFrameOffset,
            slices: Array.isArray(slices) ? slices : null,
            asyncWebm: Boolean(asyncWebm),
          }),
        },
      });
      void broadcastWorkerWake("job_queued");

      return NextResponse.json({
        ok: true,
        queued: true,
        success: true,
        jobId: createdJob.id,
        status: "QUEUED",
        message: "Lip-sync job queued for local worker execution.",
      });
    }

    // Check engine server health
    if (engine === "ditto") {
      const dittoStatus = await checkModelEngineStatus("ditto");
      if (!dittoStatus.online) {
        return NextResponse.json(
          {
            success: false,
            error: "Ditto Motion-Space Docker Server is offline on port 8010. Start the container: docker start modern-talkinghead-server or switch to MuseTalk.",
            isOffline: true,
          },
          { status: 503 }
        );
      }
    } else {
      // Check MuseTalk server health on port 8010 (with 8007 fallback)
      const isOnline = await checkMuseTalkHealth();
      if (!isOnline) {
        return NextResponse.json(
          {
            success: false,
            error: "Modern-TalkingHead / MuseTalk Server is offline on port 8010. Start the container: docker start modern-talkinghead-server",
            isOffline: true,
          },
          { status: 503 }
        );
      }
    }

    // Resolve audio buffer
    let audioBuffer: Buffer | null = null;
    if (audioBase64) {
      audioBuffer = Buffer.from(audioBase64, "base64");
    } else if (audioUrl && typeof audioUrl === "string") {
      if (audioUrl.startsWith("data:audio")) {
        const base64Part = audioUrl.split(",")[1];
        if (base64Part) audioBuffer = Buffer.from(base64Part, "base64");
      } else if (audioUrl.startsWith("http")) {
        try {
          const fetchRes = await fetch(audioUrl);
          if (fetchRes.ok) {
            const ab = await fetchRes.arrayBuffer();
            audioBuffer = Buffer.from(ab);
          } else {
            console.error(`[LipSync API] Failed to fetch audioUrl: ${audioUrl} - Status: ${fetchRes.status}`);
          }
        } catch (fetchErr: unknown) {
          console.error(`[LipSync API] Network error fetching audioUrl (${audioUrl}):`, fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
        }
      } else {
        const localAudioPath = path.join(process.cwd(), "public", audioUrl.replace(/^\//, ""));
        if (fs.existsSync(localAudioPath)) {
          audioBuffer = await fs.promises.readFile(localAudioPath);
        }
      }
    }

    if (!audioBuffer) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid voiceover audio provided. Synthesize audio in Tab 4 first or supply audioBase64.",
        },
        { status: 400 }
      );
    }

    // Prepare temporary directories
    const tempDir = path.join(process.cwd(), "storage", "cache", "ecommerce");
    if (!fs.existsSync(tempDir)) {
      await fs.promises.mkdir(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const tempAudioPath = path.join(tempDir, `input_${personaId}_${timestamp}.wav`);
    const tempOutputPath = path.join(tempDir, `musetalk_${personaId}_${timestamp}.mp4`);

    await fs.promises.writeFile(tempAudioPath, audioBuffer);


    let resultCached = false;
    let resolvedDriverPath = "";
    let finalAvatarId = "";

    // CASE DITTO: Ant Group Motion-Space Diffusion Engine
    if (engine === "ditto") {
      const { driverPath, avatarId: resolvedAvatarId, isVideo } = resolvePresenterDriver({
        personaId,
        videoUrl,
        loopId,
        attire,
        avatarUrl,
      });

      log.info(`[LipSync API] Invoking Ditto Motion-Space diffusion engine for '${resolvedAvatarId}', driver='${driverPath}'...`);
      const dittoRes = await generateTalkingHeadInference({
        modelId: "ditto",
        avatarSrc: isVideo ? undefined : driverPath,
        videoSrc: isVideo ? driverPath : undefined,
        audioPath: tempAudioPath,
        fps,
      });

      if (!dittoRes.success || !dittoRes.videoUrl) {
        return NextResponse.json(
          {
            success: false,
            error: dittoRes.error || "Ditto failed to produce output video.",
          },
          { status: 500 }
        );
      }

      let sourceDittoPath = dittoRes.videoUrl;
      if (sourceDittoPath.startsWith("/api/talking-heads/media/")) {
        const fname = path.basename(sourceDittoPath);
        sourceDittoPath = path.join(process.cwd(), "storage", "cache", "talking_heads", fname);
      } else if (sourceDittoPath.startsWith("/")) {
        sourceDittoPath = path.join(process.cwd(), "public", sourceDittoPath.replace(/^\//, ""));
      }

      if (fs.existsSync(sourceDittoPath)) {
        await fs.promises.copyFile(sourceDittoPath, tempOutputPath);
      }

      await sanitizePresenterVideo(tempOutputPath);
      resolvedDriverPath = driverPath;
      finalAvatarId = resolvedAvatarId;
      resultCached = false;
    } else if (Array.isArray(slices) && slices.length > 1) {
      // CASE A: Multi-clip continuous sequence spanning across clip boundaries
      log.info(`[LipSync] Processing multi-clip sequence (${slices.length} slices) for seamless continuous transition...`);
      const ffmpeg = getFFmpegPath();
      const partFiles: string[] = [];

      for (let idx = 0; idx < slices.length; idx++) {
        const sl: SceneClipSlice = slices[idx];
        const sliceAudioPath = path.join(tempDir, `slice_audio_${timestamp}_${idx}.wav`);
        const sliceOutMp4 = path.join(tempDir, `slice_part_${timestamp}_${idx}.mp4`);

        const startSec = Math.max(0, sl.audioStartFrame / fps);
        const durSec = Math.max(0.1, sl.sliceDurationFrames / fps);

        (await import("child_process")).execFileSync(
          ffmpeg,
          [
            "-y",
            "-ss",
            startSec.toFixed(3),
            "-t",
            durSec.toFixed(3),
            "-i",
            tempAudioPath,
            "-c:a",
            "pcm_s16le",
            sliceAudioPath,
          ],
          { stdio: "ignore" }
        );

        const { driverPath: slDriver, avatarId: slAvatar, isVideo: slIsVid } = resolvePresenterDriver({
          personaId,
          videoUrl: sl.videoUrl,
          loopId: sl.clipId,
          attire,
        });

        await ensureAvatarPreprocessed(slAvatar, slDriver, slIsVid);

        const slRes = await generateMuseTalkLipSync({
          videoPath: slDriver,
          audioPath: sliceAudioPath,
          outputPath: sliceOutMp4,
          avatarId: slAvatar,
          useCache: true,
          fps,
          startFrameOffset: sl.localStartFrame,
        });

        if (!slRes.success || !fs.existsSync(sliceOutMp4)) {
          throw new Error(`Failed to generate lip-sync for slice ${idx + 1} (${sl.clipId})`);
        }

        // Sanitize slice output to heal any pitch-black face dropout frames
        await sanitizePresenterVideo(sliceOutMp4);

        partFiles.push(sliceOutMp4);
        finalAvatarId = slAvatar;
        resolvedDriverPath = slDriver;

        if (fs.existsSync(sliceAudioPath)) {
          try { fs.unlinkSync(sliceAudioPath); } catch {}
        }
      }

      // Losslessly concatenate slices into final tempOutputPath
      const listFile = path.join(tempDir, `concat_list_${timestamp}.txt`);
      const listLines = partFiles.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
      fs.writeFileSync(listFile, listLines);
      (await import("child_process")).execFileSync(
        ffmpeg,
        ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", tempOutputPath],
        { stdio: "ignore" }
      );

      try {
        fs.unlinkSync(listFile);
        for (const p of partFiles) {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      } catch {}

      // Sanitize concatenated video as well
      await sanitizePresenterVideo(tempOutputPath);

      resultCached = true;
    } else {
      // CASE B: Single driver / single slice
      const effectiveStartOffset = Array.isArray(slices) && slices.length === 1 ? slices[0].localStartFrame : startFrameOffset;
      const effectiveLoopId = Array.isArray(slices) && slices.length === 1 ? slices[0].clipId : loopId;
      const effectiveVideoUrl = Array.isArray(slices) && slices.length === 1 ? slices[0].videoUrl : videoUrl;

      const { driverPath, avatarId: resolvedAvatarId, isVideo } = resolvePresenterDriver({
        personaId,
        videoUrl: effectiveVideoUrl,
        loopId: effectiveLoopId,
        attire,
        avatarUrl,
      });

      log.info(`[LipSync] Resolved presenter driver: avatarId='${resolvedAvatarId}', path='${driverPath}', isVideo=${isVideo}, offset=${effectiveStartOffset}`);

      await ensureAvatarPreprocessed(resolvedAvatarId, driverPath, isVideo);

      const result = await generateMuseTalkLipSync({
        videoPath: driverPath,
        audioPath: tempAudioPath,
        outputPath: tempOutputPath,
        avatarId: resolvedAvatarId,
        useCache: true,
        fps,
        startFrameOffset: effectiveStartOffset,
      });

      if (!result.success || !fs.existsSync(tempOutputPath)) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "MuseTalk failed to produce output video.",
          },
          { status: 500 }
        );
      }

      // Sanitize single slice video
      await sanitizePresenterVideo(tempOutputPath);

      resultCached = !!result.cached;
      resolvedDriverPath = driverPath;
      finalAvatarId = resolvedAvatarId;
    }

    // Copy to public assets cache for browser and Remotion access
    const publicDir = path.join(process.cwd(), "public", "assets", "cache", "ecommerce");
    if (!fs.existsSync(publicDir)) {
      await fs.promises.mkdir(publicDir, { recursive: true });
    }

    const publicFilename = `presenter_${finalAvatarId}_${timestamp}.mp4`;
    const publicFilePath = path.join(publicDir, publicFilename);
    await fs.promises.copyFile(tempOutputPath, publicFilePath);

    // Generate 32-bit transparent VP9 WebM companion
    let transparentWebmUrl: string | null = null;
    if (asyncWebm) {
      // Non-blocking background generation: return MP4 immediately to client in ~2s instead of 15s!
      ensureTransparentWebmCompanion(publicFilePath)
        .then((url) => {
          if (url) log.info(`[LipSync] Background transparent WebM ready: ${url}`);
        })
        .catch((e) => {
          console.warn("[LipSync] Background transparent WebM error:", e);
        });
    } else {
      try {
        transparentWebmUrl = await ensureTransparentWebmCompanion(publicFilePath);
      } catch (e) {
        console.warn("[LipSync] Transparent WebM generation failed:", e);
      }
    }

    // Clean up temporary audio file
    if (fs.existsSync(tempAudioPath)) {
      try {
        await fs.promises.unlink(tempAudioPath);
      } catch {}
    }

    const publicUrl = `/assets/cache/ecommerce/${publicFilename}`;

    // Upload to MinIO / active storage provider for persistent access
    let persistentVideoUrl = publicUrl;
    try {
      const relativeKey = `ecommerce/${finalAvatarId}/videos/presenter_${finalAvatarId}_${timestamp}.mp4`;
      const storageKey = withTenant(companyId, relativeKey);
      const videoBuffer = await fs.promises.readFile(tempOutputPath);
      persistentVideoUrl = await storage.upload(storageKey, videoBuffer, "video/mp4");
    } catch (uploadErr) {
      console.warn("[LipSync] MinIO storage upload fallback to local URL:", uploadErr);
    }

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      storageUrl: persistentVideoUrl,
      transparentWebmUrl: transparentWebmUrl || undefined,
      cached: resultCached,
      avatarId: finalAvatarId,
      driverPath: resolvedDriverPath,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/presenter/lip-sync] Error:", msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
