// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  checkObject3DHealth,
  downloadObject3DFile,
  getObject3DEngines,
  getObject3DServerUrl,
  submitReconstruction,
  submitTurntable,
  waitForObject3DJob,
  Object3DServerError,
  type Object3DJob,
} from "../lib/ai/object3dClient";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function job(partial: Partial<Object3DJob>): Object3DJob {
  return {
    job_id: "rc_1",
    kind: "reconstruct",
    status: "running",
    step: "reconstruction",
    progress: 0.5,
    engine: "hunyuan3d_mini",
    error: null,
    created_at: "2026-09-12T20:10:00Z",
    metrics: {},
    files: {},
    ...partial,
  };
}

describe("Object3D-Server client (port 8020)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("defaults to port 8020 and honours OBJECT3D_SERVER_URL (trailing slash stripped)", () => {
    vi.stubEnv("OBJECT3D_SERVER_URL", "");
    expect(getObject3DServerUrl()).toBe("http://localhost:8020");
    vi.stubEnv("OBJECT3D_SERVER_URL", "http://object3d-server:8020/");
    expect(getObject3DServerUrl()).toBe("http://object3d-server:8020");
  });

  it("reports online:false (never throws) when the server is unreachable", async () => {
    const res = await checkObject3DHealth({ serverUrl: "http://127.0.0.1:9", timeoutMs: 1000 });
    expect(res.online).toBe(false);
    expect(res.error).toContain("http://127.0.0.1:9");
  });

  it("returns an offline engines payload instead of throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    const res = await getObject3DEngines({ serverUrl: "http://localhost:8020" });
    expect(res.online).toBe(false);
    expect(res.error).toMatch(/unreachable/);
    expect(res.engines).toEqual([]);
    expect(res.quality_routing).toEqual({});
  });

  it("merges /engines with GPU info from /health", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/engines")) {
        return jsonResponse({
          engines: [{ name: "hunyuan3d_mini", label: "Hunyuan3D-2 mini", status: "online", textured: true, min_vram_gb: 6, licence: "x", gated: false }],
          quality_routing: { standard: { engine: "hunyuan3d_mini", estimated_seconds: 60, available: true } },
        });
      }
      return jsonResponse({ status: "ok", service: "object3d-server", version: "1.0.0", port: 8020, gpu_name: "RTX 3080", vram_total_gb: 10, engines: [] });
    });
    const res = await getObject3DEngines();
    expect(res.online).toBe(true);
    expect(res.engines).toHaveLength(1);
    expect(res.quality_routing.standard?.estimated_seconds).toBe(60);
    expect(res.gpu_name).toBe("RTX 3080");
    expect(res.vram_total_gb).toBe(10);
  });

  it("submits reconstruction with defaults and strips a data: prefix", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ job_id: "rc_9", kind: "reconstruct", engine: "hunyuan3d_mini", estimated_seconds: 60, status: "queued", fallback_reason: null }, 202)
    );
    const res = await submitReconstruction({ image_base64: "data:image/png;base64,QUJD", quality: "standard" });
    expect(res.job_id).toBe("rc_9");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/jobs\/reconstruct$/);
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ image_base64: "QUJD", quality: "standard", engine: "auto", remove_background: true });
  });

  it("surfaces the server's { detail } on HTTP errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ detail: "image too small" }, 422));
    await expect(submitReconstruction({ image_base64: "QUJD", quality: "draft" })).rejects.toThrow(/\(HTTP 422\): image too small/);
  });

  it("requires exactly one of mesh_job_id / mesh_base64 for turntables", async () => {
    await expect(submitTurntable({})).rejects.toBeInstanceOf(Object3DServerError);
    await expect(submitTurntable({ mesh_job_id: "rc_1", mesh_base64: "AAA" })).rejects.toBeInstanceOf(Object3DServerError);
  });

  it("polls a job until complete and reports progress", async () => {
    const states = [
      job({ status: "queued", step: "queued", progress: 0 }),
      job({ status: "running", step: "reconstruction", progress: 0.45 }),
      job({ status: "complete", step: "done", progress: 1, files: { "mesh.glb": "/jobs/rc_1/files/mesh.glb" } }),
    ];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(states.shift()));
    const seen: number[] = [];
    const final = await waitForObject3DJob("rc_1", { pollMs: 1, onProgress: (j) => void seen.push(j.progress) });
    expect(final.status).toBe("complete");
    expect(seen).toEqual([0, 0.45, 1]);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/jobs\/rc_1$/);
  });

  it("tolerates transient poll errors but throws when the job fails", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse(job({ status: "failed", step: "reconstruction", error: "CUDA out of memory" })));
    await expect(waitForObject3DJob("rc_1", { pollMs: 1 })).rejects.toThrow(/CUDA out of memory/);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("aborts polling when onProgress throws (e.g. job cancelled)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(job({})));
    await expect(
      waitForObject3DJob("rc_1", {
        pollMs: 1,
        onProgress: () => {
          throw new Error("Job Cancelled");
        },
      })
    ).rejects.toThrow("Job Cancelled");
  });

  it("times out when the job never completes", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(job({})));
    await expect(waitForObject3DJob("rc_1", { pollMs: 5, timeoutMs: 20 })).rejects.toThrow(/Timed out/);
  });

  it("downloads job files as Buffers and 404s clearly", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(new Uint8Array([0x67, 0x6c, 0x54, 0x46]), { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ detail: "not produced" }, 404));
    const buf = await downloadObject3DFile("rc_1", "mesh.glb");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString("ascii")).toBe("glTF");
    await expect(downloadObject3DFile("rc_1", "preview.png")).rejects.toMatchObject({ status: 404 });
  });
});
