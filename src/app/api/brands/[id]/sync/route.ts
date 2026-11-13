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
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    // Look up channel by explicit channelId, or fallback to matching id / brandId
    const channel = channelId
      ? await prisma.socialChannel.findFirst({
          where: {
            id: channelId,
            companyId: orgId,
            brandId: id,
          },
        })
      : await prisma.socialChannel.findFirst({
          where: {
            OR: [
              { id, companyId: orgId },
              { brandId: id, companyId: orgId },
            ],
          },
        });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Add mock organic growth on sync!
    const growth = channel.platform === "youtube" ? 15 : 42;
    
    const updatedChannel = await prisma.socialChannel.update({
      where: { id: channel.id },
      data: {
        subscriberCount: channel.platform === "youtube" ? channel.subscriberCount + growth : 0,
        followerCount: channel.platform !== "youtube" ? channel.followerCount + growth : 0,
        lastSyncedAt: new Date(),
        tokenExpiry: new Date(Date.now() + 3600 * 1000 * 24 * 30), // Reset token to 30 days
      },
    });

    return NextResponse.json({
      success: true,
      growth,
      channel: {
        ...updatedChannel,
        accessToken: "••••••••••••••••",
        refreshToken: "••••••••••••••••",
      }
    });
  } catch (error) {
    console.error("POST /api/brands/[id]/sync failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
