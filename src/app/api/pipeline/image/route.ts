import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/**
 * POST /api/pipeline/image
 * Enqueue a background image generation job. User-facing — requires Clerk auth.
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { prompt, referenceImageKey, presetName, presenterName, loras } = body as {
      prompt: string;
      referenceImageKey?: string;
      presetName?: string;
      presenterName?: string;
      loras?: { name: string; strength: number }[];
    };

    if (!prompt) {
      return Response.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    // Since storyId is a required string in the DB schema, we generate a unique placeholder key
    const dummyStoryId = `img_${Math.random().toString(36).substring(2, 15)}`;

    const job = await prisma.generationJob.create({
      data: {
        companyId: orgId,
        storyId: dummyStoryId,
        type: "image",
        status: "QUEUED",
        totalSteps: 1,
        config: JSON.stringify({
          prompt,
          referenceImageKey,
          presetName,
          presenterName,
          loras
        }),
      },
    });

    return Response.json({ jobId: job.id, status: job.status });
  } catch (error) {
    console.error("[Pipeline Image] Error enqueuing image job:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
