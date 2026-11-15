/**
 * workers/pipeline-worker/tasks/videoTask.ts
 *
 * Modern Presenter video generation task handler supporting:
 * 1. MuseTalk 40 FPS Real-Time Neural Lip-Sync (Port 8007) with Pre-Rendered Action Loops & Latents
 * 2. ComfyUI Wan 2.1 & LTX-Video ComfyUI Diffusion (Port 8188) with 20-min Watchdog
 */

import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { execFile } from "child_process";
import { storage, generateKey } from "@/lib/storage";
import { reportProgress, updateSegment } from "../api";
import { getPersonaById } from "@/lib/tts/personas";
import { generateMuseTalkLipSync, getMuseTalkServerUrl } from "@/lib/ai/musetalkClient";
import { generateTalkingHeadInference } from "@/lib/ai/talkingHeadsClient";
import { checkEchoMimicHealth, generateEchoMimicLipSync } from "@/lib/ai/echomimicClient";
import { stitchFsmStoryVideo } from "@/lib/video/fsmStitcher";
import { monitorComfyUIWatchdog } from "@/lib/ai/comfy/comfyWatchdog";
import { getFFprobePath } from "@/lib/ai/comfy/utils";
import { PRICING } from "@/lib/constants/pricing";
import { JobCancelledError, WorkerSegment } from "./audioTask";
import { generateVeoVideo, isVeoConfigured } from "@/lib/ai/veoClient";
import { createLogger } from "@/lib/logger";
import { resolveLocalActionLoopVideo, resolveLocalPublicFile } from "@/lib/storage/localAssets";

const log = createLogger("worker:tasks:videoTask");

const execFileAsync = promisify(execFile);

// In-memory cache for resolved action loop paths across persona segments
const actionLoopCache = new Map<string, string>();

/**
 * Resolves the best available pre-rendered action loop or base video for a persona
 * from the worker's local disk first.
 */
export function resolveActionLoopVideo(personaId: string): string | null {
  const normId = personaId.toLowerCase();
  const cached = actionLoopCache.get(normId);
  if (cached && fs.existsSync(cached)) return cached;

  const resolved = resolveLocalActionLoopVideo(normId);
  if (resolved) {
    actionLoopCache.set(normId, resolved);
    return resolved;
  }

  return null;
}

async function resolveSegmentAvatarPath(
  segment: WorkerSegment,
  persona: { avatarUrl?: string } | undefined,
  tmpDir: string
): Promise<string> {
  const localFromSegment = segment.personaAvatarUrl
    ? resolveLocalPublicFile(segment.personaAvatarUrl)
    : null;
  if (localFromSegment) {
    return localFromSegment;
  }

  const localFromPersona = persona?.avatarUrl
    ? resolveLocalPublicFile(persona.avatarUrl)
    : null;
  if (localFromPersona) {
    return localFromPersona;
  }

  if (segment.personaAvatarUrl && /^https?:\/\//i.test(segment.personaAvatarUrl)) {
    try {
      const avatarRes = await fetch(segment.personaAvatarUrl);
      if (avatarRes.ok) {
        const avatarBuf = Buffer.from(await avatarRes.arrayBuffer());
        const avatarTmp = path.join(tmpDir, `avatar-${segment.id}.png`);
        fs.writeFileSync(avatarTmp, avatarBuf);
        return avatarTmp;
      }
    } catch {
      // Fallback to local default avatar below
    }
  }

  return (
    resolveLocalPublicFile("/avatars/ruby.png") ||
    path.join(process.cwd(), "public", "avatars", "ruby.png")
  );
}

