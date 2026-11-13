import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { reserveQuota, QuotaExceededError } from "@/lib/quota/quotaEngine";
import { broadcastWorkerWake } from "@/lib/worker-broker";

/**
 * POST /api/pipeline/start
 * Queue a new generation job for a story. User-facing — requires Clerk auth.
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { storyId, config, voice, voiceId, personaId, engine, tier, speed, pitchShift } = body as {
      storyId: string;
      config?: Record<string, unknown>;
      voice?: string;
      voiceId?: string;
      personaId?: string;
      engine?: string;
      tier?: string;
      speed?: number;
      pitchShift?: number;
    };

    if (!storyId) {
      return Response.json(
        { error: "storyId is required" },
        { status: 400 }
      );
    }

    // Validate story belongs to this tenant
    const story = await prisma.story.findFirst({
      where: { id: storyId, companyId: orgId },
      include: {
        script: {
          include: { segments: true },
        },
        video: {
          select: { personaId: true },
        },
      },
    });

    if (!story) {
      return Response.json({ error: "Story not found" }, { status: 404 });
    }

    if (!story.script) {
      return Response.json(
        { error: "Story has no script. Generate a script first." },
        { status: 400 }
      );
    }

    // --- System Persona Trial Limit Check ---
    const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || "org_default_tenant";
    if (orgId !== DEFAULT_ORG_ID) {
      const personaIds = new Set(story.script.segments.map((s) => s.personaId).filter(Boolean) as string[]);
      
      const systemPersonasInStory = await prisma.persona.count({
        where: {
          slug: { in: Array.from(personaIds) },
          isSystemPersona: true,
        },
      });

      if (systemPersonasInStory > 0) {
        const systemPersonas = await prisma.persona.findMany({
          where: { isSystemPersona: true },
          select: { slug: true },
        });
        const systemPersonaSlugs = systemPersonas.map((p) => p.slug);

        const jobs = await prisma.generationJob.findMany({
          where: { companyId: orgId },
          select: { storyId: true },
          distinct: ["storyId"],
        });
        const pastStoryIds = jobs.map((j) => j.storyId);

        const storiesUsingSystem = await prisma.story.count({
          where: {
            id: { in: pastStoryIds },
            script: {
              segments: {
                some: {
                  personaId: { in: systemPersonaSlugs },
                },
              },
            },
          },
        });

        const isNewStory = !pastStoryIds.includes(storyId);
        const limitCount = isNewStory ? storiesUsingSystem + 1 : storiesUsingSystem;

        if (limitCount > 3) {
          return Response.json(
            { error: "Trial limit reached: You can only use system personas for up to 3 stories. Please create your own custom personas in the Personas tab to continue." },
            { status: 403 }
          );
        }
      }
    }
    // ----------------------------------------

    // Check for existing active job
    const existingJob = await prisma.generationJob.findFirst({
      where: {
        storyId,
        companyId: orgId,
        status: { in: ["QUEUED", "TTS_IN_PROGRESS", "VIDEO_IN_PROGRESS", "RENDER_IN_PROGRESS"] },
      },
    });

    if (existingJob) {
      return Response.json(
        { error: "A generation job is already active for this story", jobId: existingJob.id },
        { status: 409 }
      );
    }

    const segmentCount = story.script.segments.length;
    // Total steps for audio job is just the number of segments
    const totalSteps = segmentCount;

    // --- Pre-Flight Tenant Quota Reservation ---
    let quotaReservationId: string | undefined = undefined;
    if (orgId !== DEFAULT_ORG_ID) {
      try {
        const reservation = await reserveQuota(orgId, "video_credits", 1, {
          metadata: { storyId, segmentCount },
        });
        quotaReservationId = reservation.id;
      } catch (err: unknown) {
        if (err instanceof QuotaExceededError) {
          return Response.json(
            { error: err.message, quotaExceeded: true },
            { status: 402 } // Payment Required
          );
        }
        throw err;
      }
    }
    // -------------------------------------------

    const effectiveConfig: Record<string, unknown> = {
      ...(config || {}),
      ...(voice ? { voice } : {}),
      ...(voiceId ? { voiceId } : {}),
      ...(personaId ? { personaId } : {}),
      ...(engine ? { engine, ttsEngine: engine } : {}),
      ...(tier ? { tier } : {}),
      ...(speed !== undefined ? { speed } : {}),
      ...(pitchShift !== undefined ? { pitchShift } : {}),
      ...(quotaReservationId ? { quotaReservationId } : {}),
    };

    if (!effectiveConfig.personaId && !effectiveConfig.voiceId && !effectiveConfig.voice && story.video?.personaId) {
      effectiveConfig.personaId = story.video.personaId;
      effectiveConfig.voiceId = story.video.personaId;
    }

    const job = await prisma.generationJob.create({
      data: {
        companyId: orgId,
        storyId,
        type: "audio",
        status: "QUEUED",
        totalSteps,
        config: Object.keys(effectiveConfig).length > 0 ? JSON.stringify(effectiveConfig) : null,
      },
    });
    void broadcastWorkerWake("job_queued");

    return Response.json({ jobId: job.id, status: job.status, totalSteps, config: effectiveConfig });
  } catch (error) {
    console.error("[Pipeline Start] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
