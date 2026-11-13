import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { inngest } from "@/inngest/client";
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
 * Manual trigger — "Run Now" button.
 * Sends an Inngest event to execute this schedule immediately.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { id } = await context.params;

  try {
    const schedule = await prisma.schedule.findFirst({ where: { id, companyId: orgId } });
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Send Inngest event to execute the schedule
    try {
      await inngest.send({
        name: "news/execute-schedule",
        data: { scheduleId: id, manual: true, companyId: orgId },
      });
    } catch (inngestError) {
      console.warn("[Schedules API] Inngest send failed, executing directly:", inngestError);
      // Fallback: execute directly if Inngest is not available
      // This creates a run record so the UI shows something
      await prisma.scheduleRun.create({
        data: {
          scheduleId: id,
          status: "FAILED",
          errorLog: "Inngest is not available. Please ensure Inngest dev server is running.",
          completedAt: new Date(),
        },
      });
      await prisma.schedule.update({
        where: { id },
        data: { lastRunAt: new Date(), lastRunStatus: "FAILED" },
      });
      return NextResponse.json({ 
        success: false, 
        warning: "Inngest is not available. Schedule run was marked as failed." 
      }, { status: 202 });
    }

    return NextResponse.json({ success: true, message: "Schedule execution triggered" });
  } catch (e) {
    console.error("[Schedules API] POST (trigger) error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
