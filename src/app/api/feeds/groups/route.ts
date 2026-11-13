import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/**
 * GET /api/feeds/groups — List all RSS feed groups for the tenant with feed counts.
 */
export async function GET(_request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const groups = await prisma.rssGroup.findMany({
      where: { companyId: orgId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { feeds: true, brands: true },
        },
      },
    });

    const res = NextResponse.json({ groups });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return res;
  } catch (error) {
    console.error("[API] Failed to fetch feed groups:", error);
    return NextResponse.json(
      { error: "Failed to list RSS groups: " + String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feeds/groups — Create or upsert a new RSS feed group.
 */
export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { name, color = "#3b82f6" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const group = await prisma.rssGroup.upsert({
      where: {
        companyId_name: {
          companyId: orgId,
          name: trimmedName,
        },
      },
      update: {
        color,
      },
      create: {
        companyId: orgId,
        name: trimmedName,
        color,
      },
      include: {
        _count: { select: { feeds: true } },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create feed group:", error);
    return NextResponse.json(
      { error: "Failed to create RSS group: " + String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feeds/groups — Delete an RSS feed group by ID or name.
 */
export async function DELETE(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const name = searchParams.get("name");

  if (!id && !name) {
    return NextResponse.json(
      { error: "Group id or name is required for deletion" },
      { status: 400 }
    );
  }

  try {


    const group = await prisma.rssGroup.findFirst({
      where: id ? { id, companyId: orgId } : { name: name!, companyId: orgId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    await prisma.rssGroup.delete({
      where: { id: group.id },
    });

    return NextResponse.json({ success: true, message: "Group deleted successfully" });
  } catch (error) {
    console.error("[API] Failed to delete feed group:", error);
    return NextResponse.json(
      { error: "Failed to delete RSS group: " + String(error) },
      { status: 500 }
    );
  }
}
