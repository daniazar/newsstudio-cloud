import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";
import { getNextRunEstimate } from "@/lib/types/scheduler";

/**
 * GET /api/admin/schedules
 * List the tenant's schedules with latest run info, enriched with feed/channel/persona names.
 */
export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { page, limit, skip, take } = parseListParams(new URL(request.url).searchParams);
    const where = { companyId: orgId };

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          runs: {
            orderBy: { startedAt: "desc" },
            take: 5,
            select: {
              id: true,
              scheduleId: true,
              status: true,
              storyCount: true,
              startedAt: true,
              completedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.schedule.count({ where }),
    ]);

    // Enrich with feed, brand, channel, persona names
    const feedIds = new Set<string>();
    const brandIds = new Set<string>();
    const channelIds = new Set<string>();
    const personaIds = new Set<string>();

    for (const s of schedules) {
      try {
        const ids = JSON.parse(s.feedIds) as string[];
        ids.forEach(id => feedIds.add(id));
      } catch { /* skip invalid JSON */ }
      
      try {
        if (s.targetChannelIds) {
          const ids = JSON.parse(s.targetChannelIds) as string[];
          ids.forEach(id => channelIds.add(id));
        }
      } catch { /* skip */ }
      
      brandIds.add(s.brandId);
      personaIds.add(s.personaId);
    }

    const [feeds, brands, channels, personas] = await Promise.all([
      prisma.rssFeed.findMany({ where: { id: { in: [...feedIds] }, companyId: orgId }, select: { id: true, name: true } }),
      prisma.brand.findMany({ where: { id: { in: [...brandIds] }, companyId: orgId }, select: { id: true, name: true } }),
      prisma.socialChannel.findMany({ where: { id: { in: [...channelIds] }, companyId: orgId }, select: { id: true, name: true } }),
      prisma.persona.findMany({
        where: {
          id: { in: [...personaIds] },
          OR: [{ companyId: orgId }, { isSystemPersona: true }],
        },
        select: { id: true, name: true },
      }),
    ]);

    const feedMap = Object.fromEntries(feeds.map(f => [f.id, f.name]));
    const brandMap = Object.fromEntries(brands.map(b => [b.id, b.name]));
    const channelMap = Object.fromEntries(channels.map(c => [c.id, c.name]));
    const personaMap = Object.fromEntries(personas.map(p => [p.id, p.name]));

    const enriched = schedules.map(s => {
      let feedNames: string[] = [];
      let channelNames: string[] = [];
      try {
        const ids = JSON.parse(s.feedIds) as string[];
        feedNames = ids.map(id => feedMap[id] || id);
      } catch { /* skip */ }
      
      try {
        if (s.targetChannelIds) {
          const ids = JSON.parse(s.targetChannelIds) as string[];
          channelNames = ids.map(id => channelMap[id] || id);
        }
      } catch { /* skip */ }

      return {
        ...s,
        _feedNames: feedNames,
        _brandName: brandMap[s.brandId] || s.brandId,
        _channelNames: channelNames,
        _personaName: personaMap[s.personaId] || s.personaId,
      };
    });

    const response = NextResponse.json({ ...listResponse(enriched, total, page, limit), schedules: enriched });
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return response;
  } catch (e) {
    console.error("[Schedules API] GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/schedules
 * Create a new schedule.
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const {
      name,
      cronExpression,
      mode = "latest_n",
      count = 1,
      feedIds = [],
      brandId,
      targetChannelIds,
      personaId,
      autoScript = true,
      autoPublish = false,
      requireApproval = true,
      isActive = true,
      selectionCriteria,
      outputMode = "roundup",
    } = body;

    if (!name || !cronExpression) {
      return NextResponse.json({ error: "Name and cron expression are required" }, { status: 400 });
    }

    // Validate cron expression (basic 5-field check)
    const cronParts = cronExpression.trim().split(/\s+/);
    if (cronParts.length !== 5) {
      return NextResponse.json({ error: "Invalid cron expression. Must be 5 fields: minute hour day month weekday" }, { status: 400 });
    }

    // Verify the chosen brand belongs to the tenant.
    if (brandId) {
      const brand = await prisma.brand.findFirst({ where: { id: brandId, companyId: orgId } });
      if (!brand) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }
    }

    const nextRunAt = getNextRunEstimate(cronExpression);

    const schedule = await prisma.schedule.create({
      data: {
        companyId: orgId,
        name,
        cronExpression,
        mode,
        count,
        feedIds: JSON.stringify(feedIds),
        brandId: brandId || "",
        targetChannelIds: targetChannelIds ? JSON.stringify(targetChannelIds) : null,
        personaId: personaId || "",
        autoScript,
        autoPublish,
        requireApproval,
        isActive,
        nextRunAt,
        selectionCriteria,
        outputMode,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (e) {
    console.error("[Schedules API] POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
