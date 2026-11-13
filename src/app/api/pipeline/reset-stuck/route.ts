import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/**
 * POST /api/pipeline/reset-stuck
 * Reset jobs assigned to offline workers to FAILED.
 */
export async function POST(_request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find workers that are offline (lastSeenAt < 5 mins ago)
    const offlineWorkers = await prisma.worker.findMany({
      where: {
        lastSeenAt: { lt: fiveMinutesAgo },
      },
    });

    const offlineWorkerIds = offlineWorkers.map((w) => w.id);

    if (offlineWorkerIds.length === 0) {
      return Response.json({ success: true, count: 0, message: "No offline workers found" });
    }

    // Find all IN_PROGRESS jobs assigned to these offline workers
    const stuckJobs = await prisma.generationJob.findMany({
      where: {
        companyId: orgId,
        workerId: { in: offlineWorkerIds },
        status: { in: ["QUEUED", "TTS_IN_PROGRESS", "VIDEO_IN_PROGRESS", "RENDER_IN_PROGRESS", "IMAGE_IN_PROGRESS", "TURNTABLE_IN_PROGRESS"] },
      },
      select: { id: true },
    });

    if (stuckJobs.length === 0) {
      return Response.json({ success: true, count: 0, message: "No stuck jobs found" });
    }

    // Atomically batch-update all stuck jobs and create corresponding logs
    const jobIds = stuckJobs.map((j) => j.id);
    const now = new Date();

    await prisma.$transaction([
      prisma.generationJob.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: "FAILED",
          errorLog: "Worker went offline during processing",
          completedAt: now,
        },
      }),
      prisma.jobLog.createMany({
        data: jobIds.map((jobId) => ({
          jobId,
          step: "worker_offline",
          status: "ERROR",
          message: "Job failed because the assigned worker went offline",
          createdAt: now,
        })),
      }),
    ]);

    const updatedCount = jobIds.length;

    return Response.json({ success: true, count: updatedCount, message: `Reset ${updatedCount} stuck jobs` });
  } catch (error) {
    console.error("[Pipeline Reset Stuck Jobs] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
