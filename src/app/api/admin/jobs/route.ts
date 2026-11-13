import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { NextRequest,NextResponse } from "next/server";

/**
 * POST /api/admin/jobs
 * Replay a failed/dead job — re-enqueue its original event via Inngest.
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await prisma.generationJob.findFirst({ where: { id: jobId, companyId: orgId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset job status to QUEUED for standalone worker pickup
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "QUEUED",
        attempts: 0,
        startedAt: null,
        completedAt: null,
        errorLog: null,
      },
    });

    return NextResponse.json({ success: true, message: `Job ${jobId} has been reset to QUEUED` });
  } catch (e) {
    console.error("[Jobs API] POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/jobs
 * Dismiss/delete a dead/failed generation job record.
 */
export async function DELETE(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId query parameter is required" }, { status: 400 });
    }

    const existing = await prisma.generationJob.findFirst({ where: { id: jobId, companyId: orgId } });
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await prisma.generationJob.delete({ where: { id: jobId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Jobs API] DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
