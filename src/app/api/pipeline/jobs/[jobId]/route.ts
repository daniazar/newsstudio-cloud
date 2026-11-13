import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/pipeline/jobs/:jobId
 * Fetch detailed job info. User-facing — scoped to tenant.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    // Fetch associated story with script and segments if storyId exists
    const story = job.storyId
      ? await prisma.story.findFirst({
          where: { id: job.storyId, companyId: orgId },
          include: {
            script: {
              include: {
                segments: {
                  orderBy: { index: "asc" },
                },
              },
            },
          },
        })
      : null;

    return Response.json({
      ...job,
      storyTitle: story?.title ?? "Unknown",
      story,
    });
  } catch (error) {
    console.error("[Pipeline Job] GET error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pipeline/jobs/:jobId
 * Cancel a QUEUED job. User-facing — scoped to tenant.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    if (job.status === "DONE" || job.status === "FAILED") {
      return Response.json(
        { error: `Cannot cancel a job with status '${job.status}'.` },
        { status: 400 }
      );
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        errorLog: "Cancelled by user",
        completedAt: new Date(),
      },
    });

    return Response.json({ success: true, message: "Job cancelled" });
  } catch (error) {
    console.error("[Pipeline Job] DELETE error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
