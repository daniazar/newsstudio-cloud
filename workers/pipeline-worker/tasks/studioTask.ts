/**
 * workers/pipeline-worker/tasks/studioTask.ts
 *
 * Studio productions pipeline handler (Interview, Podcast, VTuber, Data Studio, Narrative Matrix).
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";
import { storage, withTenant } from "@/lib/storage";
import { createTenantSandbox, cleanupTenantSandbox } from "@/lib/storage/sandbox";
import { runMultimodalQACheck } from "@/lib/qa/qualityGatekeeper";
import { reportProgress } from "../api";
import { resolveLocalAvatarFile } from "../config";
import { generateAudioWithModernTts, generateDialogueBatch } from "@/lib/tts/modernTtsClient";
import {
  getRemotionEntryPoint,
  getRemotionBinPath,
  getOptimalRemotionConcurrency,
} from "@/lib/video/remotionUtils";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:tasks:studioTask");

const execAsync = promisify(exec);

/**
 * Maps studioType and aspectRatio to the corresponding Remotion composition ID.
 */
export function resolveStudioCompositionId(studioType: string, aspectRatio?: string): string {
  const isVertical = aspectRatio === "vertical";
  const isSquare = aspectRatio === "square";

  if (studioType === "ecommerce") {
    if (isVertical || aspectRatio === "9:16" || aspectRatio === "4:5") return "ProductAd-Vertical";
    if (isSquare || aspectRatio === "1:1") return "ProductAd-Square";
    return "ProductAd-Landscape";
  }

  if (studioType === "debate") {
    if (isVertical) return "RubyNews-DebateStudio-Vertical";
    if (isSquare) return "RubyNews-DebateStudio-Square";
    return "RubyNews-DebateStudio-Horizontal";
  }

  if (isVertical) return "RubyNews-3CameraBroadcast-Vertical";
  if (isSquare) return "RubyNews-3CameraBroadcast-Square";
  return "RubyNews-3CameraBroadcast-Horizontal";
}

export interface StudioTurn {
  durationSeconds?: number;
  cameraAngle?: string;
  speakerId?: string;
  personaId?: string;
  speakerName?: string;
  role?: string;
  text?: string;
  argumentText?: string;
  videoPath?: string;
  audioPath?: string;
  language?: string;
  [key: string]: unknown;
}

/**
 * Builds standard RemotionSegments from multi-speaker studio turns.
 */
export function buildStudioSegments(
  turns: StudioTurn[],
  fps: number = 30,
  generatedImagesMap?: Record<string, string>
) {
  let currentFrame = 0;
  return turns.map((turn: StudioTurn, idx: number) => {
    const durSec = turn.durationSeconds || 3.5;
    const durFrames = Math.max(60, Math.round(durSec * fps));
    const startFrame = currentFrame;
    const endFrame = startFrame + durFrames;
    currentFrame = endFrame;

    // Camera cue mapping
    let cameraCue = "cam1_wide";
    if (turn.cameraAngle) {
      if (turn.cameraAngle === "guest_solo") cameraCue = "cam3_closeup";
      else if (turn.cameraAngle === "host_solo") cameraCue = "cam2_left";
      else cameraCue = "cam1_wide";
    } else {
      cameraCue = idx % 3 === 0 ? "cam1_wide" : idx % 3 === 1 ? "cam2_left" : "cam3_closeup";
    }

    const speakerId = turn.speakerId || turn.personaId || "ruby";
    const speakerName = turn.speakerName || (speakerId.charAt(0).toUpperCase() + speakerId.slice(1));
    const speakerTitle = turn.role || (speakerId === "ruby" ? "Lead Anchor" : "Studio Guest");

    return {
      index: idx,
      startFrame,
      endFrame,
      text: turn.text || turn.argumentText || "",
      cameraCue,
      speakerName,
      speakerTitle,
      personaName: speakerName,
      personaTitle: speakerTitle,
      presenterVideoSrc: turn.videoPath ? storage.getUrl(turn.videoPath) : undefined,
      presenterImageSrc: generatedImagesMap?.[speakerId] ? storage.getUrl(generatedImagesMap[speakerId]) : `/avatars/${speakerId}.png`,
      audioUrl: turn.audioPath ? storage.getUrl(turn.audioPath) : undefined,
      bRollType: "placeholder",
    };
  });
}

