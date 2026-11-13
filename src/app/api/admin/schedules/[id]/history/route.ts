import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/schedules/[id]/history
 * Get the last 10 run records for a schedule.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { id } = await context.params;

  try {
    // Verify the parent schedule belongs to the tenant before exposing its runs.
    const schedule = await prisma.schedule.findFirst({ where: { id, companyId: orgId } });
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const runs = await prisma.scheduleRun.findMany({
      where: { scheduleId: id },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return NextResponse.json(runs);
  } catch (e) {
    console.error("[Schedules API] History error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
