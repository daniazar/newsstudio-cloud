/**
 * POST /api/ecommerce/turntable-3d/:assetId/render
 * Re-render the turntable video from the stored GLB (no re-reconstruction).
 * Updates the asset's render settings in place and enqueues a "render_only" job.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import {
  TURNTABLE_3D_JOB_TYPE,
  TURNTABLE_3D_TOTAL_STEPS,
  parseRenderSettings,
  type Turntable3DJobConfig,
  type Turntable3DRenderSettings,
} from "@/lib/ecommerce/turntable3dAssets";
import type { Turntable3DQuality } from "@/lib/types/turntable3d";

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

const ACTIVE_STATUSES = ["PENDING", "RECONSTRUCTING", "RENDERING"];

export async function POST(request: NextRequest, { params }: RouteParams) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;
  const { assetId } = await params;

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return Response.json({ error: "JSON object body is required" }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    }
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const asset = await prisma.product3DAsset.findFirst({
      where: { id: assetId, companyId: orgId },
    });
    if (!asset) {
      return Response.json({ error: "3D asset not found" }, { status: 404 });
    }
    if (!asset.meshKey) {
      return Response.json(
        { error: "This 3D asset has no reconstructed mesh yet — generate it first" },
        { status: 409 }
      );
    }

    if (asset.generationJobId && ACTIVE_STATUSES.includes(asset.status)) {
      const running = await prisma.generationJob.findFirst({
        where: { id: asset.generationJobId, status: { notIn: ["DONE", "FAILED", "CANCELLED"] } },
        select: { id: true },
      });
      if (running) {
        return Response.json(
          { error: "A job is already running for this 3D asset", jobId: running.id },
          { status: 409 }
        );
      }
    }

    const base: Turntable3DRenderSettings = {
      background: asset.background as Turntable3DRenderSettings["background"],
      cameraPreset: asset.cameraPreset as Turntable3DRenderSettings["cameraPreset"],
      frames: asset.frames,
      fps: asset.fps,
      width: asset.width,
      height: asset.height,
    };
    const settings = parseRenderSettings(body, base);
    if (!settings.ok) {
      return Response.json({ error: settings.error }, { status: 400 });
    }

    const job = await prisma.$transaction(async (tx) => {
      const jobConfig: Turntable3DJobConfig = {
        asset3DId: asset.id,
        campaignId: asset.campaignId,
        mode: "render_only",
        quality: asset.quality as Turntable3DQuality,
        meshKey: asset.meshKey ?? undefined,
        ...settings.value,
      };
      const createdJob = await tx.generationJob.create({
        data: {
          companyId: orgId,
          storyId: asset.campaignId,
          type: TURNTABLE_3D_JOB_TYPE,
          status: "QUEUED",
          totalSteps: TURNTABLE_3D_TOTAL_STEPS,
          config: JSON.stringify(jobConfig),
        },
      });
      await tx.product3DAsset.update({
        where: { id: asset.id },
        data: {
          ...settings.value,
          status: "RENDERING",
          errorLog: null,
          generationJobId: createdJob.id,
        },
      });
      return createdJob;
    });

    return Response.json({ jobId: job.id, asset3DId: asset.id }, { status: 202 });
  } catch (error) {
    console.error("[Turntable3D] Failed to enqueue re-render:", error);
    return Response.json({ error: "Failed to enqueue turntable re-render" }, { status: 500 });
  }
}
