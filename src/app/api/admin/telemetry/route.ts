import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { gatherFullTelemetry } from "@/lib/telemetry";

export async function GET() {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  const { orgId } = t.tenant;

  try {
    const [telemetry, queuedJobs, processingJobs, failedJobs, completedToday] = await Promise.all([
      gatherFullTelemetry(),
      prisma.generationJob.count({ where: { companyId: orgId, status: "QUEUED" } }),
      prisma.generationJob.count({
        where: {
          companyId: orgId,
          status: { contains: "IN_PROGRESS" },
        },
      }),
      prisma.generationJob.count({ where: { companyId: orgId, status: "FAILED" } }),
      prisma.generationJob.count({
        where: {
          companyId: orgId,
          status: "DONE",
          completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return NextResponse.json({
      ...telemetry,
      queue: {
        queued: queuedJobs,
        processing: processingJobs,
        failed: failedJobs,
        completed24h: completedToday,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Telemetry query failed: " + message },
      { status: 500 }
    );
  }
}