export async function stepVideo(
  job: Record<string, unknown>,
  story: Record<string, unknown>,
  jobId: string,
  strategyType: "full" | "bubble" | "musetalk" | "comfy_wan" | string,
  config: { engine?: string | null; role?: string },
  isShuttingDown: () => boolean
): Promise<void> {
  const script = (story as { script?: { segments?: WorkerSegment[] } }).script;
  const segments = script?.segments ?? [];
  const companyId = (job.companyId as string) || "default";
  const storyId = (story.id as string) || (job.storyId as string);

  // Filter segments relevant to the requested video strategy
  let targetSegments = segments.filter((seg) => {
    if (strategyType === "musetalk" || strategyType === "bubble" || strategyType === "ditto") {
      return (
        seg.sceneStrategy === "musetalk" ||
        seg.sceneStrategy === "ditto" ||
        seg.sceneStrategy === "bubble" ||
        seg.sceneStrategy === "sadtalker" ||
        config.engine === "musetalk" ||
        config.engine === "ditto" ||
        config.engine === "bubble" ||
        (job as { type?: string }).type === "musetalk" ||
        (job as { type?: string }).type === "ditto" ||
        (job as { type?: string }).type === "video_bubble"
      );
    }
    if (strategyType === "comfy_wan") {
      return seg.sceneStrategy === "comfy_wan" || seg.sceneStrategy === "wan" || config.engine === "comfy_wan";
    }
    if (
      strategyType === "full" ||
      strategyType === "video_full" ||
      strategyType === "veo" ||
      strategyType === "minimax" ||
      strategyType === "taomate" ||
      strategyType === "ltx"
    ) {
      return (
        seg.sceneStrategy === "full" ||
        seg.sceneStrategy === "veo" ||
        seg.sceneStrategy === "minimax" ||
        seg.sceneStrategy === "taomate" ||
        seg.sceneStrategy === "minimax_taomate" ||
        seg.sceneStrategy === "ltx" ||
        seg.sceneStrategy === "ltx_2.5" ||
        seg.sceneStrategy === "comfy_wan" ||
        seg.sceneStrategy === "wan" ||
        !seg.sceneStrategy
      );
    }
    return seg.sceneStrategy === strategyType;
  });

  // If no strategy matched specifically, process all segments needing presenter video
  if (targetSegments.length === 0 && segments.length > 0) {
    targetSegments = segments.filter((seg) => seg.sceneStrategy !== "stock" && seg.sceneStrategy !== "article_image");
  }

  const segmentCount = targetSegments.length;
  log.info(`  🎬 Video (${strategyType}): Processing ${segmentCount} scenes...`);

  if (segmentCount === 0) return;

  await reportProgress(jobId, {
    step: `video_${strategyType}_start`,
    status: "VIDEO_IN_PROGRESS",
    doneSteps: 0,
  });

  const preferredEngine = (
    config.engine ||
    (job as { type?: string }).type ||
    (strategyType === "ditto"
      ? "ditto"
      : strategyType === "musetalk" || strategyType === "bubble"
      ? (process.env.DEFAULT_TALKINGHEAD_ENGINE || "musetalk")
      : strategyType === "veo"
      ? "veo"
      : strategyType === "minimax" || strategyType === "taomate"
      ? "minimax"
      : strategyType === "ltx"
      ? "ltx"
      : strategyType === "comfy_wan"
      ? "comfy_wan"
      : process.env.DEFAULT_FULL_VIDEO_ENGINE || (isVeoConfigured() ? "veo" : "ltx"))
  ).toLowerCase();

  const { generatePresenterVideo, loadWorkflow } = await import("@/lib/ai/comfyClient");

  for (let i = 0; i < segmentCount; i++) {
    if (isShuttingDown()) {
      log.info("  ⏸️  Shutdown requested — pausing after current scene");
      break;
    }

    const segment = targetSegments[i];
    let segmentStrategy = (segment.sceneStrategy || preferredEngine).toLowerCase();
    if (segmentStrategy === "sadtalker") {
      // Legacy sadtalker maps to modern talking head (musetalk or ditto based on preferredEngine)
      segmentStrategy = preferredEngine === "ditto" ? "ditto" : "musetalk";
    }
    log.info(`     Scene ${i + 1}/${segmentCount} (Index ${segment.index}): Generating video using engine [${segmentStrategy}]`);

    if (segment.presenterVideoPath) {
      log.info(`     ⏭️  Skipping Video: video already exists at ${segment.presenterVideoPath}`);
      continue;
    }

    if (!segment.audioPath) {
      console.error(`     ❌ Audio missing for scene ${segment.index}, skipping video generation.`);
      continue;
    }

    const tmpDir = os.tmpdir();
    const shmCandidate = process.platform === "linux" && fs.existsSync(`/dev/shm/tts_${segment.id}.wav`)
      ? `/dev/shm/tts_${segment.id}.wav`
      : null;

    const localAudioPath = shmCandidate || path.join(tmpDir, `audio-${segment.id}.wav`);
    const localVideoOut = process.platform === "linux" && fs.existsSync("/dev/shm")
      ? path.join("/dev/shm", `video-${segment.id}.mp4`)
      : path.join(tmpDir, `video-${segment.id}.mp4`);

    try {
      if (!shmCandidate) {
        // Download audio from storage
        const audioBuffer = await storage.download(segment.audioPath);
        if (!audioBuffer) {
          throw new Error(`Failed to download audio from storage key: ${segment.audioPath}`);
        }
        fs.writeFileSync(localAudioPath, audioBuffer);
      } else {
        log.info(`     ⚡ [Zero-Copy SHM] Using in-memory RAM-disk audio buffer: ${localAudioPath}`);
      }

      let videoGenerated = false;
      const personaId = (segment.personaId || "ruby").toLowerCase();
      const persona = getPersonaById(personaId);

      // ─── Mode 1A: Ditto Motion-Space Talking Head (Port 8010/8012) ──────────
      if (segmentStrategy === "ditto") {
        try {
          log.info(`     🕺 [Ditto:8010] Generating Motion-Space Talking Head for persona [${personaId}]...`);
          const masterVideoPath = resolveActionLoopVideo(personaId);
          const avatarAbsPath = await resolveSegmentAvatarPath(segment, persona, tmpDir);

          const dittoRes = await generateTalkingHeadInference({
            modelId: "ditto",
            avatarSrc: fs.existsSync(avatarAbsPath) ? avatarAbsPath : undefined,
            videoSrc: masterVideoPath && fs.existsSync(masterVideoPath) ? masterVideoPath : undefined,
            audioPath: localAudioPath,
            fps: 30,
            options: {
              avatar_id: personaId,
              use_cache: true,
            },
          });

          if (dittoRes.success && dittoRes.videoUrl) {
            if (fs.existsSync(dittoRes.videoUrl)) {
              fs.copyFileSync(dittoRes.videoUrl, localVideoOut);
            } else if (dittoRes.videoUrl.startsWith("http://") || dittoRes.videoUrl.startsWith("https://")) {
              const res = await fetch(dittoRes.videoUrl);
              if (res.ok) {
                fs.writeFileSync(localVideoOut, Buffer.from(await res.arrayBuffer()));
              }
            } else if (dittoRes.videoUrl.startsWith("/api/talking-heads/media/")) {
              const filename = path.basename(dittoRes.videoUrl);
              const cachedLocal = path.join(process.cwd(), "storage", "cache", "talking_heads", filename);
              if (fs.existsSync(cachedLocal)) {
                fs.copyFileSync(cachedLocal, localVideoOut);
              }
            }
            if (fs.existsSync(localVideoOut) && fs.statSync(localVideoOut).size > 0) {
              videoGenerated = true;
              log.info(`     ✅ [Ditto:8010] Motion-space talking head succeeded: ${localVideoOut}`);
            }
          }
        } catch (dittoErr: unknown) {
          const dittoMsg = dittoErr instanceof Error ? dittoErr.message : String(dittoErr);
          console.warn(`     ⚠️ Ditto synthesis notice: ${dittoMsg}. Falling back to MuseTalk...`);
        }
      }

      // ─── Mode 1B: MuseTalk 40 FPS Real-Time Neural Lip-Sync & FSM Stitcher (Port 8010) ──────
      if (
        !videoGenerated && (
          segmentStrategy === "musetalk" ||
          segmentStrategy === "action_fsm" ||
          segmentStrategy === "fsm" ||
          segmentStrategy === "loop" ||
          segmentStrategy === "bubble" ||
          segmentStrategy === "ditto" // Fallback from Ditto
        )
      ) {
        const talkingHeadUrl = getMuseTalkServerUrl();
        try {
          log.info(`     🔄 [FSM Stitcher] Running FSM video sequence synthesis for persona [${personaId}]...`);
          const stitchRes = await stitchFsmStoryVideo({
            masterAudioPath: localAudioPath,
            personaId,
            scriptText: segment.text,
            outputVideoPath: localVideoOut,
            musetalkServerUrl: talkingHeadUrl,
          });

          if (stitchRes.success && fs.existsSync(localVideoOut) && fs.statSync(localVideoOut).size > 0) {
            videoGenerated = true;
            log.info(`     ✅ [FSM Stitcher] FSM video synthesis succeeded: ${localVideoOut}`);
          }
        } catch (fsmErr: unknown) {
          const fsmMsg = fsmErr instanceof Error ? fsmErr.message : String(fsmErr);
          console.warn(`     ⚠️ FSM Stitcher fallback notice: ${fsmMsg}. Trying direct action loop...`);
          const masterVideoPath = resolveActionLoopVideo(personaId);
          if (masterVideoPath && fs.existsSync(masterVideoPath)) {
            const museRes = await generateMuseTalkLipSync({
              videoPath: masterVideoPath,
              audioPath: localAudioPath,
              outputPath: localVideoOut,
              fps: 30,
              serverUrl: talkingHeadUrl,
            });

            if (museRes.success && fs.existsSync(localVideoOut) && fs.statSync(localVideoOut).size > 0) {
              videoGenerated = true;
              log.info(`     ✅ [MuseTalk] Lip-sync synthesis succeeded: ${localVideoOut}`);
            }
          }
        }
      }

      // ─── Mode 2: EchoMimic V3 Half-Body Video Generation (Port 8006) ────────
      if (!videoGenerated && (
        segmentStrategy === "echomimic" ||
        segmentStrategy === "echomimic_v3" ||
        segmentStrategy === "half_body" ||
        config.engine === "echomimic" ||
        config.engine === "echomimic_v3"
      )) {
        log.info(`     🕺 [EchoMimic V3:8006] Checking server health for half-body generation...`);
        const isEchoOnline = await checkEchoMimicHealth();
        if (isEchoOnline) {
          try {
            const avatarAbsPath = await resolveSegmentAvatarPath(segment, persona, tmpDir);
            const masterVideoPath = resolveActionLoopVideo(personaId);

            log.info(`     🕺 [EchoMimic V3:8006] Generating half-body motion + lip-sync for persona [${personaId}]...`);
            const echoRes = await generateEchoMimicLipSync({
              imagePath: fs.existsSync(avatarAbsPath) ? avatarAbsPath : undefined,
              videoPath: masterVideoPath && fs.existsSync(masterVideoPath) ? masterVideoPath : undefined,
              audioPath: localAudioPath,
              outputPath: localVideoOut,
              fps: 30,
              motionScale: 1.05,
            });

            if (echoRes.success && fs.existsSync(localVideoOut) && fs.statSync(localVideoOut).size > 0) {
              videoGenerated = true;
              log.info(`     ✅ [EchoMimic V3:8006] Half-body synthesis succeeded: ${localVideoOut}`);
            }
          } catch (echoErr: unknown) {
            const echoMsg = echoErr instanceof Error ? echoErr.message : String(echoErr);
            console.warn(`     ⚠️ EchoMimic V3 notice: ${echoMsg}. Falling back to ComfyUI / MuseTalk...`);
          }
        } else {
          console.warn(`     ⚠️ EchoMimic V3 (port 8006) offline. Falling back to ComfyUI / MuseTalk...`);
        }
      }

      // ─── Mode 3A: Google Veo 3.1 API Generation (Cloud @google/genai) ──────────
      if (
        !videoGenerated &&
        (segmentStrategy === "veo" || (segmentStrategy === "full" && preferredEngine === "veo")) &&
        isVeoConfigured()
      ) {
        log.info(`     🌟 [Google Veo 3.1 API] Generating high-fidelity presenter video...`);
        try {
          const avatarAbsPath = await resolveSegmentAvatarPath(segment, persona, tmpDir);

          const personaPrompt = segment.personaImagePrompt ||
            `A professional television news anchor presenting news in a modern high-tech broadcast studio set. Sharp cinematic lighting, photorealistic, broadcast quality: ${segment.text || ""}`;

          const veoRes = await generateVeoVideo({
            prompt: personaPrompt,
            imagePath: fs.existsSync(avatarAbsPath) ? avatarAbsPath : undefined,
            endImagePath: fs.existsSync(avatarAbsPath) ? avatarAbsPath : undefined,
            durationSeconds: 8,
            aspectRatio: "16:9",
            model: "veo-3.1-fast",
            outputPath: localVideoOut,
            onProgress: (statusText, pct) => {
              reportProgress(jobId, {
                step: `video_veo_seg_${i}_${statusText.slice(0, 20)}`,
                status: "VIDEO_IN_PROGRESS",
                doneSteps: i + pct / 100,
              }).catch(() => {});
            },
          });

          if (veoRes.success && (fs.existsSync(localVideoOut) || veoRes.videoBuffer)) {
            if (veoRes.videoBuffer && (!fs.existsSync(localVideoOut) || fs.statSync(localVideoOut).size === 0)) {
              fs.writeFileSync(localVideoOut, veoRes.videoBuffer);
            }
            videoGenerated = true;
            log.info(`     ✅ [Google Veo 3.1 API] Video generation succeeded: ${localVideoOut}`);
          } else {
            console.warn(`     ⚠️ [Google Veo 3.1 API] Notice: ${veoRes.error || "empty payload"}. Falling back to ComfyUI...`);
          }
        } catch (veoErr: unknown) {
          const veoMsg = veoErr instanceof Error ? veoErr.message : String(veoErr);
          console.warn(`     ⚠️ [Google Veo 3.1 API] Error: ${veoMsg}. Falling back to ComfyUI...`);
        }
      }

      // ─── Mode 3B: MiniMax H3 + TaoMate LoRA Diffusion (Port 8188) ─────────────
      if (
        !videoGenerated &&
        (segmentStrategy === "minimax" ||
         segmentStrategy === "taomate" ||
         segmentStrategy === "minimax_taomate" ||
         (segmentStrategy === "full" && (preferredEngine === "minimax" || preferredEngine === "taomate")))
      ) {
        log.info(`     ⚡ [MiniMax+TaoMate:8188] Generating ultra-fast distilled video via ComfyUI...`);
        const genStartTime = Date.now();
        try {
          const avatarAbsPath = await resolveSegmentAvatarPath(segment, persona, tmpDir);

          const comfyModel: "minimax_taomate" | "minimax_h3" = (segmentStrategy.includes("taomate") || segmentStrategy === "minimax" || preferredEngine === "minimax" || preferredEngine === "taomate") ? "minimax_taomate" : "minimax_h3";
          const workflow = loadWorkflow(comfyModel);

          const inputs = {
            imagePath: avatarAbsPath,
            audioPath: localAudioPath,
            model: comfyModel,
            positivePrompt: segment.personaImagePrompt || undefined,
          };

          const generatedBuffer = await generatePresenterVideo(inputs, workflow, (pct) => {
            reportProgress(jobId, {
              step: `video_minimax_seg_${i}`,
              status: "VIDEO_IN_PROGRESS",
              doneSteps: i + pct / 100,
            }).catch(() => {});
          });

          await monitorComfyUIWatchdog(genStartTime, { timeoutMs: 600_000 });

          fs.writeFileSync(localVideoOut, generatedBuffer);
          if (fs.existsSync(localVideoOut) && fs.statSync(localVideoOut).size > 0) {
            videoGenerated = true;
            log.info(`     ✅ [MiniMax+TaoMate:8188] Video generation succeeded: ${localVideoOut}`);
          }
        } catch (minimaxErr: unknown) {
          const minimaxMsg = minimaxErr instanceof Error ? minimaxErr.message : String(minimaxErr);
          console.warn(`     ⚠️ MiniMax+TaoMate generation notice: ${minimaxMsg}. Falling back...`);
        }
      }

      // ─── Mode 3C: ComfyUI LTX-Video 2.5 / Wan 2.1 Diffusion (Port 8188) ───────────
      if (!videoGenerated) {
        log.info(`     🎨 [ComfyUI:8188] Generating presenter video via LTX-Video 2.5 / Wan 2.1...`);
        const genStartTime = Date.now();
        try {
          // Resolve persona avatar image
          const avatarAbsPath = await resolveSegmentAvatarPath(segment, persona, tmpDir);

          // Determine ComfyUI model variant (wan_alpha or ltx_2.5 or ltx)
          const comfyModel: "wan_alpha" | "ltx_2.5" = segmentStrategy.includes("wan") ? "wan_alpha" : "ltx_2.5";
          const workflow = loadWorkflow(comfyModel);

          const inputs = {
            imagePath: avatarAbsPath,
            audioPath: localAudioPath,
            model: comfyModel,
            positivePrompt: segment.personaImagePrompt || undefined,
          };

          const generatedBuffer = await generatePresenterVideo(inputs, workflow, (pct) => {
            reportProgress(jobId, {
              step: `video_${strategyType}_seg_${i}`,
              status: "VIDEO_IN_PROGRESS",
              doneSteps: i + pct / 100,
            }).catch(() => {});
          });

          // 20-minute Self-Healing Watchdog Check
          await monitorComfyUIWatchdog(genStartTime, { timeoutMs: 1_200_000 });

          fs.writeFileSync(localVideoOut, generatedBuffer);
          if (fs.existsSync(localVideoOut) && fs.statSync(localVideoOut).size > 0) {
            videoGenerated = true;
            log.info(`     ✅ [ComfyUI:8188] ${comfyModel} generation succeeded: ${localVideoOut}`);
          }
        } catch (comfyErr: unknown) {
          const comfyMsg = comfyErr instanceof Error ? comfyErr.message : String(comfyErr);
          console.warn(`     ⚠️ ComfyUI generation notice: ${comfyMsg}`);

          // Self-healing fallback to Veo API if ComfyUI failed or is offline
          if (isVeoConfigured()) {
            log.info(`     🔄 [Self-Healing] Falling back to Google Veo 3.1 API...`);
            const avatarAbsPath = await resolveSegmentAvatarPath(segment, persona, tmpDir);
            const veoFallbackRes = await generateVeoVideo({
              prompt: segment.personaImagePrompt || `Professional news anchor: ${segment.text || ""}`,
              imagePath: fs.existsSync(avatarAbsPath) ? avatarAbsPath : undefined,
              outputPath: localVideoOut,
            });
            if (veoFallbackRes.success && (fs.existsSync(localVideoOut) || veoFallbackRes.videoBuffer)) {
              if (veoFallbackRes.videoBuffer && (!fs.existsSync(localVideoOut) || fs.statSync(localVideoOut).size === 0)) {
                fs.writeFileSync(localVideoOut, veoFallbackRes.videoBuffer);
              }
              videoGenerated = true;
              log.info(`     ✅ [Self-Healing] Google Veo 3.1 API fallback succeeded: ${localVideoOut}`);
            }
          }
        }
      }

      if (videoGenerated && fs.existsSync(localVideoOut)) {
        const outBuffer = fs.readFileSync(localVideoOut);

        // Probe video duration with ffprobe for accurate timeline calibration
        let probedVideoDuration: number | null = null;
        try {
          const ffprobeBin = getFFprobePath();
          const { stdout } = await execFileAsync(
            ffprobeBin,
            ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", localVideoOut]
          );
          const dur = parseFloat(stdout.trim());
          if (!isNaN(dur) && dur > 0) {
            probedVideoDuration = dur;
            log.info(`     ⏱️  Probed Video Duration: ${probedVideoDuration.toFixed(2)}s`);
          }
        } catch (probeErr: unknown) {
          const probeMsg = probeErr instanceof Error ? probeErr.message : String(probeErr);
          console.warn(`     ⚠️ ffprobe video probe notice: ${probeMsg}`);
        }

        // Enforce Tenant-Scoped Storage Key: tenants/{orgId}/video/{storyId}/{filename}
        const videoFilename = `seg_${segment.index}_${segment.personaId || "default"}.mp4`;
        const objectKey = generateKey({
          companyId,
          type: "video",
          id: storyId,
          filename: videoFilename,
        });

        await storage.upload(objectKey, outBuffer, "video/mp4");

        const updateData: Record<string, unknown> = { presenterVideoPath: objectKey };
        if (probedVideoDuration && segment.startTime !== null && segment.startTime !== undefined) {
          updateData.endTime = segment.startTime + probedVideoDuration;
        }
        await updateSegment(jobId, segment.id, updateData);

        log.info(`     ✅ Video uploaded to Storage: ${objectKey}`);

        const creditDuration = probedVideoDuration || (segment.endTime ?? 0) - (segment.startTime ?? 0) || 5;
        const creditsUsed = creditDuration * PRICING.COST_PER_VIDEO_SEC;

        const ok = await reportProgress(jobId, {
          step: `video_${strategyType}_seg_${i}`,
          status: "VIDEO_IN_PROGRESS",
          doneSteps: i + 1,
          creditsUsed,
        });
        if (!ok) throw new JobCancelledError();
      } else {
        throw new Error(`Video generation completed but output file not found at ${localVideoOut}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`     ❌ Video generation error for scene ${segment.index}:`, errMsg);
      throw err;
    } finally {
      try { if (fs.existsSync(localAudioPath)) fs.unlinkSync(localAudioPath); } catch {}
      try { if (fs.existsSync(localVideoOut)) fs.unlinkSync(localVideoOut); } catch {}
    }
  }

  log.info(`  ✅ Video (${strategyType}) complete for ${segmentCount} scenes`);
}

