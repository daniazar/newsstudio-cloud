import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkerKey } from "@/lib/workerAuth";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * POST /api/pipeline/jobs/:jobId/claim
 * Worker claims a job atomically. Worker-facing — uses WORKER_API_KEY auth.
 *
 * This is the MOST CRITICAL correctness route in the pipeline.
 * Uses updateMany with a status guard to prevent double-claiming.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const err = requireWorkerKey(request);
  if (err) return err;
  const { jobId } = await params;

  try {
    const body = await request.json();
    const { workerId } = body as { workerId: string };

    if (!workerId) {
      return Response.json(
        { error: "workerId is required" },
        { status: 400 }
      );
    }

    // Fetch the job first to determine the correct in-progress status based on type
    const existingJob = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { id: true, type: true, status: true },
    });

    if (!existingJob || existingJob.status !== "QUEUED") {
      return Response.json({ claimed: false });
    }

    let targetStatus = "TTS_IN_PROGRESS";
    if (["video", "video_full", "video_bubble", "musetalk", "ditto", "veo", "minimax", "taomate", "ltx", "ecommerce_veo", "ecommerce_lipsync"].includes(existingJob.type)) {
      targetStatus = "VIDEO_IN_PROGRESS";
    } else if (existingJob.type === "render" || existingJob.type === "ecommerce_render") {
      targetStatus = "RENDER_IN_PROGRESS";
    } else if (["image", "ecommerce_photo", "ecommerce_scene", "persona_studio_image"].includes(existingJob.type)) {
      targetStatus = "IMAGE_IN_PROGRESS";
    } else if (existingJob.type === "turntable_3d") {
      targetStatus = "TURNTABLE_IN_PROGRESS";
    }

    // Atomic claim — only one worker wins
    const result = await prisma.generationJob.updateMany({
      where: { id: jobId, status: "QUEUED" },
      data: {
        status: targetStatus,
        workerId,
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Another worker already claimed it, or it's not QUEUED
      return Response.json({ claimed: false });
    }

    // Fetch the full updated job payload for the worker
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return Response.json({ claimed: false });
    }

    // Image generation, 3D turntable, and async e-commerce/persona media jobs
    // carry their payload directly inside job.config instead of a Story/Script.
    if (
      [
        "image",
        "turntable_3d",
        "ecommerce_photo",
        "ecommerce_scene",
        "ecommerce_veo",
        "ecommerce_lipsync",
        "ecommerce_render",
        "persona_studio_image",
      ].includes(job.type)
    ) {
      return Response.json({
        claimed: true,
        job: {
          ...job,
          config: job.config ? JSON.parse(job.config) : null,
        },
      });
    }

    // Fetch story with script and segments
    const story = await prisma.story.findFirst({
      where: { id: job.storyId },
      include: {
        feed: { select: { name: true } },
        script: {
          include: {
            segments: {
              orderBy: { index: "asc" },
            },
          },
        },
        video: { select: { id: true, personaId: true } },
      },
    });

    // Render jobs execute via Remotion using render-data and do not require voice configs
    if (job.type === "render") {
      let parsedJobConfig: Record<string, unknown> = {};
      if (job.config) {
        try {
          parsedJobConfig = typeof job.config === "string" ? JSON.parse(job.config) : job.config;
        } catch {}
      }
      return Response.json({
        claimed: true,
        job: {
          ...job,
          config: job.config ? parsedJobConfig : null,
        },
        story: story || null,
        defaultVoices: [],
      });
    }

    // Fetch the default voices for all personas used in this story
    if (!story) {
      return Response.json({ claimed: false });
    }
    
    const personaIds = Array.from(
      new Set(
        story.script?.segments
          .map((s: { personaId?: string | null }) => s.personaId)
          .filter(Boolean) || []
      )
    ) as string[];

    // Ensure story video persona is resolved
    if (story.video?.personaId && !personaIds.includes(story.video.personaId)) {
      personaIds.push(story.video.personaId);
    }

    // Ensure job config persona/voice is resolved
    let parsedJobConfig: Record<string, unknown> = {};
    if (job.config) {
      try {
        parsedJobConfig = typeof job.config === "string" ? JSON.parse(job.config) : job.config;
      } catch {}
    }
    const jobPersona = parsedJobConfig.personaId || parsedJobConfig.voiceId || parsedJobConfig.voice;
    if (jobPersona && typeof jobPersona === "string" && !personaIds.includes(jobPersona)) {
      personaIds.push(jobPersona);
    }

    const defaultVoicesRaw = await prisma.personaVoice.findMany({
      where: {
        OR: [
          { persona: { slug: { in: personaIds } } },
          { personaId: { in: personaIds } }
        ],
        isDefault: true,
      },
      select: {
        personaId: true,
        persona: { select: { slug: true } },
        audioPath: true,
      },
    });

    const defaultVoices = defaultVoicesRaw.map(v => ({
      personaId: personaIds.includes(v.persona.slug) ? v.persona.slug : v.personaId,
      audioPath: v.audioPath,
    }));

    return Response.json({
      claimed: true,
      job: {
        ...job,
        config: job.config ? parsedJobConfig : null,
      },
      story,
      defaultVoices,
    });
  } catch (error) {
    console.error("[Pipeline Claim] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
