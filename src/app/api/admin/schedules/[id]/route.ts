import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireWorkerKey } from "@/lib/workerAuth";
import { dispatchExecuteSchedule } from "@/lib/orchestration/dispatch";
import { getNextRunEstimate } from "@/lib/types/scheduler";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/schedules/[id]
 * Get a single schedule with its runs.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { id } = await context.params;

  try {
    const schedule = await prisma.schedule.findFirst({
      where: { id, companyId: orgId },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (e) {
    console.error("[Schedules API] GET [id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/schedules/[id]
 * Update a schedule.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { id } = await context.params;

  try {
    const existing = await prisma.schedule.findFirst({ where: { id, companyId: orgId } });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      cronExpression,
      mode,
      count,
      feedIds,
      brandId,
      targetChannelIds,
      personaId,
      autoScript,
      autoPublish,
      requireApproval,
      isActive,
      selectionCriteria,
      outputMode,
    } = body;

    // Build update data only for provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (cronExpression !== undefined) {
      const cronParts = cronExpression.trim().split(/\s+/);
      if (cronParts.length !== 5) {
        return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
      }
      updateData.cronExpression = cronExpression;
      updateData.nextRunAt = getNextRunEstimate(cronExpression);
    }
    if (mode !== undefined) updateData.mode = mode;
    if (count !== undefined) updateData.count = count;
    if (feedIds !== undefined) updateData.feedIds = JSON.stringify(feedIds);
    if (brandId !== undefined) updateData.brandId = brandId;
    if (targetChannelIds !== undefined) updateData.targetChannelIds = targetChannelIds ? JSON.stringify(targetChannelIds) : null;
    if (personaId !== undefined) updateData.personaId = personaId;
    if (autoScript !== undefined) updateData.autoScript = autoScript;
    if (autoPublish !== undefined) updateData.autoPublish = autoPublish;
    if (requireApproval !== undefined) updateData.requireApproval = requireApproval;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (selectionCriteria !== undefined) updateData.selectionCriteria = selectionCriteria;
    if (outputMode !== undefined) updateData.outputMode = outputMode;

    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(schedule);
  } catch (e) {
    console.error("[Schedules API] PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/schedules/[id]
 * Delete a schedule and all its runs.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { id } = await context.params;

  try {
    const existing = await prisma.schedule.findFirst({ where: { id, companyId: orgId } });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    await prisma.schedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Schedules API] DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/schedules/[id]
 * Manual trigger ("Run Now") or worker-triggered due schedule execution.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const workerErr = requireWorkerKey(request);
  let orgId: string | null = null;
  const isWorkerCall = !workerErr;

  if (workerErr) {
    const t = await requireTenant();
    if (!t.ok) return t.response;
    orgId = t.tenant.orgId;
  }

  const { id } = await context.params;

  try {
    const schedule = isWorkerCall
      ? await prisma.schedule.findUnique({ where: { id } })
      : await prisma.schedule.findFirst({ where: { id, companyId: orgId! } });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const effectiveCompanyId = orgId ?? schedule.companyId;
    void dispatchExecuteSchedule({
      scheduleId: id,
      manual: !isWorkerCall,
      companyId: effectiveCompanyId,
    }).catch((err) => {
      console.error("[Schedules API] Async schedule execution failed:", err);
    });

    return NextResponse.json({ success: true, message: "Schedule execution triggered" });
  } catch (e) {
    console.error("[Schedules API] POST (trigger) error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
