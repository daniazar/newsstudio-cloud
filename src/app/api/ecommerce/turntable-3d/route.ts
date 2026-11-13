/**
 * src/app/api/ecommerce/turntable-3d/route.ts
 *
 * POST — enqueue a 3D Product Turntable job (reconstruct GLB + render 360° turntable).
 * GET  — list Product3DAsset revisions for a campaign (?campaignId=), newest first.
 *
 * Heavy lifting runs in the standalone pipeline worker (GenerationJob type "turntable_3d")
 * against Object3D-Server (port 8020). This route only validates and enqueues.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getObject3DEngines } from "@/lib/ai/object3dClient";
import {
  JOB_SUMMARY_SELECT,
  TURNTABLE_3D_JOB_TYPE,
  TURNTABLE_3D_TOTAL_STEPS,
  estimateTurntableSeconds,
  isTurntable3DQuality,
  parseRenderSettings,
  resolveTurntableSource,
  toProduct3DAssetDTO,
  type Turntable3DJobConfig,
} from "@/lib/ecommerce/turntable3dAssets";
import { TURNTABLE_3D_DEFAULTS } from "@/lib/types/turntable3d";
import { broadcastWorkerWake } from "@/lib/worker-broker/supabaseWake";

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Response.json({ error: "JSON object body is required" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { campaignId, sourceAssetId, sourceImageUrl } = body;
  if (typeof campaignId !== "string" || !campaignId) {
    return Response.json({ error: "campaignId is required" }, { status: 400 });
  }
  if (sourceAssetId !== undefined && sourceAssetId !== null && typeof sourceAssetId !== "string") {
    return Response.json({ error: "sourceAssetId must be a string" }, { status: 400 });
  }
  if (sourceImageUrl !== undefined && sourceImageUrl !== null && typeof sourceImageUrl !== "string") {
    return Response.json({ error: "sourceImageUrl must be a string" }, { status: 400 });
  }
  const quality = body.quality ?? TURNTABLE_3D_DEFAULTS.quality;
  if (!isTurntable3DQuality(quality)) {
    return Response.json({ error: "quality must be one of: draft, standard, premium" }, { status: 400 });
  }
  const settings = parseRenderSettings(body);
  if (!settings.ok) {
    return Response.json({ error: settings.error }, { status: 400 });
  }

  try {
    const campaign = await prisma.productCampaign.findFirst({
      where: { id: campaignId, companyId: orgId },
      include: { assets: { orderBy: { createdAt: "asc" } } },
    });
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    const source = resolveTurntableSource(campaign, {
      sourceAssetId: sourceAssetId || undefined,
      sourceImageUrl: sourceImageUrl || undefined,
    });
    if (!source.ok) {
      return Response.json({ error: source.error }, { status: source.status });
    }
    const { sourceImageKey } = source;

    // Revisions: every generation creates a NEW Product3DAsset row (PRD OQ-7).
    const { asset, job } = await prisma.$transaction(async (tx) => {
      const created = await tx.product3DAsset.create({
        data: {
          companyId: orgId,
          campaignId: campaign.id,
          sourceAssetId: source.sourceAssetId,
          sourceImageKey,
          engine: "auto",
          quality,
          status: "PENDING",
          ...settings.value,
        },
      });

      const jobConfig: Turntable3DJobConfig = {
        asset3DId: created.id,
        campaignId: campaign.id,
        mode: "reconstruct_and_render",
        quality,
        sourceImageKey,
        ...settings.value,
      };

      const createdJob = await tx.generationJob.create({
        data: {
          companyId: orgId,
          // GenerationJob.storyId is required but unrelated here — carry the campaign id.
          storyId: campaign.id,
          type: TURNTABLE_3D_JOB_TYPE,
          status: "QUEUED",
          totalSteps: TURNTABLE_3D_TOTAL_STEPS,
          config: JSON.stringify(jobConfig),
        },
      });

      const linked = await tx.product3DAsset.update({
        where: { id: created.id },
        data: { generationJobId: createdJob.id },
      });
      return { asset: linked, job: createdJob };
    });

    // Prefer the live router estimate (accounts for fallbacks); never block > ~1.5s in local mode.
    const isRemote =
      process.env.NODE_ENV === "production" ||
      process.env.FORCE_REMOTE_WORKER === "true";
    const engines = isRemote ? { online: false, quality_routing: {} as Record<string, { estimated_seconds?: number }> } : await getObject3DEngines({ timeoutMs: 1500 });
    const route = engines.online ? engines.quality_routing[quality] : undefined;
    const estimatedSeconds = estimateTurntableSeconds(quality, route?.estimated_seconds);

    void broadcastWorkerWake("job_queued");

    return Response.json({ jobId: job.id, asset3DId: asset.id, estimatedSeconds }, { status: 202 });
  } catch (error) {
    console.error("[Turntable3D] Failed to enqueue job:", error);
    return Response.json({ error: "Failed to enqueue 3D turntable job" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const campaignId = request.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return Response.json({ error: "campaignId query parameter is required" }, { status: 400 });
  }

  try {
    const assets = await prisma.product3DAsset.findMany({
      where: { campaignId, companyId: orgId },
      orderBy: { createdAt: "desc" },
    });

    const jobIds = assets.map((a) => a.generationJobId).filter((id): id is string => Boolean(id));
    const jobs = jobIds.length
      ? await prisma.generationJob.findMany({
          where: { id: { in: jobIds }, companyId: orgId },
          select: JOB_SUMMARY_SELECT,
        })
      : [];
    const jobsById = new Map(jobs.map((j) => [j.id, j]));

    return Response.json({
      assets: assets.map((a) => toProduct3DAssetDTO(a, a.generationJobId ? jobsById.get(a.generationJobId) ?? null : null)),
    });
  } catch (error) {
    console.error("[Turntable3D] Failed to list assets:", error);
    return Response.json({ error: "Failed to list 3D assets" }, { status: 500 });
  }
}
