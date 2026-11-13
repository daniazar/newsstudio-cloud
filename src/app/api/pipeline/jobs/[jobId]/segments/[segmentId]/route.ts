import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkerKey } from "@/lib/workerAuth";

interface RouteParams {
  params: Promise<{ jobId: string; segmentId: string }>;
}

/**
 * POST /api/pipeline/jobs/:jobId/segments/:segmentId
 * Worker updates segment timing and audio paths.
 * Auth: WORKER_API_KEY
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const err = requireWorkerKey(request);
  if (err) return err;

  try {
    const { segmentId } = await params;
    const body = await request.json();
    const { audioPath, startTime, endTime, presenterVideoPath, personaAvatarUrl, generatedAvatarKey, personaImagePrompt } = body as {
      audioPath?: string;
      startTime?: number;
      endTime?: number;
      presenterVideoPath?: string;
      personaAvatarUrl?: string;
      generatedAvatarKey?: string;
      personaImagePrompt?: string;
    };

    // Fetch the segment first to compare times
    const originalSegment = await prisma.segment.findUnique({
      where: { id: segmentId },
    });

    if (!originalSegment) {
      return Response.json({ error: "Segment not found" }, { status: 404 });
    }

    // Construct the data payload
    const updateData: Record<string, string | number> = {};
    if (audioPath !== undefined) updateData.audioPath = audioPath;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (presenterVideoPath !== undefined) updateData.presenterVideoPath = presenterVideoPath;
    if (personaAvatarUrl !== undefined) updateData.personaAvatarUrl = personaAvatarUrl;
    if (generatedAvatarKey !== undefined) updateData.generatedAvatarKey = generatedAvatarKey;
    if (personaImagePrompt !== undefined) updateData.personaImagePrompt = personaImagePrompt;

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // If endTime is changed, calculate the delta
    let delta = 0;
    if (endTime !== undefined) {
      const originalDuration = originalSegment.endTime - originalSegment.startTime;
      const targetDuration = endTime - (startTime !== undefined ? startTime : originalSegment.startTime);
      delta = targetDuration - originalDuration;
    }

    const segment = await prisma.segment.update({
      where: { id: segmentId },
      data: updateData,
    });

    // Cascade shift subsequent segments
    if (Math.abs(delta) > 0.01) {
      // ⚡ Bolt Optimization: Replace N+1 queries with single updateMany
      // Previously used findMany + Promise.all(map(... update))
      await prisma.segment.updateMany({
        where: { scriptId: segment.scriptId, index: { gt: segment.index } },
        data: {
          startTime: { increment: delta },
          endTime: { increment: delta },
        },
      });
    }

    return Response.json({ success: true, segment });
  } catch (error) {
    console.error("[Pipeline Segment Update] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
