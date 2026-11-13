/**
 * GET /api/ecommerce/turntable-3d/:assetId
 * A single Product3DAsset with resolved asset URLs and joined job progress.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { JOB_SUMMARY_SELECT, toProduct3DAssetDTO } from "@/lib/ecommerce/turntable3dAssets";

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;
  const { assetId } = await params;

  try {
    const asset = await prisma.product3DAsset.findFirst({
      where: { id: assetId, companyId: orgId },
    });
    if (!asset) {
      return Response.json({ error: "3D asset not found" }, { status: 404 });
    }

    const job = asset.generationJobId
      ? await prisma.generationJob.findFirst({
          where: { id: asset.generationJobId, companyId: orgId },
          select: JOB_SUMMARY_SELECT,
        })
      : null;

    return Response.json(toProduct3DAssetDTO(asset, job), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[Turntable3D] Failed to load asset:", error);
    return Response.json({ error: "Failed to load 3D asset" }, { status: 500 });
  }
}
