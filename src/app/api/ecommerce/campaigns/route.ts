/**
 * src/app/api/ecommerce/campaigns/route.ts
 *
 * CRUD API for saved E-Commerce Product Campaigns & Ad Variations.
 * Multi-tenant scoped with cascade storage asset cleanup.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { deleteCampaignStorageAssets } from "@/lib/storage/cleanup";

export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const campaigns = await prisma.productCampaign.findMany({
      where: { companyId: orgId },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        variations: {
          select: {
            id: true,
            campaignId: true,
            archetype: true,
            targetChannel: true,
            aspectRatio: true,
            audioMode: true,
            status: true,
            renderedVideoKey: true,
            thumbnailKey: true,
            durationSeconds: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assets: {
          select: {
            id: true,
            campaignId: true,
            assetType: true,
            rawUrl: true,
            storageKey: true,
            mattedKey: true,
            isPrimary: true,
          },
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      campaigns,
    });
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return response;
  } catch (error: unknown) {
    console.error("[API /api/ecommerce/campaigns] GET Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const campaign = await prisma.productCampaign.findFirst({
      where: { id, companyId: orgId },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Clean up physical/cloud storage assets before removing DB records
    await deleteCampaignStorageAssets(id).catch((err) => {
      console.warn(`[API] Storage cleanup warning for campaign ${id}:`, err);
    });

    await prisma.productCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error: unknown) {
    console.error("[API /api/ecommerce/campaigns] DELETE Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
