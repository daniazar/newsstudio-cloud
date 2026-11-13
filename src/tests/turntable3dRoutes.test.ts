// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(async () => ({ ok: true, tenant: { userId: "user_1", orgId: "org_3d", isDefaultOrg: false } })),
}));

import { prisma } from "../lib/prisma";
import * as object3d from "../lib/ai/object3dClient";
import { POST as claimPOST } from "../app/api/pipeline/jobs/[jobId]/claim/route";
import { POST as progressPOST } from "../app/api/pipeline/jobs/[jobId]/progress/route";
import { POST as enqueuePOST } from "../app/api/ecommerce/turntable-3d/route";
import { pickTurntableSourceAsset, resolveTurntableSource } from "../lib/ecommerce/turntable3dAssets";

const WORKER_KEY = "test-worker-key";

function workerRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-worker-key": WORKER_KEY },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const baseJob = {
  id: "job_tt",
  companyId: "org_3d",
  storyId: "campaign_1",
  type: "turntable_3d",
  status: "QUEUED",
  config: JSON.stringify({ asset3DId: "asset_1", mode: "reconstruct_and_render" }),
  attempts: 0,
  maxAttempts: 3,
  startedAt: null,
};

describe("3D Turntable pipeline routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("WORKER_API_KEY", WORKER_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("claim: turntable_3d → TURNTABLE_IN_PROGRESS and skips the story lookup", async () => {
    vi.spyOn(prisma.generationJob, "findUnique")
      .mockResolvedValueOnce(baseJob as never)
      .mockResolvedValueOnce({ ...baseJob, status: "TURNTABLE_IN_PROGRESS" } as never);
    const updateMany = vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValue({ count: 1 });
    const storyLookup = vi.spyOn(prisma.story, "findFirst");

    const res = await claimPOST(workerRequest({ workerId: "w1" }), { params: Promise.resolve({ jobId: "job_tt" }) });
    const json = await res.json();

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "TURNTABLE_IN_PROGRESS", workerId: "w1" }) })
    );
    expect(storyLookup).not.toHaveBeenCalled();
    expect(json.claimed).toBe(true);
    expect(json.job.config).toEqual({ asset3DId: "asset_1", mode: "reconstruct_and_render" });
    expect(json.story).toBeUndefined();
  });

  it("progress FAILED: marks the linked asset FAILED and notifies with the campaign title", async () => {
    vi.spyOn(prisma.generationJob, "findUnique").mockResolvedValue({ ...baseJob, status: "TURNTABLE_IN_PROGRESS" } as never);
    vi.spyOn(prisma.jobLog, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma, "$transaction").mockResolvedValue([] as never);
    vi.spyOn(prisma.productCampaign, "findFirst").mockResolvedValue({ id: "campaign_1", title: "Aero Sneaker" } as never);
    const assetUpdate = vi.spyOn(prisma.product3DAsset, "updateMany").mockResolvedValue({ count: 1 });
    const notify = vi.spyOn(prisma.notification, "create").mockResolvedValue({} as never);
    const storyLookup = vi.spyOn(prisma.story, "findFirst");

    const res = await progressPOST(
      workerRequest({ step: "failed", status: "FAILED", errorLog: "Object3D server offline" }),
      { params: Promise.resolve({ jobId: "job_tt" }) }
    );

    expect(res.status).toBe(200);
    expect(storyLookup).not.toHaveBeenCalled();
    expect(assetUpdate).toHaveBeenCalledWith({
      where: { generationJobId: "job_tt", status: { notIn: ["READY", "FAILED"] } },
      data: { status: "FAILED", errorLog: "Object3D server offline" },
    });
    expect(notify).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "3D Turntable Failed", message: expect.stringContaining("Aero Sneaker") }),
    });
  });

  it("enqueue: creates a Product3DAsset revision + turntable_3d job and returns 202", async () => {
    vi.spyOn(prisma.productCampaign, "findFirst").mockResolvedValue({
      id: "campaign_1",
      companyId: "org_3d",
      assets: [
        { id: "pa_life", assetType: "lifestyle_context", rawUrl: "https://cdn/x.jpg", storageKey: null, isPrimary: true },
        { id: "pa_hero", assetType: "hero_packshot", rawUrl: "https://cdn/hero.jpg", storageKey: "tenants/org_3d/products/hero.png", isPrimary: false },
      ],
    } as never);
    vi.spyOn(object3d, "getObject3DEngines").mockResolvedValue({ online: false, error: "down", engines: [], quality_routing: {} });

    const tx = {
      product3DAsset: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "asset_new", ...data })),
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "asset_new", ...data })),
      },
      generationJob: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "job_new", ...data })) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation((async (fn: (t: typeof tx) => unknown) => fn(tx)) as never);

    const req = new Request("http://localhost/api/ecommerce/turntable-3d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: "campaign_1", quality: "draft", background: "white" }),
    }) as unknown as NextRequest;
    const res = await enqueuePOST(req);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json).toEqual({ jobId: "job_new", asset3DId: "asset_new", estimatedSeconds: 50 });
    expect(tx.product3DAsset.create.mock.calls[0][0].data).toMatchObject({
      companyId: "org_3d",
      sourceAssetId: "pa_hero",
      sourceImageKey: "tenants/org_3d/products/hero.png",
      quality: "draft",
      background: "white",
      status: "PENDING",
    });
    const jobData = tx.generationJob.create.mock.calls[0][0].data;
    expect(jobData).toMatchObject({ type: "turntable_3d", storyId: "campaign_1", status: "QUEUED", totalSteps: 100 });
    expect(JSON.parse(String(jobData.config))).toMatchObject({ asset3DId: "asset_new", mode: "reconstruct_and_render", quality: "draft" });
  });

  it("enqueue: rejects invalid quality / render settings with 400", async () => {
    const bad = (body: unknown) =>
      enqueuePOST(
        new Request("http://localhost/api/ecommerce/turntable-3d", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }) as unknown as NextRequest
      );
    expect((await bad({ campaignId: "c", quality: "ultra" })).status).toBe(400);
    expect((await bad({ campaignId: "c", quality: "draft", cameraPreset: "orbit" })).status).toBe(400);
    expect((await bad({ campaignId: "c", quality: "draft", frames: 5000 })).status).toBe(400);
    expect((await bad({ quality: "draft" })).status).toBe(400);
  });

  it("source picking prefers primary hero_packshot, then any hero, and skips videos", () => {
    const a = (id: string, assetType: string, isPrimary = false) =>
      ({ id, assetType, isPrimary, rawUrl: `https://cdn/${id}`, storageKey: null }) as never;
    expect(pickTurntableSourceAsset([a("v", "existing_video", true), a("h", "hero_packshot"), a("hp", "hero_packshot", true)])?.id).toBe("hp");
    expect(pickTurntableSourceAsset([a("v", "existing_video", true), a("d", "detail_macro")])?.id).toBe("d");
    expect(pickTurntableSourceAsset([a("h", "hero_packshot")], "missing")).toBeNull();
  });

  it("resolves scraped-spec image URLs only when they belong to the campaign", () => {
    const hero = { id: "h", assetType: "hero_packshot", isPrimary: true, rawUrl: "https://cdn/h.jpg", storageKey: null } as never;
    const campaign = { assets: [hero], rawMetadata: JSON.stringify({ images: ["https://store/side.jpg"] }) };

    expect(resolveTurntableSource(campaign, { sourceImageUrl: "https://cdn/h.jpg" })).toEqual({
      ok: true, sourceAssetId: "h", sourceImageKey: "https://cdn/h.jpg",
    });
    // Editor id from the scraped spec: unknown to the DB, but its URL is in the product metadata.
    expect(resolveTurntableSource(campaign, { sourceAssetId: "spec-2", sourceImageUrl: "https://store/side.jpg" })).toEqual({
      ok: true, sourceAssetId: null, sourceImageKey: "https://store/side.jpg",
    });
    // Foreign URLs are refused (the worker fetches this server-side).
    expect(resolveTurntableSource(campaign, { sourceImageUrl: "http://169.254.169.254/latest" })).toMatchObject({ ok: false, status: 404 });
    expect(resolveTurntableSource(campaign, {})).toMatchObject({ ok: true, sourceAssetId: "h" });
  });
});
