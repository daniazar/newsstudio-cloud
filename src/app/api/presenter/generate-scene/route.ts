/**
 * app/api/presenter/generate-scene/route.ts
 *
 * POST /api/presenter/generate-scene
 *
 * Triggers InfiniteTalk lip-sync video generation for a single segment
 * via the locally running ComfyUI instance.
 *
 * Body: { segmentId, storyId, model?: "1.3b" | "14b" | "sadtalker" }
 *
 * Returns a streaming NDJSON response so the client receives progress
 * events while ComfyUI is processing (which can take 20-90+ minutes).
 */

import { checkComfyUIHealth,generatePresenterVideo } from "@/lib/ai/comfyClient";
import type { ComfyWorkflow, ComfyWorkflowInputs } from "@/lib/ai/comfy/types";
import { finishJobProgress,startJobProgress,updateJobProgress } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { storage,withTenant } from "@/lib/storage";
import { requireTenant } from "@/lib/tenant";
import { getPersonaBroadcastPrompt,getPersonaById,getPersonaNeutralHeadshotPrompt,getPersonaNudeBase } from "@/lib/tts/personas";
import { getAlgorithmicActionLoop } from "@/lib/types/stateMachine";
import { generateLlmText } from "@/lib/llm/aiSdkGateway";
import fs from "fs";
import { NextRequest,NextResponse } from "next/server";
import os from "os";
import path from "path";
import { promisify } from "util";
import { z } from "zod";
import { broadcastWorkerWake } from "@/lib/worker-broker/supabaseWake";

function isRemoteWorkerMode(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.FORCE_REMOTE_WORKER === "true" ||
    (process.env.NODE_ENV !== "test" && process.env.ALLOW_API_SPAWN !== "true")
  );
}

