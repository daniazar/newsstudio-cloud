import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;
    const { feedId, name, url } = await request.json();

    const brand = await prisma.brand.findFirst({
      where: { id, companyId: orgId },
      include: { rssGroups: true },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // 1. Find or create an RssGroup with the brand's name
    let targetGroup = await prisma.rssGroup.findFirst({
      where: { name: brand.name },
    });

    if (!targetGroup) {
      targetGroup = await prisma.rssGroup.create({
        data: { name: brand.name, companyId: orgId },
      });
    }

    // 2. Link the RssGroup to the Brand if it isn't already
    const isGroupLinked = brand.rssGroups.some((g) => g.id === targetGroup.id);
    if (!isGroupLinked) {
      await prisma.brand.update({
        where: { id },
        data: {
          rssGroups: { connect: { id: targetGroup.id } },
        },
      });
    }

    // 3. Find or create the RssFeed
    let feed;
    if (feedId) {
      feed = await prisma.rssFeed.findFirst({ where: { id: feedId, companyId: orgId } });
      if (!feed) {
        return NextResponse.json({ error: "RSS Feed not found" }, { status: 404 });
      }
    } else {
      if (!name || !url) {
        return NextResponse.json({ error: "Name and URL are required to create a new feed" }, { status: 400 });
      }
      feed = await prisma.rssFeed.findFirst({ where: { url, companyId: orgId } });

      if (!feed) {
        feed = await prisma.rssFeed.create({
          data: {
            companyId: orgId,
            name,
            url,
            fetchIntervalMinutes: 60,
            isEnabled: true,
            autoScript: true,
            autoPublish: false,
            requireApproval: true,
          },
        });
      }
    }

    // 4. Link the RssFeed to the RssGroup
    await prisma.rssGroup.update({
      where: { id: targetGroup.id },
      data: {
        feeds: { connect: { id: feed.id } },
      },
    });

    return NextResponse.json({ success: true, feed, group: targetGroup });
  } catch (error) {
    console.error("POST /api/brands/[id]/rss-feeds failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
