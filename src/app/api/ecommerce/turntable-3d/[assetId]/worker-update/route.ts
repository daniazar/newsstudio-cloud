/**
 * PATCH /api/ecommerce/turntable-3d/:assetId/worker-update
 * Pipeline worker updates a Product3DAsset (status, output keys, metrics).
 * Worker-facing — authenticated with WORKER_API_KEY (x-worker-key), not Clerk.
 */

import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireWorkerKey } from "@/lib/workerAuth";

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

const STATUSES = ["PENDING", "RECONSTRUCTING", "RENDERING", "READY", "FAILED"];
const STRING_FIELDS = [
  "engine",
  "meshKey",
  "previewKey",
  "turntableKey",
  "turntableMp4Key",
  "contactSheetKey",
  "textureSize",
  "errorLog",
  "generationJobId",
  "serverJobId",
] as const;
const INT_FIELDS = ["inferenceMs", "bgRemovalMs", "vertexCount", "faceCount"] as const;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const err = requireWorkerKey(request);
  if (err) return err;
  const { assetId } = await params;

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

  const data: Prisma.Product3DAssetUpdateInput = {};

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
      return Response.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
    }
    data.status = body.status;
  }

  for (const field of STRING_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      return Response.json({ error: `${field} must be a string or null` }, { status: 400 });
    }
    if (field === "engine") {
      if (typeof value === "string" && value) data.engine = value;
    } else {
      data[field] = value === null ? null : value.slice(0, field === "errorLog" ? 8000 : 2048);
    }
  }

  for (const field of INT_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
      return Response.json({ error: `${field} must be a number or null` }, { status: 400 });
    }
    data[field] = value === null ? null : Math.round(value);
  }

  if (body.vramPeakGb !== undefined) {
    const v = body.vramPeakGb;
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) {
      return Response.json({ error: "vramPeakGb must be a number or null" }, { status: 400 });
    }
    data.vramPeakGb = v;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const existing = await prisma.product3DAsset.findUnique({ where: { id: assetId }, select: { id: true } });
    if (!existing) {
      return Response.json({ error: "3D asset not found" }, { status: 404 });
    }
    const updated = await prisma.product3DAsset.update({ where: { id: assetId }, data });
    return Response.json({ success: true, status: updated.status });
  } catch (error) {
    console.error("[Turntable3D Worker Update] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
