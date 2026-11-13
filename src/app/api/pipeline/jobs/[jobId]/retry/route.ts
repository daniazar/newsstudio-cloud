import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { broadcastWorkerWake } from "@/lib/worker-broker";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * POST /api/pipeline/jobs/:jobId/retry
 * Reset a FAILED job back to QUEUED. User-facing — scoped to tenant.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;
  const { jobId } = await params;

  try {
    const job = await prisma.generationJob.findFirst({
      where: { id: jobId, companyId: orgId },
    });

    if (!job) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (!["FAILED", "DONE", "CANCELLED"].includes(job.status)) {
      return Response.json(
        { error: `Cannot retry a job with status '${job.status}'. Only FAILED, CANCELLED, or DONE jobs can be retried.` },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "QUEUED",
          attempts: 0,
          errorLog: null,
          currentStep: null,
          doneSteps: 0,
          completedAt: null,
        },
      }),
      prisma.jobLog.create({
        data: {
          jobId,
          step: "retry",
          status: "INFO",
          message: "Job retried by user",
        },
      })
    ]);
    void broadcastWorkerWake("job_queued");

    return Response.json({ success: true, message: "Job retried" });
  } catch (error) {
    console.error("[Pipeline Job] Retry error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
