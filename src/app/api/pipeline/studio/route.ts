/**
 * app/api/pipeline/studio/route.ts
 *
 * POST /api/pipeline/studio
 *
 * Enqueues a studio GenerationJob and creates a linked Video record.
 * The pipeline worker picks this up and processes: image gen → TTS → lip-sync → Remotion render.
 *
 * Body: {
 *   storyId: string,
 *   studioType: StudioType,
 *   studioPayload: StudioPayload,        // from parse-studio response
 *   outputMode?: "video" | "audio_only",  // defaults to "video"
 *   generateImages?: boolean,             // trigger persona image gen step in worker
 *   personaIds?: string[],               // optional persona db IDs for image gen
 * }
 *
 * Returns: { jobId, videoId }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { broadcastWorkerWake } from "@/lib/worker-broker";
import type { StudioPayload } from "@/lib/studio/parsers/types";

const BodySchema = z.object({
  storyId: z.string().min(1),
  studioType: z.enum([
    "interview",
    "podcast",
    "vtuber",
    "localization",
    "data_studio",
    "narrative_matrix",
    "debate",
  ]),
  studioPayload: z.record(z.string(), z.unknown()), // validated as typed StudioPayload after parsing
  outputMode: z.enum(["video", "audio_only"]).default("video"),
  generateImages: z.boolean().default(true),
  personaIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body", details: String(err) }, { status: 400 });
  }

  // Verify story belongs to tenant
  const story = await prisma.story.findFirst({
    where: { id: body.storyId, companyId: orgId },
    select: { id: true, title: true },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Embed outputMode into the payload
  const enrichedPayload = {
    ...body.studioPayload,
    outputMode: body.outputMode,
    generateImages: body.generateImages,
    personaIds: body.personaIds || [],
  } as StudioPayload & { outputMode: string; generateImages: boolean; personaIds: string[] };

  // Calculate step count based on studio type and output mode
  const turnCount = getApproximateTurnCount(body.studioPayload);
  const stepsPerTurn = body.outputMode === "video" ? 3 : 1; // image + tts + lipsync for video, just tts for audio
  const baseSteps = body.generateImages ? turnCount * stepsPerTurn + 1 : turnCount * (stepsPerTurn - 1) + 1; // +1 for final render

  // Create or reuse Video record for this story
  let videoId: string;
  const existingVideo = await prisma.video.findFirst({
    where: { storyId: body.storyId },
    select: { id: true },
  });

  if (existingVideo) {
    videoId = existingVideo.id;
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "PENDING" },
    });
  } else {
    const newVideo = await prisma.video.create({
      data: {
        companyId: orgId,
        storyId: body.storyId,
        status: "PENDING",
        aspectRatio: "horizontal", // Studios default to widescreen
      },
    });
    videoId = newVideo.id;
  }

  // Create the GenerationJob with studio fields
  const job = await prisma.generationJob.create({
    data: {
      companyId: orgId,
      storyId: body.storyId,
      type: "full",
      status: "QUEUED",
      studioType: body.studioType,
      studioPayload: JSON.stringify(enrichedPayload),
      totalSteps: baseSteps,
      config: JSON.stringify({
        studioType: body.studioType,
        outputMode: body.outputMode,
        generateImages: body.generateImages,
        videoId,
      }),
    },
  });

  // Log the initial queued event
  await prisma.jobLog.create({
    data: {
      jobId: job.id,
      step: "queued",
      status: "INFO",
      message: `Studio job queued: ${body.studioType} | outputMode: ${body.outputMode} | turns: ~${turnCount}`,
    },
  });
  void broadcastWorkerWake("job_queued");

  return NextResponse.json({
    success: true,
    jobId: job.id,
    videoId,
    studioType: body.studioType,
    outputMode: body.outputMode,
    estimatedSteps: baseSteps,
    message: `Studio job queued. Monitor at /api/pipeline/jobs/${job.id}`,
  });
}

/**
 * Estimates the number of turns/lines/segments in a studio payload for step counting.
 */
function getApproximateTurnCount(payload: Record<string, unknown>): number {
  if (Array.isArray(payload.turns)) return payload.turns.length;
  if (Array.isArray(payload.lines)) return payload.lines.length;
  if (Array.isArray(payload.perspectives)) return payload.perspectives.length;
  if (Array.isArray(payload.reactionMoments)) return payload.reactionMoments.length;
  if (Array.isArray(payload.tracks)) return payload.tracks.length;
  if (payload.summary) return 1; // data_studio single segment
  return 4; // fallback estimate
}
