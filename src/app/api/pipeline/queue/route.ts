import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireWorkerKey } from "@/lib/workerAuth";

/**
 * GET /api/pipeline/queue
 * Returns the oldest QUEUED job across ALL tenants. Worker-facing.
 *
 * Workers are shared infrastructure — they process jobs for any tenant.
 * The companyId travels with the job payload so the worker can namespace
 * storage keys correctly.
 */
export async function GET(request: Request) {
  const err = requireWorkerKey(request);
  if (err) return err;

  try {
    const url = new URL(request.url);
    const jobType = url.searchParams.get("type");

    const whereClause: Prisma.GenerationJobWhereInput = { status: "QUEUED" };
    if (jobType) {
      if (jobType.includes(",")) {
        whereClause.type = { in: jobType.split(",") };
      } else {
        whereClause.type = jobType;
      }
    }

    const job = await prisma.generationJob.findFirst({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        storyId: true,
        companyId: true,
        type: true,
        status: true,
        totalSteps: true,
        config: true,
        createdAt: true,
      },
    });

    if (!job) {
      return Response.json({ job: null });
    }

    return Response.json({ job });
  } catch (error) {
    console.error("[Pipeline Queue] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