/**
 * Extracts camera switching intervals from studio segments.
 */
export function buildStudioCameraCues(segments: Array<{ cameraCue?: string; startFrame: number; endFrame: number }>) {
  return segments.map((s) => ({
    cam: (s.cameraCue || "cam1_wide") as "cam1_wide" | "cam2_left" | "cam3_closeup",
    startFrame: s.startFrame,
    endFrame: s.endFrame,
  }));
}

export async function stepStudioJob(
  job: Record<string, unknown>,
  story: Record<string, unknown> | null,
  jobId: string,
  studioType: string,
  isShuttingDown: () => boolean
): Promise<void> {
  const companyId = job.companyId as string;
  const storyId = (job.storyId || story?.id) as string;
  const rawPayload = (job as { studioPayload?: unknown; payload?: unknown }).studioPayload || (job as { payload?: unknown }).payload;
  if (!rawPayload) throw new Error("No studio payload found in job");

  const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
  const outputMode = payload.outputMode || "video";
  const generateImages = payload.generateImages !== false;

  log.info(`\n🎬 Studio Pipeline [${studioType.toUpperCase()}] | Mode: ${outputMode} | Job: ${jobId}`);

  await reportProgress(jobId, {
    step: "studio_start",
    status: "PROCESSING",
    doneSteps: 0,
  });

  // Step 1: Persona Image Generation if requested
  if (studioType !== "ecommerce" && generateImages && outputMode === "video") {
    log.info(`  🎨 Studio Image Gen: Creating attire-matched presenter images...`);
    const { generatePresenterImage } = await import("@/lib/ai/comfyClient");
    const { STUDIO_FULL_PRESETS, getRandomStudioAttire } = await import("@/data/prompt_presets");
    const { compilePresenterPrompt } = await import("@/lib/prompt/promptCompiler");

    const personaSlugs = new Set<string>();
    if (payload.speakers) payload.speakers.forEach((s: { id?: string }) => s.id && personaSlugs.add(s.id));
    if (payload.turns) payload.turns.forEach((t: { speakerId?: string }) => t.speakerId && personaSlugs.add(t.speakerId));
    if (payload.lines) payload.lines.forEach((l: { speakerId?: string }) => l.speakerId && personaSlugs.add(l.speakerId));
    if (payload.perspectives) payload.perspectives.forEach((p: { personaId?: string }) => p.personaId && personaSlugs.add(p.personaId));
    if (payload.personaId) personaSlugs.add(payload.personaId);
    if (personaSlugs.size === 0) personaSlugs.add("ruby");

    const presetName =
      studioType === "interview"
        ? "Evening Talk Show"
        : studioType === "podcast"
        ? "Morning Talk Show"
        : studioType === "vtuber"
        ? "Tech Segment Reviewer"
        : studioType === "data_studio"
        ? "Financial Market Update"
        : studioType === "narrative_matrix"
        ? "Press Briefing"
        : studioType === "debate"
        ? "Press Briefing"
        : "Global Summit Correspondent";

    const preset = STUDIO_FULL_PRESETS.find((p) => p.name === presetName) || STUDIO_FULL_PRESETS[0];
    const generatedImagesMap: Record<string, string> = {};

    for (const slug of Array.from(personaSlugs)) {
      if (isShuttingDown()) break;
      let resolvedRef =
        resolveLocalAvatarFile(`${slug}_ref.png`) ||
        resolveLocalAvatarFile(`${slug}.png`) ||
        resolveLocalAvatarFile("ruby_ref.png") ||
        resolveLocalAvatarFile("ruby.png") ||
        undefined;
      if (!resolvedRef) {
        try {
          const buf = await storage.download(`avatars/${slug}.png`).catch(() => storage.download("avatars/ruby.png"));
          const tmpRef = path.join(process.cwd(), "scratch", "tmp", `avatar-${slug}.png`);
          fs.mkdirSync(path.dirname(tmpRef), { recursive: true });
          fs.writeFileSync(tmpRef, buf);
          resolvedRef = tmpRef;
        } catch {
          resolvedRef = undefined;
        }
      }

      const attire = getRandomStudioAttire();
      const compiled = compilePresenterPrompt({
        personaDescription: `${slug}, professional news presenter`,
        preset,
        attire,
        studioApprovedOnly: true,
        fullAttireOnly: true,
      });

      log.info(`     Generating image for persona [${slug}] with preset "${presetName}"...`);
      try {
        const imageBuf = await generatePresenterImage(compiled.positivePrompt, resolvedRef);
        const objectKey = withTenant(companyId, `studio-images/${slug}/${studioType}/${Date.now()}.png`);
        await storage.upload(objectKey, imageBuf, "image/png");
        generatedImagesMap[slug] = objectKey;
        log.info(`     ✅ Image generated for [${slug}]: ${objectKey}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`     ⚠️ Failed image gen for [${slug}]:`, errMsg);
      }
    }

    payload.generatedImagesMap = generatedImagesMap;
  }

  // Step 2: TTS Generation
  if (outputMode === "audio_only") {
    log.info(`  🎙️  TTS (Audio Only): Calling Modern-TTS-Server render-podcast...`);
    const MODERN_TTS_URL = process.env.MODERN_TTS_SERVER_URL || "http://localhost:8005";

    const scenes: Array<{ speaker_id: string; text: string; language?: string }> = [];
    if (payload.turns) {
      payload.turns.forEach((t: { speakerId?: string; text?: string }) => {
        if (t.speakerId && t.text) scenes.push({ speaker_id: t.speakerId, text: t.text });
      });
    } else if (payload.lines) {
      payload.lines.forEach((l: { speakerId?: string; text?: string; language?: string }) => {
        if (l.speakerId && l.text) scenes.push({ speaker_id: l.speakerId, text: l.text, language: l.language });
      });
    } else if (payload.perspectives) {
      payload.perspectives.forEach((p: { personaId?: string; argumentText?: string }) => {
        if (p.personaId && p.argumentText) scenes.push({ speaker_id: p.personaId, text: p.argumentText });
      });
    } else if (payload.summary) {
      scenes.push({ speaker_id: payload.personaId || "ruby", text: payload.summary });
    }

    const ttsRes = await fetch(`${MODERN_TTS_URL}/api/tts/render-podcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: payload.topic || payload.title || "Studio Segment", scenes }),
    });

    if (!ttsRes.ok) {
      throw new Error(`Modern-TTS render-podcast failed (${ttsRes.status}): ${await ttsRes.text()}`);
    }

    const audioBuf = Buffer.from(await ttsRes.arrayBuffer());
    const audioKey = withTenant(companyId, `studio-audio/${storyId}/${studioType}/podcast.wav`);
    await storage.upload(audioKey, audioBuf, "audio/wav");
    payload.stitchedAudioPath = audioKey;
    log.info(`  ✅ Stitched audio saved to: ${audioKey}`);
  } else {
    log.info(`  🎙️  TTS (Batched Multi-Speaker Mode): Generating audio for all dialogue turns...`);
    const turns: StudioTurn[] =
      payload.turns || payload.lines || payload.perspectives || (payload.summary ? [{ speakerId: payload.personaId, text: payload.summary }] : []);

    const dialogueRequests = turns.map((turn: StudioTurn, i: number) => ({
      id: `turn_${i + 1}`,
      text: (turn.text as string) || (turn.argumentText as string),
      personaId: (turn.speakerId as string) || (turn.personaId as string) || "ruby",
      language: (turn.language as string) || "es",
    })).filter((t: { text?: string }) => Boolean(t.text));

    let batchHandled = false;
    if (dialogueRequests.length > 0) {
      try {
        log.info(`     🚀 Synthesizing ${dialogueRequests.length} dialogue turns concurrently on Modern-TTS-Server...`);
        const batchResp = await generateDialogueBatch(dialogueRequests, true);
        log.info(`     ✅ Generated ${batchResp.total_items} turns in ${batchResp.total_wall_ms}ms!`);

        for (let i = 0; i < turns.length; i++) {
          const turn = turns[i];
          const turnResult = batchResp.items.find((it) => it.id === `turn_${i + 1}`);
          if (turnResult && turnResult.audio_base64) {
            const audioBuf = Buffer.from(turnResult.audio_base64, "base64");
            const turnAudioKey = withTenant(companyId, `studio-audio/${storyId}/${studioType}/turn-${i + 1}.wav`);
            await storage.upload(turnAudioKey, audioBuf, "audio/wav");
            turn.audioPath = turnAudioKey;
            log.info(`     ✅ Turn ${i + 1} audio (${turnResult.engine}/${turnResult.persona_id}): ${turnAudioKey}`);
          }
        }
        batchHandled = true;
      } catch (batchErr: unknown) {
        const batchMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
        console.warn(`     ⚠️ Batch dialogue synthesis notice (${batchMsg}). Falling back to per-turn synthesis...`);
      }
    }

    if (!batchHandled) {
      for (let i = 0; i < turns.length; i++) {
        if (isShuttingDown()) break;
        const turn = turns[i];
        const speakerId = (turn.speakerId as string) || (turn.personaId as string) || "ruby";
        const text = (turn.text as string) || (turn.argumentText as string);
        if (!text) continue;

        log.info(`     Synthesizing turn ${i + 1}/${turns.length} (${speakerId})...`);
        try {
          const audioBuf = await generateAudioWithModernTts(text, `${speakerId}.wav`, {
            language: (turn.language as string) || "es",
          });
          const turnAudioKey = withTenant(companyId, `studio-audio/${storyId}/${studioType}/turn-${i + 1}.wav`);
          await storage.upload(turnAudioKey, audioBuf, "audio/wav");
          turn.audioPath = turnAudioKey;
          log.info(`     ✅ Turn ${i + 1} audio: ${turnAudioKey}`);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`     ⚠️ Turn ${i + 1} audio gen failed:`, errMsg);
        }
      }
    }
  }

  // Step 3: Lip-Sync Video Generation (if video mode)
  if (studioType !== "ecommerce" && outputMode === "video") {
    log.info(`  🎬 Studio Lip-Sync: Generating presenter videos per turn...`);
    const turns =
      payload.turns ||
      payload.lines ||
      payload.perspectives ||
      (payload.summary ? [{ speakerId: payload.personaId, text: payload.summary, audioPath: payload.audioPath }] : []);

    for (let i = 0; i < turns.length; i++) {
      if (isShuttingDown()) break;
      const turn = turns[i];
      if (!turn.audioPath) continue;

      const speakerId = turn.speakerId || turn.personaId || "ruby";
      const imageKey = payload.generatedImagesMap?.[speakerId] || `avatars/${speakerId}.png`;

      log.info(`     Generating lip-sync for turn ${i + 1}/${turns.length} (${speakerId})...`);
      try {
        const audioBuf = await storage.download(turn.audioPath);
        const imageBuf = await storage.download(imageKey).catch(async () => {
          const localAvatar =
            resolveLocalAvatarFile(`${speakerId}.png`) ||
            resolveLocalAvatarFile("ruby.png");
          if (localAvatar) return fs.readFileSync(localAvatar);
          return storage.download(`avatars/${speakerId}.png`).catch(() => storage.download("avatars/ruby.png"));
        });

        const tmpAudio = path.join(process.cwd(), `scratch/tmp/turn-${jobId}-${i}.wav`);
        const tmpImg = path.join(process.cwd(), `scratch/tmp/turn-${jobId}-${i}.png`);
        fs.mkdirSync(path.dirname(tmpAudio), { recursive: true });
        fs.writeFileSync(tmpAudio, audioBuf);
        fs.writeFileSync(tmpImg, imageBuf);

        const { generatePresenterVideo, loadWorkflow } = await import("@/lib/ai/comfyClient");
        const workflow = loadWorkflow("1.3b");
        const videoBuf = await generatePresenterVideo(
          {
            imagePath: tmpImg,
            audioPath: tmpAudio,
            model: "1.3b",
          },
          workflow
        );
        const clipKey = withTenant(companyId, `studio-video/${storyId}/${studioType}/clip-${i + 1}.mp4`);
        await storage.upload(clipKey, videoBuf, "video/mp4");
        turn.videoPath = clipKey;
        log.info(`     ✅ Turn ${i + 1} video clip: ${clipKey}`);

        if (fs.existsSync(tmpAudio)) fs.unlinkSync(tmpAudio);
        if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`     ⚠️ Turn ${i + 1} video gen failed:`, errMsg);
      }
    }
  }

  // Step 4: Final Master Broadcast Remotion Video Stitch with Tenant Sandboxing & QA Gatekeeper
  if (outputMode === "video") {
    log.info(`  🎥 Remotion Compositor: Stitching ${studioType.toUpperCase()} broadcast into final MP4...`);
    await reportProgress(jobId, {
      step: "studio_render_remotion",
      status: "PROCESSING",
      doneSteps: 8,
    });

    const sandboxDir = await createTenantSandbox(companyId, jobId);

    try {
      const turns =
        payload.turns ||
        payload.lines ||
        payload.perspectives ||
        (payload.summary ? [{ speakerId: payload.personaId, text: payload.summary }] : []);

      const FPS = 30;
      const remotionSegments = buildStudioSegments(turns, FPS, payload.generatedImagesMap);
      const totalFrames = remotionSegments.length > 0 ? remotionSegments[remotionSegments.length - 1].endFrame : 300;
      const cameraCues = buildStudioCameraCues(remotionSegments);

      const isVertical =
        payload.aspectRatio === "vertical" || payload.aspectRatio === "9:16" || payload.aspectRatio === "4:5";
      const isSquare = payload.aspectRatio === "square" || payload.aspectRatio === "1:1";
      const compositionId = resolveStudioCompositionId(studioType, payload.aspectRatio);

      const inputProps =
        studioType === "ecommerce"
          ? {
              productSpec: payload.productSpec,
              script: payload.script,
              aspectRatio: payload.aspectRatio || "9:16",
              audioMode: payload.audioMode || "voiceover_tts",
              audioUrl: payload.audioUrl,
              musicBedUrl: payload.musicBedUrl,
              showSafeZones: false,
              accentColorOverride: payload.accentColorOverride,
              presenter: payload.presenter,
              showPresenter: payload.showPresenter ?? (payload.presenter?.enabled !== false),
              watermark: payload.watermark,
              usVsThem: payload.usVsThem,
              qrCode: payload.qrCode,
              socialPopup: payload.socialPopup,
              baseMusicVolume: payload.baseMusicVolume,
              duckingDb: payload.duckingDb,
              backdrop: payload.backdrop,
              captionStyle: payload.captionStyle,
              captionOffsetY: payload.captionOffsetY,
              captionOffsetX: payload.captionOffsetX,
              showCaptions: payload.showCaptions,
              headlineOffsetY: payload.headlineOffsetY,
              headlineOffsetX: payload.headlineOffsetX,
              showHeadline: payload.showHeadline,
              productOffsetX: payload.productOffsetX,
              productOffsetY: payload.productOffsetY,
              productScale: payload.productScale,
              showProductVisual: payload.showProductVisual,
              badgeOffsetY: payload.badgeOffsetY,
              badgeOffsetX: payload.badgeOffsetX,
              showFactBadge: payload.showFactBadge,
              featureBadgeText: payload.featureBadgeText,
              showPricePromo: payload.showPricePromo,
              pricePromoOffsetX: payload.pricePromoOffsetX,
              pricePromoOffsetY: payload.pricePromoOffsetY,
              pricePromoScale: payload.pricePromoScale,
              showCtaButton: payload.showCtaButton,
              ctaOffsetX: payload.ctaOffsetX,
              ctaOffsetY: payload.ctaOffsetY,
              ctaScale: payload.ctaScale,
              showTickerTape: payload.showTickerTape,
              tickerTapeOffsetY: payload.tickerTapeOffsetY,
              showBackdrop: payload.showBackdrop,
              showWatermark: payload.showWatermark,
              showBrandLogo: payload.showBrandLogo,
              brandLogoOffsetX: payload.brandLogoOffsetX,
              brandLogoOffsetY: payload.brandLogoOffsetY,
              brandLogoScale: payload.brandLogoScale,
              showFeaturePills: payload.showFeaturePills,
              featurePillsOffsetX: payload.featurePillsOffsetX,
              featurePillsOffsetY: payload.featurePillsOffsetY,
              showReviewCard: payload.showReviewCard,
              reviewCardOffsetX: payload.reviewCardOffsetX,
              reviewCardOffsetY: payload.reviewCardOffsetY,
              reviewCardScale: payload.reviewCardScale,
              turntablePedestal: payload.turntablePedestal,
              intro: payload.intro,
              outro: payload.outro,
            }
          : {
              aspectRatio: isVertical ? "vertical" : isSquare ? "square" : "horizontal",
              topicHeadline: payload.topic || payload.title || "STUDIO SPECIAL REPORT",
              segments: remotionSegments,
              cameraCues,
              masterAudioSrc: payload.stitchedAudioPath ? storage.getUrl(payload.stitchedAudioPath) : undefined,
              presenterImageSrc: payload.generatedImagesMap?.["ruby"]
                ? storage.getUrl(payload.generatedImagesMap["ruby"])
                : "/avatars/ruby.png",
              backgroundPlateSrc: payload.backgroundPlateSrc || "/images/studio_plate_default.png",
              foregroundDeskSrc: payload.foregroundDeskSrc || "/images/studio_desk_default.png",
              showLowerThirds: true,
              enableParallaxPushIn: true,
            };

      const outputFile = path.join(sandboxDir, `studio-${studioType}-${jobId}.mp4`);
      const tempPropsFile = path.join(sandboxDir, `studio-props-${jobId}.json`);
      fs.writeFileSync(tempPropsFile, JSON.stringify(inputProps));

      const normalizedPropsPath = tempPropsFile.replace(/\\/g, "/");
      const normalizedOutputPath = outputFile.replace(/\\/g, "/");
      const { entryPoint } = getRemotionEntryPoint();
      const remotionBin = getRemotionBinPath();
      const concurrency = getOptimalRemotionConcurrency(false);

      const renderArgs = remotionBin.endsWith("npx") || remotionBin.endsWith("npx.cmd")
        ? [
            "remotion",
            "render",
            entryPoint,
            compositionId,
            `"${normalizedOutputPath}"`,
            `--props="${normalizedPropsPath}"`,
            `--concurrency=${concurrency}`,
            "--gl=angle",
            "--pixel-format=yuv420p",
            "--crf=18",
            "--jpeg-quality=95",
            "--bundle-cache=true",
          ]
        : [
            "render",
            entryPoint,
            compositionId,
            `"${normalizedOutputPath}"`,
            `--props="${normalizedPropsPath}"`,
            `--concurrency=${concurrency}`,
            "--gl=angle",
            "--pixel-format=yuv420p",
            "--crf=18",
            "--jpeg-quality=95",
            "--bundle-cache=true",
          ];

      const cmd = `${remotionBin} ${renderArgs.join(" ")}`;
      await execAsync(cmd, { cwd: process.cwd(), timeout: 600000 });

      if (fs.existsSync(outputFile)) {
        const renderBuffer = fs.readFileSync(outputFile);

        // Run Pre-Publication Multimodal QA Gatekeeper
        log.info(`     🔍 Running Multimodal QA Gatekeeper & C2PA Provenance check...`);
        const qaReport = runMultimodalQACheck(renderBuffer, {
          title: payload.topic || payload.title,
          studioType,
          companyId,
          expectedDurationSec: totalFrames / FPS,
        });

        payload.qaReport = qaReport;
        log.info(`     🔍 QA Gatekeeper Result: Score ${qaReport.score}/100 | Passed: ${qaReport.passed}`);

        if (qaReport.warnings.length > 0) {
          console.warn(`     ⚠️ QA Gatekeeper Warnings:`, qaReport.warnings);
        }

        if (qaReport.passed) {
          const finalRenderKey = withTenant(companyId, `studio-renders/${storyId}/${studioType}/${Date.now()}.mp4`);
          await storage.upload(finalRenderKey, renderBuffer, "video/mp4");
          payload.finalRenderVideoPath = finalRenderKey;
          payload.c2paManifest = qaReport.c2paManifest;
          log.info(`     ✅ Master studio broadcast rendered, QA-verified, and uploaded: ${finalRenderKey}`);

          // Sprint E6.2: Auto-generate lightweight WebM (<2.5MB) and animated WebP (<1.8MB) for ecommerce
          if (studioType === "ecommerce") {
            try {
              log.info(`     📦 Generating multi-format web deliverables (WebM PDP loop & WebP email animation)...`);
              const { exportMultiFormatVideo } = await import("@/lib/ecommerce/multiFormatExporter");
              const multiFormat = await exportMultiFormatVideo(outputFile, { outputDir: sandboxDir });

              if (multiFormat.webmLoop && fs.existsSync(multiFormat.webmLoop.path)) {
                const webmKey = withTenant(companyId, `studio-renders/${storyId}/ecommerce/${Date.now()}-loop.webm`);
                await storage.upload(webmKey, fs.readFileSync(multiFormat.webmLoop.path), "video/webm");
                payload.webmLoopPath = webmKey;
              }

              if (multiFormat.webpLoop && fs.existsSync(multiFormat.webpLoop.path)) {
                const webpKey = withTenant(companyId, `studio-renders/${storyId}/ecommerce/${Date.now()}-email.webp`);
                await storage.upload(webpKey, fs.readFileSync(multiFormat.webpLoop.path), "image/webp");
                payload.webpLoopPath = webpKey;
              }

              payload.multiFormat = multiFormat;
              log.info(`     ✅ Multi-format deliverables uploaded (WebM <2.5MB & WebP <1.8MB)`);
            } catch (multiFormatErr) {
              console.warn(`     ⚠️ Multi-format export notice:`, multiFormatErr);
            }
          }
        } else {
          console.error(`     ❌ QA Gatekeeper Rejected Content:`, qaReport.errors);
          payload.qaStatus = "QA_FAILED";
        }
      }
    } catch (renderErr: unknown) {
      const errMsg = renderErr instanceof Error ? renderErr.message : String(renderErr);
      console.error(`     ⚠️ Remotion render notice: ${errMsg}. Fallback to turn clip.`);
    } finally {
      await cleanupTenantSandbox(sandboxDir);
    }
  }

  // Step 5: Finalize Job and update Video record status
  log.info(`  🎞️  Finalizing studio job ${jobId}...`);
  const finalOutput = payload.finalRenderVideoPath || payload.stitchedAudioPath || payload.turns?.[0]?.videoPath || null;
  if (storyId) {
    const video = await prisma.video.findFirst({ where: { storyId } });
    if (video) {
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: payload.qaStatus === "QA_FAILED" ? "QA_FAILED" : "DONE",
          outputPath: finalOutput,
        },
      });
    }
  }

  await reportProgress(jobId, {
    step: "studio_complete",
    status: "DONE",
    doneSteps: (job.totalSteps as number) || 10,
    result: { studioPayload: payload },
  });

  log.info(`  ✅ Studio pipeline [${studioType.toUpperCase()}] finished successfully!`);
}
