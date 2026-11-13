import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";

/**
 * GET /api/videos — List the tenant's completed videos with metadata, search, filtering, and pagination.
 */
export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const url = new URL(request.url);
  const { page, limit, skip, take, status, q } = parseListParams(url.searchParams);
  const aspectRatio = url.searchParams.get("aspectRatio");
  const sortBy = url.searchParams.get("sortBy") || "newest";

  const andConditions: Record<string, unknown>[] = [{ companyId: orgId }];

  if (status && status !== "all") {
    andConditions.push({ status });
  } else if (!status) {
    andConditions.push({ status: "COMPLETED" });
  }

  if (aspectRatio && aspectRatio !== "all") {
    andConditions.push({ aspectRatio });
  }

  if (q) {
    andConditions.push({
      OR: [
        { story: { title: { contains: q } } },
        { youtubeTitle: { contains: q } },
        { instagramCaption: { contains: q } },
      ],
    });
  }

  const where = { AND: andConditions };

  let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
  if (sortBy === "oldest") orderBy = { createdAt: "asc" };
  else if (sortBy === "views") orderBy = { totalViews: "desc" };
  else if (sortBy === "likes") orderBy = { totalLikes: "desc" };
  else if (sortBy === "duration") orderBy = { duration: "desc" };

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        companyId: true,
        storyId: true,
        status: true,
        aspectRatio: true,
        outputPath: true,
        thumbnailPath: true,
        duration: true,
        youtubeTitle: true,
        youtubeDescription: true,
        youtubeTags: true,
        instagramCaption: true,
        instagramHashtags: true,
        publishStatus: true,
        totalViews: true,
        totalLikes: true,
        createdAt: true,
        updatedAt: true,
        story: {
          select: {
            id: true,
            title: true,
            feed: { select: { name: true } },
          },
        },
        publishes: {
          select: {
            id: true,
            status: true,
            platformVideoId: true,
            publishedAt: true,
            scheduledFor: true,
            viewCount: true,
            likeCount: true,
            channel: { select: { name: true, platform: true } },
          },
        },
      },
    }),
    prisma.video.count({ where }),
  ]);

  return NextResponse.json({ ...listResponse(videos, total, page, limit), videos });
}
