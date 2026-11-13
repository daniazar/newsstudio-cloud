import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";

/**
 * GET /api/stories — List the active tenant's stories with pagination + search.
 */
export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip, take, q, status } = parseListParams(searchParams);
  const feedId = searchParams.get("feedId");
  const feedIdsParam = searchParams.get("feedIds");
  const category = searchParams.get("category");
  const approvalStatus = searchParams.get("approvalStatus");
  const brandId = searchParams.get("brandId");
  const sortBy = searchParams.get("sortBy") || "date";

  const where: Record<string, unknown> = { companyId: orgId };
  if (status && status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;

  if (approvalStatus && approvalStatus !== "all") {
    const norm = approvalStatus.toLowerCase();
    if (norm === "pending" || norm === "pending_review") {
      where.approvalStatus = "pending_review";
    } else {
      where.approvalStatus = norm;
    }
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { category: { contains: q } },
    ];
  }

  if (brandId && brandId !== "all") {
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, companyId: orgId },
      include: {
        rssGroups: {
          include: { feeds: { select: { id: true } } },
        },
      },
    });
    const brandFeedIds = brand?.rssGroups.flatMap((g) => g.feeds.map((f) => f.id)) || [];
    where.feedId = { in: brandFeedIds };
  } else if (feedId) {
    where.feedId = feedId;
  } else if (feedIdsParam) {
    where.feedId = { in: feedIdsParam.split(",") };
  }

  let orderBy: Record<string, unknown> = { pubDate: "desc" };
  if (sortBy === "title") {
    orderBy = { title: "asc" };
  } else if (sortBy === "status") {
    orderBy = { status: "asc" };
  } else if (sortBy === "category") {
    orderBy = { category: "asc" };
  } else if (sortBy === "source") {
    orderBy = { feed: { name: "asc" } };
  }

  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        companyId: true,
        feedId: true,
        title: true,
        link: true,
        description: true,
        author: true,
        pubDate: true,
        guid: true,
        category: true,
        status: true,
        approvalStatus: true,
        articleImageUrls: true,
        keywords: true,
        createdAt: true,
        updatedAt: true,
        feed: { select: { id: true, name: true, url: true } },
        script: {
          select: {
            id: true,
            headline: true,
            segments: {
              select: {
                id: true,
                index: true,
                text: true,
                assetPath: true,
                assetType: true,
                personaId: true,
              },
            },
          },
        },
        video: {
          select: {
            id: true,
            status: true,
            outputPath: true,
            bgMusicPath: true,
            bgMusic: {
              select: {
                name: true,
                mood: true,
              },
            },
          },
        },
      },
    }),
    prisma.story.count({ where }),
  ]);

  // `data` is canonical; `stories` retained as a deprecated alias for existing consumers.
  return NextResponse.json({ ...listResponse(stories, total, page, limit), stories });
}
