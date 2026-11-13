import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/pipeline/jobs/:jobId/logs
 * Return step-by-step execution logs for a job.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;
  const { jobId } = await params;

  try {
    const job = await prisma.generationJob.findFirst({
      where: { id: jobId, companyId: orgId },
      select: {
        id: true,
        logs: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            jobId: true,
            step: true,
            status: true,
            message: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    return Response.json({ logs: job.logs });
  } catch (error) {
    console.error("[Pipeline Job Logs API] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