// Download an audio/video asset by its key or URL, returning Buffer via storage abstraction
async function downloadAsset(assetPathOrUrl: string): Promise<Buffer> {
  if (assetPathOrUrl.startsWith("http://") || assetPathOrUrl.startsWith("https://")) {
    const res = await fetch(assetPathOrUrl);
    if (!res.ok) throw new Error(`Failed to fetch asset from URL ${assetPathOrUrl}: HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
  if (path.isAbsolute(assetPathOrUrl) && fs.existsSync(assetPathOrUrl)) {
    return fs.promises.readFile(assetPathOrUrl);
  }
  const localRel = path.join(process.cwd(), assetPathOrUrl);
  if (fs.existsSync(localRel)) {
    return fs.promises.readFile(localRel);
  }
  const cleanKey = assetPathOrUrl.replace(/^news-studio\//, "").replace(/^\//, "");
  return await storage.download(cleanKey);
}

import { getFFmpegPath,getFFprobePath } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:presenter:generate-scene");

const execFileAsync = async (file: string, args: string[]) => {
  const { execFile } = await import("child_process");
  return promisify(execFile)(file, args);
};

export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await prisma.generationJob.findFirst({
    where: { id: jobId, companyId: orgId },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let parsedConfig: Record<string, unknown> = {};
  try {
    parsedConfig = job.config ? (JSON.parse(job.config) as Record<string, unknown>) : {};
  } catch {}

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    status: job.status,
    currentStep: job.currentStep,
    doneSteps: job.doneSteps,
    totalSteps: job.totalSteps,
    error: job.errorLog || undefined,
    result: parsedConfig.result ?? null,
  });
}

function resolveCachedAvatarId(candidates: (string | undefined | null)[]): string | null {
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

// Load the InfiniteTalk ComfyUI workflow JSON for the chosen model
function loadWorkflow(model: string): ComfyWorkflow {
  const workflowDir = path.join(process.cwd(), "comfy_workflows", "video");

  const WORKFLOW_MAP: Record<string, string> = {
    "14b":              "infinitetalk_14b_i2v.json",
    "1.3b":             "infinitetalk_1.3b_i2v.json",
    "ltx":              "ltx_video_unified.json",
    "eros":             "ltx_video_unified.json",
    "sulphur":          "ltx_video_unified.json",
    "ltx_audio":        "ltx_video_unified.json",
    "ltx_flfv_tts":     "ltx_video_unified.json",
    "ltx_flfv_generated":"ltx_video_unified.json",
    "ltx_multi_persona":"ltx_video_unified.json",
    "ltx_sfx":          "ltx_video_unified.json",
    "ltx_music_video":  "ltx_video_unified.json",
    "echomimic":        "echomimic_v3_flash_api.json",
    "hunyuan":          "hunyuanvideo_1.5_i2v.json",
    "minimax":          "minimax_h3_taomate_api_prompt.json",
    "taomate":          "minimax_h3_taomate_api_prompt.json",
    "wan":              "wan_video_alpha_unified.json",
  };

  const filename = WORKFLOW_MAP[model] ?? "infinitetalk_1.3b_i2v.json";
  const fullPath = path.join(workflowDir, filename);

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Workflow file not found: ${fullPath}\n` +
      `Ensure the workflow JSON is placed in the comfy_workflows/video/ directory.`
    );
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const PayloadSchema = z.object({
    segmentId: z.string(),
    storyId: z.string(),
    model: z.enum([
      "1.3b",
      "14b",
      "sadtalker",
      "echomimic",
      "ltx",
      "ltx_audio",
      "ltx_flfv_tts",
      "ltx_flfv_generated",
      "ltx_multi_persona",
      "ltx_sfx",
      "ltx_music_video",
      "eros",
      "sulphur",
      "musetalk",   // MuseTalk 40 FPS realtime lip-sync (port 8010)
      "ditto",      // Ditto Motion-Space diffusion (port 8010/8012)
      "liveportrait_musetalk", // Inverted MuseTalk -> LivePortrait hybrid digital human
      "keysync",    // KeySync 2-stage cached lip-sync (port 8008)
      "hunyuan",    // HunyuanVideo 1.5
      "minimax",    // MiniMax H3
      "taomate",    // MiniMax H3 + TaoMate LoRA
      "veo",        // Google Veo 3.1 Cloud API
      "wan",        // Wan 2.1
    ]).optional().default("1.3b"),
    personaId: z.string().optional(),
    avatarUrl: z.string().optional(),
    actionLoop: z.string().optional(),
    onlyGenerateImage: z.boolean().optional().default(false)
  });

  if (isRemoteWorkerMode()) {
    const rawBody = await req.json().catch(() => null);
    const parsedData = PayloadSchema.safeParse(rawBody);
    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Invalid payload parameters", details: parsedData.error.format() },
        { status: 400 }
      );
    }

    const {
      segmentId,
      storyId,
      model,
      personaId: providedPersonaId,
      avatarUrl: providedAvatarUrl,
      actionLoop: providedActionLoop,
      onlyGenerateImage,
    } = parsedData.data;

    const segment = await prisma.segment.findFirst({
      where: { id: segmentId, script: { story: { companyId: orgId } } },
      select: { id: true },
    });
    if (!segment) {
      return NextResponse.json({ error: `Segment ${segmentId} not found` }, { status: 404 });
    }

    await prisma.segment.update({
      where: { id: segmentId },
      data: { presenterStatus: "queued" },
    });

    const job = await prisma.generationJob.create({
      data: {
        companyId: orgId,
        storyId,
        type: onlyGenerateImage ? "image" : "video_full",
        status: "QUEUED",
        totalSteps: 2,
        doneSteps: 0,
        currentStep: "Queued for local worker",
        config: JSON.stringify({
          segmentId,
          storyId,
          model,
          personaId: providedPersonaId,
          avatarUrl: providedAvatarUrl,
          actionLoop: providedActionLoop,
          onlyGenerateImage,
        }),
      },
    });
    void broadcastWorkerWake("job_queued");

    return NextResponse.json({
      ok: true,
      queued: true,
      jobId: job.id,
      status: "QUEUED",
      segmentId,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      let tmpDir: string | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let targetSegmentId: string | null = null;
      let targetNotifId: string | null = null;
      let targetSegmentIndex: number | null = null;

      try {
        // Start heartbeat to keep connection alive
        heartbeatInterval = setInterval(() => {
          send({ status: "heartbeat", timestamp: Date.now() });
        }, 15000);

        const body = await req.json();

        const parsedData = PayloadSchema.safeParse(body);
        if (!parsedData.success) {
          send({ error: "Invalid payload parameters", details: parsedData.error.format() });
          controller.close();
          return;
        }

        let { segmentId, storyId, model, personaId: providedPersonaId, avatarUrl: providedAvatarUrl, actionLoop: providedActionLoop, onlyGenerateImage } = parsedData.data;
        targetSegmentId = segmentId;

        // ── 1. Check health ─────────────────────────────────────
        if (model === "sadtalker") {
          const sadTalkerUrl = process.env.SADTALKER_SERVER_URL || "http://localhost:8000";

          send({ status: "checking", message: "Connecting to TalkingHead / SadTalker server..." });
          try {
            const stRes = await fetch(`${sadTalkerUrl}/docs`, { method: "HEAD" }).catch(() => null);
            if (!stRes || !stRes.ok) {
              // SadTalker offline; fall back to Modern-TalkingHead on port 8010
              const musetalkUrl = process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL || "http://localhost:8010";
              const thRes = await fetch(`${musetalkUrl}/health`, { signal: AbortSignal.timeout(1500) }).catch(() => null);
              if (thRes && thRes.ok) {
                log.info("[Presenter] SadTalker port 8000 offline, smoothly routing to Modern-TalkingHead (port 8010)...");
                model = "musetalk";
              } else {
                throw new Error("unreachable");
              }
            }
          } catch {
            await prisma.segment.update({
              where: { id: segmentId },
              data: { presenterStatus: "error" },
            });
            send({ error: `TalkingHead server is not reachable. Start it with: docker start modern-talkinghead-server` });
            controller.close();
            return;
          }
        } else if (model === "musetalk" || model === "ditto") {
          const musetalkUrl = process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL || "http://localhost:8010";
          send({ status: "checking", message: `Connecting to TalkingHead / ${model === "ditto" ? "Ditto" : "MuseTalk"} realtime server...` });
          try {
            const res = await fetch(`${musetalkUrl}/health`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
            if (!res || !res.ok) {
              // Try fallback 8007
              const fallback = await fetch("http://localhost:8007/health", { signal: AbortSignal.timeout(1500) }).catch(() => null);
              if (!fallback || !fallback.ok) throw new Error("unreachable");
            }
          } catch {
            await prisma.segment.update({ where: { id: segmentId }, data: { presenterStatus: "error" } });
            send({ error: `TalkingHead / ${model === "ditto" ? "Ditto" : "MuseTalk"} server is not reachable at ${musetalkUrl}. Start it with: docker start modern-talkinghead-server` });
            controller.close();
            return;
          }
        } else if (model === "keysync") {
          const keysyncUrl = process.env.KEYSYNC_SERVER_URL || "http://localhost:8008";
          send({ status: "checking", message: "Connecting to KeySync cached lip-sync server..." });
          try {
            const res = await fetch(`${keysyncUrl}/health`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
            if (!res || !res.ok) throw new Error("unreachable");
          } catch {
            await prisma.segment.update({ where: { id: segmentId }, data: { presenterStatus: "error" } });
            send({ error: `KeySync server is not reachable at ${keysyncUrl}. Start it with: docker run -p 8008:8008 keysync-server` });
            controller.close();
            return;
          }
        } else if (model === "veo") {
          send({ status: "checking", message: "Verifying Google Veo 3.1 API configuration..." });
          const { isVeoConfigured } = await import("@/lib/ai/veoClient");
          if (!isVeoConfigured()) {
            await prisma.segment.update({ where: { id: segmentId }, data: { presenterStatus: "error" } });
            send({ error: "Google Veo 3.1 API is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in your environment." });
            controller.close();
            return;
          }
        } else {
          send({ status: "checking", message: "Connecting to ComfyUI..." });
          const healthy = await checkComfyUIHealth();
          if (!healthy) {
            await prisma.segment.update({
              where: { id: segmentId },
              data: { presenterStatus: "error" },
            });
            const comfyUrl = process.env.COMFYUI_URL || "http://localhost:8188";
            send({ error: `ComfyUI server is not reachable at ${comfyUrl}. Please start it first.` });
            controller.close();
            return;
          }
        }

        // ── 2. Load segment + persona ────────────────────────────
        send({ status: "loading", message: "Loading segment data..." });
        const segment = await prisma.segment.findFirst({
          where: { id: segmentId, script: { story: { companyId: orgId } } },
          include: { script: { include: { story: { include: { video: true } } } } },
        });

        if (!segment) {
          send({ error: "Segment not found" });
          controller.close();
          return;
        }

        if (!segment.audioPath) {
          send({ error: "No audio generated for this scene. Generate audio first in Voice Studio." });
          controller.close();
          return;
        }

        const personaId = (providedPersonaId || segment.personaId || segment.script.story.video?.personaId || "ruby").toLowerCase();
        if (providedPersonaId && providedPersonaId !== segment.personaId) {
          await prisma.segment.update({
            where: { id: segmentId },
            data: { personaId: providedPersonaId },
          });
        }
        const persona = getPersonaById(personaId);

        let negativePrompt: string | undefined = undefined;
        if (segment.presetChoice && persona) {
          try {
            const { compilePresenterPrompt } = await import("@/lib/prompt/promptCompiler");
            const { presetRegistry } = await import("@/lib/prompt/presetRegistry");
            const presetObj = presetRegistry.get(segment.presetChoice) || presetRegistry.getAll()[0].preset;
            const compiled = compilePresenterPrompt({
              personaDescription: getPersonaBroadcastPrompt(persona),
              visualBodyPrompt: getPersonaNudeBase(persona),
              preset: presetObj
            });
            negativePrompt = compiled.negativePrompt;
          } catch (e) {
            console.error("[Presenter] Failed to compile negative prompt:", e);
          }
        }
        // 2a. Compile visual prompt if missing
        if (segment.presetChoice && !segment.personaImagePrompt && persona) {
          send({ status: "compiling_prompt", message: `Compiling visual prompt for preset "${segment.presetChoice}"...` });
          
          const { compilePresenterPrompt } = await import("@/lib/prompt/promptCompiler");
          const { presetRegistry } = await import("@/lib/prompt/presetRegistry");
          
          const preset = presetRegistry.get(segment.presetChoice) || presetRegistry.getAll()[0].preset;
          const isFirstSegment = segment.index === 0;

          const compiled = compilePresenterPrompt({
            personaDescription: isFirstSegment ? getPersonaBroadcastPrompt(persona) : getPersonaNeutralHeadshotPrompt(persona),
            visualBodyPrompt: getPersonaNudeBase(persona),
            preset,
            randomizeVariation: isFirstSegment // Only randomize attire/lighting/angles/shots on segment 0 (the full scene)
          });

          segment.personaImagePrompt = compiled.positivePrompt;
          
          // Update DB
          await prisma.segment.update({
            where: { id: segmentId },
            data: { personaImagePrompt: segment.personaImagePrompt }
          });
        }

        // 2b. Check if we need to dynamically generate a custom preset avatar
        let finalAvatarUrl = onlyGenerateImage ? null : (providedAvatarUrl || segment.personaAvatarUrl);

        if (!finalAvatarUrl && segment.presetChoice && segment.personaImagePrompt && persona) {
          send({ status: "checking_preset", message: `Checking preset "${segment.presetChoice}" for anchor avatar...` });
          
          // Query existing generated avatars in the database for this preset and persona
          const existingAvatars = await prisma.personaAvatar.findMany({
            where: {
              personaId: personaId,
              presetName: segment.presetChoice,
            },
          });

          const reuseProbability = Number(process.env.REUSE_PROBABILITY || "0.70");
          const shouldReuse = existingAvatars.length > 0 && Math.random() < reuseProbability && !onlyGenerateImage;

          if (shouldReuse) {
            // 70% chance: Select one of the existing generated avatars randomly
            const randomIndex = Math.floor(Math.random() * existingAvatars.length);
            const selectedAvatar = existingAvatars[randomIndex];
            finalAvatarUrl = selectedAvatar.url;
            
            await prisma.segment.update({
              where: { id: segmentId },
              data: {
                generatedAvatarKey: selectedAvatar.storageKey,
                personaAvatarUrl: finalAvatarUrl,
              },
            });
            send({ status: "reusing_avatar", message: `Reusing existing avatar variation for preset "${segment.presetChoice}"...` });
          } else {
            // 30% chance or no existing avatars: Generate a fresh visual variation
            let mutatedPrompt = segment.personaImagePrompt;
            if (existingAvatars.length > 0) {
              send({ status: "mutating_prompt", message: `Prompting LLM to generate style variation for preset "${segment.presetChoice}"...` });
              try {
                const { text } = await generateLlmText({
                  prompt: `Modify this visual style prompt for an AI image generator to change clothing colors, fabric textures, subtle background details, hair styling variations, or small accessories (like glasses or jewelry) while maintaining the visual identity of the character. IMPORTANT: For hair styling variations, do NOT change the hair length (e.g. keep short bobs short, and long hair long) so the character's core identity remains intact. Instead, vary only the hair styling or arrangement (e.g. straight, curly, wavy, adding braids, ponytail, buns, half-up, or side-swept) while strictly maintaining the original length. Respond ONLY with the modified prompt. No conversational filler or formatting:
                    
                    "${segment.personaImagePrompt}"`,
                  companyId: orgId,
                  storyId: segment.script?.story?.id,
                  tier: "structured",
                  temperature: 0.7,
                });
                if (text?.trim()) {
                  mutatedPrompt = text.trim();
                }
              } catch (err) {
                console.error("[Presenter] Failed to mutate prompt via LLM gateway, using original prompt:", err);
              }
            }

            send({ status: "generating_preset_avatar", message: `Generating custom base avatar via ComfyUI for preset "${segment.presetChoice}" (this takes ~9 seconds)...` });
            
            const partnerPersonaId = segment.partnerPersonaId;
            const partnerPersona = partnerPersonaId ? getPersonaById(partnerPersonaId) : null;

            const defaultAvatarAbsPath = path.join(
              process.cwd(),
              "public",
              (persona.avatarUrl || "/avatars/ruby.png").replace(/^\//, "")
            );

            const partnerAvatarAbsPath = partnerPersona
              ? path.join(process.cwd(), "public", (partnerPersona.avatarUrl || "/avatars/blaze.png").replace(/^\//, ""))
              : null;

            const { generatePresenterImage } = await import("@/lib/ai/comfyClient");
            
            const faceRefs: string | string[] = partnerAvatarAbsPath
              ? [defaultAvatarAbsPath, partnerAvatarAbsPath]
              : defaultAvatarAbsPath;

            const generatedBuffer = await generatePresenterImage(mutatedPrompt, faceRefs, undefined, undefined, 1024, 576, 0.85, undefined, undefined, negativePrompt);

            // Upload the generated avatar image to storage
            const keyPrefix = `avatars/${personaId}/${segment.presetChoice}-${Date.now()}.png`;
            const objectKey = withTenant(orgId, keyPrefix);
            finalAvatarUrl = await storage.upload(objectKey, generatedBuffer, "image/png");

            // Save to database
            await prisma.personaAvatar.create({
              data: {
                companyId: orgId,
                personaId: personaId,
                label: `${persona.name} - ${segment.presetChoice} Variation`,
                url: finalAvatarUrl || "",
                storageKey: objectKey,
                frameType: "portrait",
                isDefault: false,
                presetName: segment.presetChoice,
                promptUsed: mutatedPrompt,
              },
            });

            await prisma.segment.update({
              where: { id: segmentId },
              data: {
                generatedAvatarKey: objectKey,
                personaAvatarUrl: finalAvatarUrl,
              },
            });
            
            if (onlyGenerateImage) {
              send({ status: "done", presenterVideoPath: null, personaAvatarUrl: finalAvatarUrl });
              controller.close();
              return;
            }
          }
        } else if (!finalAvatarUrl) {
          // Fallback to default persona avatar if preset is not defined
          finalAvatarUrl = persona?.avatarUrl || null;
        }

        const avatarUrl = finalAvatarUrl;

        if (!avatarUrl) {
          send({ error: `No avatar image found for persona "${personaId}" and none provided.` });
          controller.close();
          return;
        }

        // ── 3. Mark as generating ────────────────────────────────
        await prisma.segment.update({
          where: { id: segmentId },
          data: { presenterStatus: "generating" },
        });
        
        // Start Global Notification
        const notifTitle = model === "sadtalker" ? `Animating Presenter (SadTalker)` : `Animating Presenter (${model})`;
        const notifId = await startJobProgress(
          notifTitle, 
          `Scene ${segment.index + 1}`,
          100,
          orgId
        );
        targetNotifId = notifId;
        targetSegmentIndex = segment.index;

        send({ status: "generating_start", segmentId, personaId, model });

        // ── 4. Download audio from MinIO to temp file ────────────
        if (notifId) await updateJobProgress(notifId, 5, `Downloading assets for Scene ${segment.index + 1}...`);
        send({ status: "downloading_audio", message: "Downloading TTS audio from storage..." });
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "presenter-"));
        const rawAudioExt = path.extname(segment.audioPath) || ".webm";
        const rawAudioPath = path.join(tmpDir, `scene-${segment.index}-raw${rawAudioExt}`);
        const audioTmpPath = path.join(tmpDir, `scene-${segment.index}.wav`);
        const audioBuffer = await downloadAsset(segment.audioPath);
        fs.writeFileSync(rawAudioPath, audioBuffer);

        // Transcode to clean 16kHz 16-bit mono PCM WAV for AI lip-sync models (MuseTalk, InfiniteTalk, SadTalker, LivePortrait)
        const ffmpegBin = getFFmpegPath();
        try {
          await execFileAsync(ffmpegBin, ["-y", "-i", rawAudioPath, "-vn", "-c:a", "pcm_s16le", "-ar", "16000", "-ac", "1", audioTmpPath]);
        } catch (transcodeErr) {
          console.warn("[Presenter] Direct FFmpeg audio transcode failed, falling back to copy:", transcodeErr);
          if (!fs.existsSync(audioTmpPath)) {
            fs.copyFileSync(rawAudioPath, audioTmpPath);
          }
        }

        // ── 5. Resolve avatar image path ─────────────────────────
        let avatarAbsPath: string;
        
        if (avatarUrl?.startsWith("data:")) {
          // Handle base64 avatar (custom personas)
          const parts = avatarUrl.split(",");
          if (parts.length < 2) {
            throw new Error("Invalid base64 avatar URL");
          }
          const base64Data = parts[1];
          const buffer = Buffer.from(base64Data, "base64");
          const mimeType = avatarUrl.split(";")[0].split(":")[1] || "image/png";
          const extension = mimeType.split("/")[1] || "png";
          const tempAvatarPath = path.join(tmpDir, `avatar-${personaId}.${extension}`);
          fs.writeFileSync(tempAvatarPath, buffer);
          avatarAbsPath = tempAvatarPath;
        } else {
          // Handle regular path
          avatarAbsPath = path.join(
            process.cwd(),
            "public",
            avatarUrl!.replace(/^\//, "")
          );
        }

        if (!fs.existsSync(avatarAbsPath)) {
          send({ error: `Avatar image not found: ${avatarAbsPath}` });
          controller.close();
          return;
        }

        // ── 6. Generate Video ────────────────────────────────────
        let videoBuffer: Buffer = Buffer.alloc(0);

        if (model === "sadtalker") {
          send({ status: "generating", message: "SadTalker is generating the lip-sync video — estimated time: 1–3 minutes" });
          

          
          // Use fetch to stream from our SadTalker FastAPI server
          const formData = new FormData();
          const avatarBlob = new Blob([fs.readFileSync(avatarAbsPath)]);
          const audioBlob = new Blob([fs.readFileSync(audioTmpPath)]);
          formData.append("image", avatarBlob, path.basename(avatarAbsPath));
          formData.append("audio", audioBlob, path.basename(audioTmpPath));

          const sadTalkerUrl = process.env.SADTALKER_SERVER_URL || "http://localhost:8000";
          const sadTalkerRes = await fetch(`${sadTalkerUrl}/generate`, {
            method: "POST",
            body: formData,
          });

          if (!sadTalkerRes.ok) {
            const error = await sadTalkerRes.text();
            throw new Error(`SadTalker API failed: ${sadTalkerRes.status} ${error}`);
          }

          const reader = sadTalkerRes.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          if (!reader) throw new Error("Failed to get reader from SadTalker stream");

          let lastProgress = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const event = JSON.parse(line);
                
                // Forward the event to the frontend
                send(event);

                // Update terminal progress bar
                if (event.progress !== undefined && event.progress !== lastProgress) {
                    lastProgress = event.progress;
                    const barLength = 20;
                    const filled = Math.round((lastProgress / 100) * barLength);
                    const empty = barLength - filled;
                    const bar = "█".repeat(filled) + "░".repeat(empty);
                    process.stdout.write(`\r[Presenter] Scene ${segment.index + 1}: [${bar}] ${lastProgress}% ${event.current_frame || 0}/${event.total_frames || 0} `);
                    
                    // Update global UI notification
                    if (notifId) await updateJobProgress(notifId, lastProgress, `Scene ${segment.index + 1} • Frame ${event.current_frame || 0}/${event.total_frames || 0}`);
                }

                if (event.status === "done" && event.presenterVideoPath) {
                  process.stdout.write("\n");
                  
                  // Fetch the final video from the server to get the buffer
                  // The server returns a URL like /outputs/job_id/results/file.mp4
                  // We need to fetch it from http://localhost:8080/outputs/...
                  const videoUrl = `${sadTalkerUrl}${event.presenterVideoPath}`;
                  const videoRes = await fetch(videoUrl);
                  if (videoRes.ok) {
                    videoBuffer = Buffer.from(await videoRes.arrayBuffer());
                  } else {
                    throw new Error("Failed to download generated video from SadTalker server");
                  }
                }
                
                if (event.status === "error") {
                  throw new Error(event.message || "SadTalker error");
                }
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg && msg !== "Unexpected end of JSON input") {
                  throw e;
                }
              }
            }
          }
        } else if (model === "musetalk") {
          // ── MuseTalk 40 FPS Realtime Lip-Sync ───────────────────
          send({ status: "generating", message: "MuseTalk is generating 40 FPS realtime lip-sync — estimated time: 5–20 seconds" });
          if (notifId) await updateJobProgress(notifId, 10, `MuseTalk realtime: Scene ${segment.index + 1}...`);

          let museTalkVideoInput = avatarAbsPath;
          const totalSegs = await prisma.segment.count({ where: { scriptId: segment.scriptId } }).catch(() => 5);
          const algo = getAlgorithmicActionLoop(segment?.index ?? 0, totalSegs || 1, segment?.text);
          let actionLoopName = algo?.loopName || "ruby_idle";
          let sceneStrategy = "transparent_anchor";

          try {
            if (segment.mediaSettings) {
              const ms = JSON.parse(segment.mediaSettings);
              if (ms.sceneStrategy) sceneStrategy = ms.sceneStrategy;
              if (ms.actionLoop) actionLoopName = ms.actionLoop;
            }
          } catch {}
          if (providedActionLoop) actionLoopName = providedActionLoop;

          let avatarId = `${personaId}_${sceneStrategy === "bubble" ? "bubble" : "avatar"}`;

          // Only use Ruby's master standing video loops if persona is Ruby and strategy is NOT bubble
          if (personaId === "ruby" && sceneStrategy !== "bubble") {
            const normalizedLoopName = actionLoopName.replace(/^state_/, "").replace(/^ruby_/, "").replace(/^ruby_burgundy_/, "");
            const candidateActionLoops = [
              path.join(process.cwd(), "public", "assets", "action_loops", "veo", "ruby_burgundy", `ruby_burgundy_${normalizedLoopName}.mp4`),
              path.join(process.cwd(), "public", "assets", "action_loops", "veo", "ruby_burgundy", `${actionLoopName}.mp4`),
              path.join(process.cwd(), "public", "assets", "action_loops", "veo", "ruby_burgundy", `${normalizedLoopName}.mp4`),
              path.join(process.cwd(), "public", "assets", "action_loops", "veo", "ruby_burgundy", "ruby_burgundy_M1_loop_v1.mp4"),
              path.join(process.cwd(), "public", "assets", "action_loops", "ruby_master_suite", `ruby_${normalizedLoopName}.mp4`),
              path.join(process.cwd(), "public", "assets", "action_loops", "ruby_master_suite", `${actionLoopName}.mp4`),
              path.join(process.cwd(), "public", "assets", "action_loops", "ruby_master_suite", "ruby_intro_welcome.mp4"),
              path.join(process.cwd(), "public", "assets", "action_loops", "ruby_master_suite", "ruby_idle.mp4"),
              path.join(process.cwd(), "public", "assets", "action_loops", "veo", `ruby_${normalizedLoopName}.mp4`),
              path.join(process.cwd(), "public", "assets", "action_loops", "veo", "veo_ruby_p01_standing_clasped_9x16_master.mp4"),
            ];

            for (const cand of candidateActionLoops) {
              if (fs.existsSync(cand)) {
                museTalkVideoInput = cand;
                break;
              }
            }

            // Case-insensitive directory scan fallback for veo/ruby_burgundy
            if (museTalkVideoInput === avatarAbsPath) {
              const veoDir = path.join(process.cwd(), "public", "assets", "action_loops", "veo", "ruby_burgundy");
              if (fs.existsSync(veoDir)) {
                try {
                  const files = fs.readdirSync(veoDir);
                  const match = files.find((f) => {
                    const fNorm = f.toLowerCase().replace(/\.[^/.]+$/, "");
                    const fStripped = fNorm.replace(/^ruby_burgundy_/, "");
                    return fNorm === normalizedLoopName.toLowerCase() || fStripped === normalizedLoopName.toLowerCase();
                  });
                  if (match) {
                    museTalkVideoInput = path.join(veoDir, match);
                  }
                } catch {}
              }
            }

            const baseName = path.basename(museTalkVideoInput).replace(/\.[^/.]+$/, "");
            const cachedId = resolveCachedAvatarId([
              baseName,
              `ruby_burgundy_${normalizedLoopName}`,
              `ruby_${normalizedLoopName}`,
              normalizedLoopName,
              actionLoopName,
            ]);
            avatarId = cachedId || baseName;
          } else if (personaId !== "ruby" && sceneStrategy !== "bubble") {
            const normalizedLoopName = actionLoopName.replace(/^state_/, "").replace(new RegExp(`^${personaId}_`), "");
            const personaLoopDir = path.join(process.cwd(), "public", "assets", "action_loops", `${personaId}_master_suite`);
            if (fs.existsSync(personaLoopDir)) {
              const candidateActionLoops = [
                path.join(personaLoopDir, `${personaId}_${normalizedLoopName}.mp4`),
                path.join(personaLoopDir, `${actionLoopName}.mp4`),
                path.join(personaLoopDir, `${personaId}_standing_bg.mp4`),
                path.join(personaLoopDir, `${personaId}_idle.mp4`),
              ];
              for (const cand of candidateActionLoops) {
                if (fs.existsSync(cand)) {
                  museTalkVideoInput = cand;
                  break;
                }
              }
            }
            const baseName = path.basename(museTalkVideoInput).replace(/\.[^/.]+$/, "");
            const cachedId = resolveCachedAvatarId([
              baseName,
              `${personaId}_${normalizedLoopName}`,
              normalizedLoopName,
              actionLoopName,
              personaId,
            ]);
            avatarId = cachedId || baseName;
          } else {
            const cachedId = resolveCachedAvatarId([avatarId, personaId]);
            avatarId = cachedId || avatarId;
          }

          const isVid = museTalkVideoInput.endsWith(".mp4") || museTalkVideoInput.endsWith(".webm");
          const { generateMuseTalkLipSync, ensureAvatarPreprocessed } = await import("@/lib/ai/musetalkClient");

          // Precompile avatar or action loop on MuseTalk before generating with useCache: true
          await ensureAvatarPreprocessed(avatarId, museTalkVideoInput, isVid);

          const museTalkOutputPath = path.join(tmpDir!, `musetalk-scene-${segment.index}.mp4`);
          const musetalkResult = await generateMuseTalkLipSync({
            videoPath: museTalkVideoInput,
            audioPath: audioTmpPath,
            outputPath: museTalkOutputPath,
            avatarId,
            useCache: true,
            fps: 30,
            serverUrl: process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL || "http://localhost:8010",
          });

          if (!musetalkResult.success) {
            throw new Error(`MuseTalk generation failed: ${musetalkResult.error}`);
          }

          videoBuffer = fs.readFileSync(museTalkOutputPath);
          if (notifId) await updateJobProgress(notifId, 85, `MuseTalk Scene ${segment.index + 1} complete.`);
          send({ status: "musetalk_done", message: "MuseTalk generation complete — uploading..." });

        } else if (model === "ditto") {
          // ── Ditto Motion-Space Diffusion Lip-Sync ──────────────────
          send({ status: "generating", message: "Ditto is generating motion-space diffusion talking head — estimated time: 5–20 seconds" });
          if (notifId) await updateJobProgress(notifId, 10, `Ditto motion-space: Scene ${segment.index + 1}...`);

          const { generateTalkingHeadInference } = await import("@/lib/ai/talkingHeadsClient");
          const dittoRes = await generateTalkingHeadInference({
            modelId: "ditto",
            avatarSrc: avatarAbsPath,
            audioPath: audioTmpPath,
            fps: 30,
            options: {
              avatar_id: personaId,
              use_cache: true,
            },
          });

          if (dittoRes.success && dittoRes.videoUrl) {
            if (fs.existsSync(dittoRes.videoUrl)) {
              videoBuffer = fs.readFileSync(dittoRes.videoUrl);
            } else if (dittoRes.videoUrl.startsWith("http://") || dittoRes.videoUrl.startsWith("https://")) {
              const res = await fetch(dittoRes.videoUrl);
              if (res.ok) {
                videoBuffer = Buffer.from(await res.arrayBuffer());
              }
            } else if (dittoRes.videoUrl.startsWith("/api/talking-heads/media/")) {
              const filename = path.basename(dittoRes.videoUrl);
              const cachedLocal = path.join(process.cwd(), "storage", "cache", "talking_heads", filename);
              if (fs.existsSync(cachedLocal)) {
                videoBuffer = fs.readFileSync(cachedLocal);
              }
            }
          }

          if (!videoBuffer || videoBuffer.length === 0) {
            throw new Error(`Ditto generation failed: ${dittoRes.error || "No video produced"}`);
          }

          if (notifId) await updateJobProgress(notifId, 85, `Ditto Scene ${segment.index + 1} complete.`);
          send({ status: "ditto_done", message: "Ditto generation complete — uploading..." });

        } else if (model === "liveportrait_musetalk") {
          // ── Inverted MuseTalk -> LivePortrait Hybrid Engine ─────
          send({ status: "generating", message: "Inverted Hybrid Engine: MuseTalk Lip-Sync + LivePortrait 3D Rotation + Anti-Seam Compositing — estimated time: 10–25s" });
          if (notifId) await updateJobProgress(notifId, 10, `Inverted Hybrid Engine: Scene ${segment.index + 1}...`);

          const hybridOutputPath = path.join(tmpDir!, `hybrid-scene-${segment.index}.mp4`);
          const { generateInvertedAvatarScene } = await import("@/lib/ai/liveportraitClient");

          const hybridResult = await generateInvertedAvatarScene({
            audioPath: audioTmpPath,
            outputPath: hybridOutputPath,
            personaId,
            gestureState: segment.index === 0 ? "talking" : "talking",
            fps: 30,
            serverUrl: process.env.TALKINGHEAD_SERVER_URL || process.env.MUSETALK_SERVER_URL || "http://localhost:8010",
          });

          if (!hybridResult.success) {
            throw new Error(`Inverted Hybrid generation failed: ${hybridResult.error}`);
          }

          videoBuffer = fs.readFileSync(hybridOutputPath);
          if (notifId) await updateJobProgress(notifId, 85, `Hybrid Scene ${segment.index + 1} complete.`);
          send({ status: "hybrid_done", message: "Hybrid Digital Human generation complete — uploading..." });

        } else if (model === "keysync") {
          // ── KeySync Cached Lip-Sync ─────────────────────────────
          send({ status: "generating", message: "KeySync 2-stage latent diffusion lip-sync — estimated time: 10–30 seconds" });
          if (notifId) await updateJobProgress(notifId, 10, `KeySync: Scene ${segment.index + 1}...`);

          const keysyncOutputPath = path.join(tmpDir!, `keysync-scene-${segment.index}.mp4`);
          const { generateKeySyncLipSync } = await import("@/lib/ai/keysyncClient");

          const keysyncResult = await generateKeySyncLipSync({
            videoPath: avatarAbsPath,
            audioPath: audioTmpPath,
            outputPath: keysyncOutputPath,
            serverUrl: process.env.KEYSYNC_SERVER_URL || "http://localhost:8008",
          });

          if (!keysyncResult.success) {
            throw new Error(`KeySync generation failed: ${keysyncResult.error}`);
          }

          videoBuffer = fs.readFileSync(keysyncOutputPath);
          if (notifId) await updateJobProgress(notifId, 85, `KeySync Scene ${segment.index + 1} complete.`);
          send({ status: "keysync_done", message: "KeySync generation complete — uploading..." });

        } else if (model === "veo") {
          // ── Google Veo 3.1 Cloud API Generation ──────────────────
          send({ status: "generating", message: "Google Veo 3.1 is synthesizing broadcast scene via Cloud API — estimated time: 15–30s" });
          if (notifId) await updateJobProgress(notifId, 15, `Veo 3.1: Scene ${segment.index + 1}...`);

          const { generateVeoVideo } = await import("@/lib/ai/veoClient");
          const segDuration = (segment.endTime ?? 0) - (segment.startTime ?? 0);
          const veoDuration = segDuration > 5 ? 8 : 4;
          const veoPrompt = `${segment.text || "Professional broadcast news anchor in high-tech television studio"}. Natural speech articulation, steady gaze at camera, cinematic broadcast studio lighting.`;

          const veoResult = await generateVeoVideo({
            prompt: veoPrompt,
            imagePath: fs.existsSync(avatarAbsPath) ? avatarAbsPath : undefined,
            endImagePath: fs.existsSync(avatarAbsPath) ? avatarAbsPath : undefined,
            durationSeconds: veoDuration,
            aspectRatio: "16:9",
            model: "veo-3.1-fast",
          });

          if (!veoResult.videoBuffer || veoResult.videoBuffer.length === 0) {
            throw new Error("Veo API failed to return generated video buffer");
          }

          videoBuffer = veoResult.videoBuffer;
          if (notifId) await updateJobProgress(notifId, 85, `Veo 3.1 Scene ${segment.index + 1} complete.`);
          send({ status: "veo_done", message: "Veo 3.1 generation complete — uploading..." });

        } else {
          send({ status: "loading_workflow", message: `Loading ${model.toUpperCase()} workflow...` });
          
          if (notifId) await updateJobProgress(notifId, 10, `Generating Scene ${segment.index + 1} via ComfyUI...`);
          const workflow = loadWorkflow(model);

          const isLtxBased = model === "ltx" || model === "eros" || model === "sulphur";
          const isMinimax = model === "minimax" || model === "taomate";
          const estimatedTime = model === "14b" ? "30–90 minutes" : isMinimax ? "15–30 seconds" : isLtxBased ? "5–10 minutes" : "15–40 minutes";
          const engineLabel = isMinimax ? "MiniMax + TaoMate" : isLtxBased ? "LTX-Video" : "InfiniteTalk";
          send({
            status: "generating",
            message: `${engineLabel} is generating the presenter video (${model}) — estimated time: ${estimatedTime}`,
          });

          videoBuffer = await generatePresenterVideo(
            { 
              imagePath: avatarAbsPath, 
              audioPath: audioTmpPath, 
              model: model as ComfyWorkflowInputs["model"],
              positivePrompt: segment.personaImagePrompt || undefined,
              negativePrompt: negativePrompt
            },
            workflow
          );
        }

        // ── 8. Upload result to MinIO ────────────────────────────
        send({ status: "uploading", message: "Uploading generated video to storage..." });
        const objectKey = withTenant(orgId, `presenter/${storyId}/scene-${segment.index}.mp4`);
        const presenterVideoPath = await storage.upload(objectKey, videoBuffer, "video/mp4");

        // ── 8b. Probe video duration and adjust scene timing ──────
        let videoDuration: number | null = null;
        try {
          // Write buffer to temp file for ffprobe
          const probePath = path.join(tmpDir!, `probe-${segment.index}.mp4`);
          fs.writeFileSync(probePath, videoBuffer);
          const ffprobeBin = getFFprobePath();
          const { stdout } = await execFileAsync(
            ffprobeBin,
            ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", probePath]
          );
          videoDuration = parseFloat(stdout.trim());
          if (isNaN(videoDuration) || videoDuration <= 0) videoDuration = null;
        } catch (probeErr) {
          console.warn("[Presenter] ffprobe failed, skipping duration adjustment:", probeErr);
        }

        // ── 9. Persist to DB ─────────────────────────────────────
        const updateData: { presenterVideoPath: string; presenterStatus: string; endTime?: number } = { presenterVideoPath, presenterStatus: "done" };

        if (videoDuration) {
          const originalDuration = segment.endTime - segment.startTime;
          const delta = videoDuration - originalDuration;

          // Update this segment's endTime to match the video duration
          updateData.endTime = segment.startTime + videoDuration;

          send({ status: "adjusting_timeline", message: `Adjusting scene duration: ${originalDuration.toFixed(1)}s → ${videoDuration.toFixed(1)}s` });

          // Cascade: shift all subsequent segments by the delta
          if (Math.abs(delta) > 0.01) {
            await prisma.segment.updateMany({
              where: { scriptId: segment.scriptId, index: { gt: segment.index } },
              data: {
                startTime: { increment: delta },
                endTime: { increment: delta },
              },
            });
          }
        }

        await prisma.segment.update({
          where: { id: segmentId },
          data: updateData,
        });

        if (notifId) await finishJobProgress(notifId, `Scene ${segment.index + 1} generated successfully.`);
        send({ status: "done", presenterVideoPath, segmentId, videoDuration });
      } catch (err: unknown) {
        console.error("[Presenter] Generation error:", err);
        if (targetSegmentId) {
          try {
            await prisma.segment.update({
              where: { id: targetSegmentId },
              data: { presenterStatus: "failed" },
            });
          } catch (dbErr) {
            console.error("[Presenter] Failed to mark segment status as failed:", dbErr);
          }
        }
        if (targetNotifId) {
          try {
            const sceneName = targetSegmentIndex !== null ? `Scene ${targetSegmentIndex + 1}` : "Scene";
            await finishJobProgress(targetNotifId, `${sceneName} generation failed: ${err instanceof Error ? err.message : "Error"}`);
          } catch {}
        }
        send({ error: (err instanceof Error ? err.message : String(err)) || "Unknown error during generation" });
      } finally {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        // Cleanup temp files
        if (tmpDir) {
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
        }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
