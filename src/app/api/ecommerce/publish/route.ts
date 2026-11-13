import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { dispatchAdPublish, generatePlatformAdCopy } from "@/lib/ecommerce/socialPublishDispatcher";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";

/**
 * GET /api/ecommerce/publish
 * Retrieves available social channels for the current tenant.
 */
export async function GET() {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const channels = await prisma.socialChannel.findMany({
      where: { companyId: orgId, isActive: true },
      select: {
        id: true,
        platform: true,
        name: true,
        handle: true,
        profileImageUrl: true,
        followerCount: true,
      },
      orderBy: { platform: "asc" },
    });

    return NextResponse.json({ success: true, channels });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch social channels: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ecommerce/publish
 * Dispatches 1-click publishing or scheduling of an AdVariation to a target social channel.
 */
export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const { variationId, channelId, scheduledFor, customTitle, customDescription, previewOnly, productSpec, script, platform } = body;

    // Handle preview-only copy generation
    if (previewOnly && productSpec) {
      const copy = generatePlatformAdCopy(
        productSpec as ProductSpec,
        script as AdScript | undefined,
        platform || "tiktok"
      );
      return NextResponse.json({ success: true, copy });
    }

    if (!variationId || !channelId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: variationId and channelId." },
        { status: 400 }
      );
    }

    const result = await dispatchAdPublish({
      variationId,
      channelId,
      companyId: orgId,
      scheduledFor,
      customTitle,
      customDescription,
    });

    return NextResponse.json({
      success: true,
      publish: result.publish,
      copy: result.copy,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to dispatch social publish: ${message}` },
      { status: 500 }
    );
  }
}
