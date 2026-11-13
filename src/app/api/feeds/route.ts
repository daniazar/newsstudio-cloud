import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";

/**
 * GET /api/feeds — List the tenant's RSS feeds with pagination + search.
 */
export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const searchParams = new URL(request.url).searchParams;
    const { page, limit, skip, take, q } = parseListParams(searchParams);
    const group = searchParams.get("group");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { companyId: orgId };
    if (q) where.name = { contains: q };

    if (group && group !== "all") {
      if (group.toLowerCase() === "general") {
        where.OR = [
          { groups: { none: {} } },
          { groups: { some: { name: "General" } } },
        ];
      } else {
        where.groups = { some: { name: group } };
      }
    }

    if (status === "active") {
      where.isEnabled = true;
    } else if (status === "inactive") {
      where.isEnabled = false;
    }

    const isLite = searchParams.get("lite") === "true";
    if (isLite) {
      const [liteFeeds, total] = await Promise.all([
        prisma.rssFeed.findMany({
          where,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            url: true,
            isActive: true,
            isEnabled: true,
          },
          skip,
          take,
        }),
        prisma.rssFeed.count({ where }),
      ]);
      const res = NextResponse.json({ ...listResponse(liteFeeds, total, page, limit), feeds: liteFeeds });
      res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
      return res;
    }

    const [feeds, total] = await Promise.all([
      prisma.rssFeed.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { stories: true } },
          groups: true,
        },
        skip,
        take,
      }),
      prisma.rssFeed.count({ where }),
    ]);

    const res = NextResponse.json({ ...listResponse(feeds, total, page, limit), feeds });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: "Error al listar canales RSS: " + String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feeds — Add a new RSS feed
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { name, url, fetchIntervalMinutes, isEnabled, defaultPersonaId, autoScript, autoPublish, requireApproval, groupId, groupName } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "El Nombre y la URL del canal RSS son requeridos" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "El formato de la URL es inválido" },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = await prisma.rssFeed.findUnique({
      where: { companyId_url: { companyId: orgId, url } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "El enlace RSS ya está registrado" },
        { status: 409 }
      );
    }

    // Resolve or upsert group if groupName provided
    let groupConnect: { id: string } | undefined = undefined;
    if (groupId) {
      groupConnect = { id: groupId };
    } else if (groupName && typeof groupName === "string" && groupName.trim()) {
      const g = await prisma.rssGroup.upsert({
        where: { companyId_name: { companyId: orgId, name: groupName.trim() } },
        update: {},
        create: { companyId: orgId, name: groupName.trim() },
      });
      groupConnect = { id: g.id };
    }

    const feed = await prisma.rssFeed.create({
      data: {
        companyId: orgId,
        name,
        url,
        fetchIntervalMinutes: Number(fetchIntervalMinutes) || 60,
        isEnabled: isEnabled !== undefined ? !!isEnabled : true,
        defaultPersonaId: defaultPersonaId || null,
        autoScript: autoScript !== undefined ? !!autoScript : true,
        autoPublish: autoPublish !== undefined ? !!autoPublish : false,
        requireApproval: requireApproval !== undefined ? !!requireApproval : true,
        ...(groupConnect ? { groups: { connect: [groupConnect] } } : {}),
      },
      include: {
        groups: true,
        _count: { select: { stories: true } },
      },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to add feed:", error);
    return NextResponse.json(
      { error: "No se pudo crear el canal RSS: " + String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/feeds — Update an RSS feed (scoped to the tenant)
 */
export async function PUT(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { id, name, url, fetchIntervalMinutes, isEnabled, defaultPersonaId, autoScript, autoPublish, requireApproval, groupId, groupName } = body;

    if (!id) {
      return NextResponse.json(
        { error: "El ID del canal es obligatorio para actualizar" },
        { status: 400 }
      );
    }

    const existing = await prisma.rssFeed.findFirst({ where: { id, companyId: orgId } });
    if (!existing) {
      return NextResponse.json({ error: "Canal RSS no encontrado" }, { status: 404 });
    }

    // Resolve or upsert group if provided
    let groupSet: { id: string }[] | undefined = undefined;
    if (groupId) {
      groupSet = [{ id: groupId }];
    } else if (groupName && typeof groupName === "string" && groupName.trim()) {
      const g = await prisma.rssGroup.upsert({
        where: { companyId_name: { companyId: orgId, name: groupName.trim() } },
        update: {},
        create: { companyId: orgId, name: groupName.trim() },
      });
      groupSet = [{ id: g.id }];
    }

    // Prepare fields to update
    const updated = await prisma.rssFeed.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        url: url !== undefined ? url : existing.url,
        fetchIntervalMinutes: fetchIntervalMinutes !== undefined ? Number(fetchIntervalMinutes) : existing.fetchIntervalMinutes,
        isEnabled: isEnabled !== undefined ? !!isEnabled : existing.isEnabled,
        defaultPersonaId: defaultPersonaId !== undefined ? defaultPersonaId : existing.defaultPersonaId,
        autoScript: autoScript !== undefined ? !!autoScript : existing.autoScript,
        autoPublish: autoPublish !== undefined ? !!autoPublish : existing.autoPublish,
        requireApproval: requireApproval !== undefined ? !!requireApproval : existing.requireApproval,
        ...(groupSet !== undefined ? { groups: { set: groupSet } } : {}),
      },
      include: {
        groups: true,
        _count: { select: { stories: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al actualizar el canal RSS: " + String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feeds — Delete a feed by ID (scoped to the tenant)
 */
export async function DELETE(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "El ID del canal RSS es requerido" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.rssFeed.findFirst({ where: { id, companyId: orgId } });
    if (!existing) {
      return NextResponse.json({ error: "Canal RSS no encontrado o ya eliminado." }, { status: 404 });
    }
    await prisma.rssFeed.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Canal RSS eliminado correctamente." });
  } catch {
    return NextResponse.json(
      { error: "Canal RSS no encontrado o ya eliminado." },
      { status: 404 }
    );
  }
}
