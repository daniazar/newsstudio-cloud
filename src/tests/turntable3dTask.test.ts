// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import {
  stepTurntable3D,
  mapPhaseProgress,
  parseTurntable3DConfig,
} from "../../workers/pipeline-worker/tasks/turntable3dTask";
import { JobCancelledError } from "../../workers/pipeline-worker/tasks/audioTask";
import * as pipelineApi from "../../workers/pipeline-worker/api";
import * as object3d from "../lib/ai/object3dClient";
import { storage } from "../lib/storage";
import type { Object3DJob } from "../lib/ai/object3dClient";

const COMPANY = "org_tenant_3d";
const JOB_ID = "job_tt_1";
const ASSET_ID = "asset3d_1";

function serverJob(partial: Partial<Object3DJob>): Object3DJob {
  return {
    job_id: "rc_1",
    kind: "reconstruct",
    status: "complete",
    step: "done",
    progress: 1,
    engine: "hunyuan3d_mini",
    error: null,
    created_at: "2026-09-12T20:10:00Z",
    metrics: null,
    files: {},
    ...partial,
  };
}

function reconstructJob(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    companyId: COMPANY,
    storyId: "campaign_1",
    type: "turntable_3d",
    config: {
      asset3DId: ASSET_ID,
      campaignId: "campaign_1",
      mode: "reconstruct_and_render",
      quality: "standard",
      sourceImageKey: `tenants/${COMPANY}/products/p1/hero.png`,
      background: "transparent",
      cameraPreset: "product_three_quarter",
      frames: 120,
      fps: 30,
      width: 1080,
      height: 1080,
      ...overrides,
    },
  };
}

describe("Pipeline Worker: 3D Product Turntable task (turntable_3d)", () => {
  let progressSpy: MockInstance<typeof pipelineApi.reportProgress>;
  let assetSpy: MockInstance<typeof pipelineApi.updateProduct3DAsset>;
  let uploadSpy: MockInstance<typeof storage.upload>;

  beforeEach(() => {
    vi.restoreAllMocks();
    uploadSpy = vi.spyOn(storage, "upload").mockImplementation(async (key: string) => `http://minio/${key}`);
    vi.spyOn(storage, "download").mockResolvedValue(Buffer.from("PNG_OR_GLB_BYTES"));
    progressSpy = vi.spyOn(pipelineApi, "reportProgress").mockResolvedValue(true);
    assetSpy = vi.spyOn(pipelineApi, "updateProduct3DAsset").mockResolvedValue(true);
    vi.spyOn(object3d, "checkObject3DHealth").mockResolvedValue({ online: true, latencyMs: 3 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps server progress into job-wide percentage windows", () => {
    expect(mapPhaseProgress([0, 55], 0)).toBe(0);
    expect(mapPhaseProgress([0, 55], 0.5)).toBe(27.5);
    expect(mapPhaseProgress([60, 92], 1)).toBe(92);
    expect(mapPhaseProgress([60, 92], 7)).toBe(92);
    expect(mapPhaseProgress([60, 92], Number.NaN)).toBe(60);
  });

  it("validates job config per mode", () => {
    expect(() => parseTurntable3DConfig({ mode: "reconstruct_and_render" })).toThrow(/asset3DId/);
    expect(() => parseTurntable3DConfig({ asset3DId: "a", mode: "reconstruct_and_render" })).toThrow(/sourceImageKey/);
    expect(() => parseTurntable3DConfig({ asset3DId: "a", mode: "render_only" })).toThrow(/meshKey/);
    const cfg = parseTurntable3DConfig(JSON.stringify({ asset3DId: "a", sourceImageKey: "k", quality: "bogus" }));
    expect(cfg.mode).toBe("reconstruct_and_render");
    expect(cfg.quality).toBe("standard");
    expect(cfg.frames).toBe(120);
  });

  it("happy path: reconstructs, renders, uploads via storage and marks the asset READY", async () => {
    const submitRc = vi.spyOn(object3d, "submitReconstruction").mockResolvedValue({
      job_id: "rc_1", kind: "reconstruct", engine: "hunyuan3d_mini", estimated_seconds: 60, status: "queued", fallback_reason: null,
    });
    const submitTt = vi.spyOn(object3d, "submitTurntable").mockResolvedValue({ job_id: "tt_1", kind: "turntable", status: "queued" });
    vi.spyOn(object3d, "waitForObject3DJob").mockImplementation(async (id, opts) => {
      if (id === "rc_1") {
        await opts?.onProgress?.(serverJob({ status: "running", step: "reconstruction", progress: 0.5 }));
        return serverJob({
          metrics: { inference_ms: 41200, bg_removal_ms: 820, vertex_count: 48211, face_count: 96000, vram_peak_gb: 7.8, texture_size: "1024x1024" },
        });
      }
      await opts?.onProgress?.(serverJob({ job_id: "tt_1", kind: "turntable", status: "running", step: "turntable_render", progress: 0.5 }));
      return serverJob({ job_id: "tt_1", kind: "turntable" });
    });
    const downloadSpy = vi.spyOn(object3d, "downloadObject3DFile").mockImplementation(async (_id, name) => Buffer.from(`bytes:${name}`));

    const result = await stepTurntable3D(reconstructJob(), JOB_ID, { pollMs: 1 });

    // Input image came from storage and was sent as base64
    expect(storage.download).toHaveBeenCalledWith(`tenants/${COMPANY}/products/p1/hero.png`);
    expect(submitRc.mock.calls[0][0]).toMatchObject({
      image_base64: Buffer.from("PNG_OR_GLB_BYTES").toString("base64"),
      quality: "standard",
      remove_background: true,
    });
    // Turntable reuses the reconstruct job's mesh
    expect(submitTt.mock.calls[0][0]).toMatchObject({
      mesh_job_id: "rc_1",
      frames: 120,
      fps: 30,
      width: 1080,
      height: 1080,
      background: "transparent",
      camera_preset: "product_three_quarter",
    });
    expect(downloadSpy).toHaveBeenCalledWith("rc_1", "mesh.glb", expect.anything());
    expect(downloadSpy).toHaveBeenCalledWith("tt_1", "turntable.webm", expect.anything());

    // Tenant-scoped storage keys
    expect(result.meshKey).toBe(`tenants/${COMPANY}/3d-objects/${ASSET_ID}/mesh.glb`);
    expect(result.previewKey).toBe(`tenants/${COMPANY}/3d-objects/${ASSET_ID}/preview.png`);
    expect(result.turntableKey).toBe(`tenants/${COMPANY}/3d-turntables/${ASSET_ID}/${JOB_ID}/turntable.webm`);
    expect(result.turntableMp4Key).toBe(`tenants/${COMPANY}/3d-turntables/${ASSET_ID}/${JOB_ID}/turntable.mp4`);
    expect(result.contactSheetKey).toBe(`tenants/${COMPANY}/3d-turntables/${ASSET_ID}/${JOB_ID}/contact_sheet.png`);
    expect(uploadSpy).toHaveBeenCalledWith(result.meshKey, expect.any(Buffer), "model/gltf-binary");
    expect(uploadSpy).toHaveBeenCalledWith(result.turntableKey, expect.any(Buffer), "video/webm");

    // Asset lifecycle: RECONSTRUCTING → RENDERING (with metrics) → READY
    const statuses = assetSpy.mock.calls.map((c) => (c[1] as { status?: string }).status).filter(Boolean);
    expect(statuses).toEqual(["RECONSTRUCTING", "RENDERING", "READY"]);
    expect(assetSpy).toHaveBeenCalledWith(ASSET_ID, expect.objectContaining({ serverJobId: "rc_1", engine: "hunyuan3d_mini" }));
    expect(assetSpy).toHaveBeenCalledWith(
      ASSET_ID,
      expect.objectContaining({ status: "RENDERING", meshKey: result.meshKey, inferenceMs: 41200, vertexCount: 48211, vramPeakGb: 7.8, textureSize: "1024x1024" })
    );
    expect(assetSpy).toHaveBeenLastCalledWith(
      ASSET_ID,
      expect.objectContaining({ status: "READY", turntableKey: result.turntableKey, errorLog: null })
    );

    // Progress: monotonic percentages under TURNTABLE_IN_PROGRESS, ending at 100
    const reports = progressSpy.mock.calls.map((c) => c[1] as { status: string; doneSteps: number; step: string });
    expect(reports.every((r) => r.status === "TURNTABLE_IN_PROGRESS")).toBe(true);
    const pcts = reports.map((r) => r.doneSteps);
    expect([...pcts].sort((a, b) => a - b)).toEqual(pcts);
    expect(pcts[pcts.length - 1]).toBe(100);
    expect(reports.map((r) => r.step)).toEqual(expect.arrayContaining(["queued", "reconstruction", "turntable_render", "upload"]));
  });

  it("render_only: re-renders from the stored mesh via mesh_base64 without reconstructing", async () => {
    const submitRc = vi.spyOn(object3d, "submitReconstruction");
    const submitTt = vi.spyOn(object3d, "submitTurntable").mockResolvedValue({ job_id: "tt_2", kind: "turntable", status: "queued" });
    vi.spyOn(object3d, "waitForObject3DJob").mockResolvedValue(serverJob({ job_id: "tt_2", kind: "turntable" }));
    vi.spyOn(object3d, "downloadObject3DFile").mockImplementation(async (_id, name) => {
      if (name === "turntable.mp4") throw new object3d.Object3DServerError("not produced", 404);
      return Buffer.from(`bytes:${name}`);
    });

    const meshKey = `tenants/${COMPANY}/3d-objects/${ASSET_ID}/mesh.glb`;
    const job = reconstructJob({ mode: "render_only", sourceImageKey: undefined, meshKey, background: "studio_dark" });
    const result = await stepTurntable3D(job, JOB_ID, { pollMs: 1 });

    expect(submitRc).not.toHaveBeenCalled();
    expect(storage.download).toHaveBeenCalledWith(meshKey);
    expect(submitTt.mock.calls[0][0]).toMatchObject({
      mesh_base64: Buffer.from("PNG_OR_GLB_BYTES").toString("base64"),
      background: "studio_dark",
    });
    expect(submitTt.mock.calls[0][0].mesh_job_id).toBeUndefined();
    expect(result.turntableMp4Key).toBeNull(); // optional file missing is tolerated
    const statuses = assetSpy.mock.calls.map((c) => (c[1] as { status?: string }).status).filter(Boolean);
    expect(statuses).toEqual(["RENDERING", "READY"]);
  });

  it("failure path: server offline → asset FAILED with a start hint, error rethrown for retry", async () => {
    vi.mocked(object3d.checkObject3DHealth).mockResolvedValue({ online: false, error: "ECONNREFUSED" });
    const submitRc = vi.spyOn(object3d, "submitReconstruction");

    await expect(stepTurntable3D(reconstructJob(), JOB_ID)).rejects.toThrow(
      /Object3D server offline at .*docker compose -f docker-compose\.object3d\.yml up/
    );
    expect(submitRc).not.toHaveBeenCalled();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(assetSpy).toHaveBeenLastCalledWith(
      ASSET_ID,
      expect.objectContaining({ status: "FAILED", errorLog: expect.stringContaining("docker-compose.object3d.yml") })
    );
  });

  it("failure path: reconstruction fails on the server → asset FAILED, nothing uploaded", async () => {
    vi.spyOn(object3d, "submitReconstruction").mockResolvedValue({
      job_id: "rc_1", kind: "reconstruct", engine: "trellis", estimated_seconds: 120, status: "queued", fallback_reason: null,
    });
    vi.spyOn(object3d, "waitForObject3DJob").mockRejectedValue(
      new object3d.Object3DServerError('Object3D reconstruct job rc_1 failed at step "reconstruction": CUDA out of memory')
    );

    await expect(stepTurntable3D(reconstructJob(), JOB_ID, { pollMs: 1 })).rejects.toThrow(/CUDA out of memory/);
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(assetSpy).toHaveBeenLastCalledWith(ASSET_ID, { status: "FAILED", errorLog: expect.stringContaining("CUDA out of memory") });
  });

  it("cancellation: a rejected progress report (409) aborts with JobCancelledError", async () => {
    progressSpy.mockResolvedValue(false);
    await expect(stepTurntable3D(reconstructJob(), JOB_ID)).rejects.toBeInstanceOf(JobCancelledError);
    expect(assetSpy).toHaveBeenLastCalledWith(ASSET_ID, { status: "FAILED", errorLog: "Job cancelled" });
  });
});
