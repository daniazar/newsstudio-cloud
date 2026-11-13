/**
 * Unit tests for the pure helpers behind useTurntable3DJob (3D Product Turntable UI).
 */

import { describe, it, expect } from "vitest";
import type { ExtractedProductAsset } from "@/lib/types/ecommerce";
import type { Product3DAssetDTO, Turntable3DEnginesResponse } from "@/lib/types/turntable3d";
import { TURNTABLE_3D_RENDER_ESTIMATE_SECONDS } from "@/lib/types/turntable3d";
import {
  TURNTABLE_3D_PROGRESS_STEPS,
  canUseInScene,
  computeTurntable3DProgress,
  extractApiError,
  findAssetForSceneVideo,
  formatDurationMs,
  formatEstimatedSeconds,
  resolveActiveStepIndex,
  getSceneVideoUrl,
  getStepViews,
  isTerminalAssetStatus,
  normalizeTurntable3DStep,
  pickDefaultSourceAsset,
  pickQuality,
  resolveQualityOptions,
  sortRevisions,
} from "../useTurntable3DJob";

function makeAsset(overrides: Partial<Product3DAssetDTO> = {}): Product3DAssetDTO {
  return {
    id: "a1",
    campaignId: "camp_1",
    status: "PENDING",
    engine: "hunyuan3d_mini",
    quality: "standard",
    background: "transparent",
    cameraPreset: "product_three_quarter",
    frames: 120,
    fps: 30,
    width: 1080,
    height: 1080,
    meshUrl: null,
    turntableUrl: null,
    turntableMp4Url: null,
    previewUrl: null,
    contactSheetUrl: null,
    inferenceMs: null,
    vertexCount: null,
    textureSize: null,
    errorLog: null,
    createdAt: "2026-09-12T10:00:00.000Z",
    updatedAt: "2026-09-12T10:00:00.000Z",
    job: null,
    ...overrides,
  };
}

const ENGINES_ONLINE: Turntable3DEnginesResponse = {
  online: true,
  gpu_name: "NVIDIA GeForce RTX 3080",
  vram_total_gb: 10,
  engines: [
    { name: "instantmesh", label: "InstantMesh", status: "online", textured: true, min_vram_gb: 7, licence: "apache-2.0", gated: false },
    { name: "hunyuan3d_mini", label: "Hunyuan3D-2 mini", status: "online", textured: true, min_vram_gb: 6, licence: "tencent", gated: false },
    { name: "trellis", label: "TRELLIS", status: "offline", textured: true, min_vram_gb: 16, licence: "mit", gated: false },
  ],
  quality_routing: {
    draft: { engine: "instantmesh", estimated_seconds: 30, available: true },
    standard: { engine: "hunyuan3d_mini", estimated_seconds: 60, available: true },
    premium: { engine: "trellis", estimated_seconds: 120, available: false, fallback: "hunyuan3d_mini", reason: "requires 16 GB VRAM" },
  },
};

describe("step normalization", () => {
  it("accepts known steps case-insensitively and rejects unknown ones", () => {
    expect(normalizeTurntable3DStep("reconstruction")).toBe("reconstruction");
    expect(normalizeTurntable3DStep(" Turntable_Render ")).toBe("turntable_render");
    expect(normalizeTurntable3DStep("warming_up")).toBeNull();
    expect(normalizeTurntable3DStep(null)).toBeNull();
    expect(normalizeTurntable3DStep("")).toBeNull();
  });

  it("maps internal steps onto the visible checklist rows", () => {
    const idx = (s: string) => TURNTABLE_3D_PROGRESS_STEPS.indexOf(s as (typeof TURNTABLE_3D_PROGRESS_STEPS)[number]);
    expect(resolveActiveStepIndex("queued", "PENDING")).toBe(-1);
    expect(resolveActiveStepIndex("bg_removal", "RECONSTRUCTING")).toBe(0);
    expect(resolveActiveStepIndex("preview", "RECONSTRUCTING")).toBe(idx("normalization"));
    expect(resolveActiveStepIndex("encode", "RENDERING")).toBe(idx("turntable_render"));
    expect(resolveActiveStepIndex("upload", "READY")).toBe(TURNTABLE_3D_PROGRESS_STEPS.length);
  });

  it("never moves backwards on the worker's mesh-upload / turntable-queued steps", () => {
    const idx = (s: string) => TURNTABLE_3D_PROGRESS_STEPS.indexOf(s as (typeof TURNTABLE_3D_PROGRESS_STEPS)[number]);
    // Mesh upload (55–60 %) while still RECONSTRUCTING belongs to normalization.
    expect(resolveActiveStepIndex("upload", "RECONSTRUCTING", { progress: 0.55 })).toBe(idx("normalization"));
    // Mesh persisted, asset flipped to RENDERING, turntable job still queued on the server.
    expect(resolveActiveStepIndex("upload", "RENDERING", { progress: 0.6, hasMesh: true })).toBe(idx("turntable_render"));
    expect(resolveActiveStepIndex("queued", "RENDERING", { progress: 0.6, hasMesh: true })).toBe(idx("turntable_render"));
    // Final upload.
    expect(resolveActiveStepIndex("upload", "RENDERING", { progress: 0.92, hasMesh: true })).toBe(idx("upload"));
    // Re-render queued (render route flips status before the worker claims the job).
    expect(resolveActiveStepIndex(null, "RENDERING", { hasMesh: true })).toBe(idx("turntable_render"));
  });

  it("identifies terminal statuses", () => {
    expect(isTerminalAssetStatus("READY")).toBe(true);
    expect(isTerminalAssetStatus("FAILED")).toBe(true);
    expect(isTerminalAssetStatus("RENDERING")).toBe(false);
    expect(isTerminalAssetStatus(undefined)).toBe(false);
  });
});

describe("getStepViews", () => {
  it("shows the PRD checklist in order", () => {
    const views = getStepViews(null, "PENDING");
    expect(views.map((v) => v.step)).toEqual(["bg_removal", "reconstruction", "normalization", "turntable_render", "upload"]);
    expect(views.every((v) => v.state === "pending")).toBe(true);
    expect(views[1].label).toBe("3D reconstruction");
  });

  it("marks earlier steps done and the current one active", () => {
    const views = getStepViews("reconstruction", "RECONSTRUCTING");
    expect(views.map((v) => v.state)).toEqual(["done", "active", "pending", "pending", "pending"]);
  });

  it("treats a re-render (starting at encode) as reconstruction already done", () => {
    const views = getStepViews("encode", "RENDERING");
    expect(views.map((v) => v.state)).toEqual(["done", "done", "done", "active", "pending"]);
  });

  it("falls back to the asset status when no step is reported", () => {
    expect(getStepViews(null, "RENDERING").find((v) => v.state === "active")?.step).toBe("turntable_render");
    expect(getStepViews(null, "RECONSTRUCTING").find((v) => v.state === "active")?.step).toBe("bg_removal");
  });

  it("marks everything done when READY", () => {
    expect(getStepViews("upload", "READY").every((v) => v.state === "done")).toBe(true);
  });

  it("flags the failing step on FAILED", () => {
    const views = getStepViews("normalization", "FAILED");
    expect(views.map((v) => v.state)).toEqual(["done", "done", "failed", "pending", "pending"]);
    expect(getStepViews(null, "FAILED")[0].state).toBe("failed");
    // A failure after the mesh exists is a render failure.
    expect(getStepViews("queued", "FAILED", { hasMesh: true }).map((v) => v.state)).toEqual([
      "done",
      "done",
      "done",
      "failed",
      "pending",
    ]);
  });
});

describe("computeTurntable3DProgress", () => {
  it("prefers worker doneSteps/totalSteps", () => {
    const asset = makeAsset({
      status: "RECONSTRUCTING",
      job: { id: "j", status: "PROCESSING", currentStep: "reconstruction", doneSteps: 2, totalSteps: 8 },
    });
    expect(computeTurntable3DProgress(asset)).toBe(0.25);
  });

  it("derives progress from the step when totals are missing and clamps", () => {
    const asset = makeAsset({
      status: "RENDERING",
      job: { id: "j", status: "PROCESSING", currentStep: "done", doneSteps: 0, totalSteps: 0 },
    });
    expect(computeTurntable3DProgress(asset)).toBe(1);
    expect(
      computeTurntable3DProgress(makeAsset({ job: { id: "j", status: "x", currentStep: "queued", doneSteps: 0, totalSteps: 0 } }))
    ).toBe(0);
    expect(
      computeTurntable3DProgress(makeAsset({ job: { id: "j", status: "x", currentStep: null, doneSteps: 9, totalSteps: 3 } }))
    ).toBe(1);
  });

  it("is 1 when READY and 0 without an asset", () => {
    expect(computeTurntable3DProgress(makeAsset({ status: "READY" }))).toBe(1);
    expect(computeTurntable3DProgress(null)).toBe(0);
  });
});

describe("formatting", () => {
  it("formats estimates", () => {
    expect(formatEstimatedSeconds(30)).toBe("~30s");
    expect(formatEstimatedSeconds(140)).toBe("~2m");
    expect(formatEstimatedSeconds(0)).toBe("—");
    expect(formatEstimatedSeconds(null)).toBe("—");
  });

  it("formats durations", () => {
    expect(formatDurationMs(820)).toBe("820ms");
    expect(formatDurationMs(41200)).toBe("41.2s");
    expect(formatDurationMs(null)).toBe("—");
  });

  it("extracts API error messages", () => {
    expect(extractApiError({ error: "Service offline" }, "x")).toBe("Service offline");
    expect(extractApiError({ detail: "Bad image" }, "x")).toBe("Bad image");
    expect(extractApiError(null, "fallback")).toBe("fallback");
    expect(extractApiError({ error: "" }, "fallback")).toBe("fallback");
  });
});

describe("resolveQualityOptions", () => {
  it("merges live routing with engine metadata", () => {
    const options = resolveQualityOptions(ENGINES_ONLINE);
    expect(options.map((o) => o.value)).toEqual(["draft", "standard", "premium", "ultra"]);

    const standard = options[1];
    expect(standard.engineLabel).toBe("Hunyuan3D-2 mini");
    expect(standard.vramGb).toBe(6);
    expect(standard.available).toBe(true);
    expect(standard.estimatedSeconds).toBe(60 + TURNTABLE_3D_RENDER_ESTIMATE_SECONDS);

    const premium = options[2];
    expect(premium.available).toBe(false);
    expect(premium.reason).toBe("requires 16 GB VRAM");
    expect(premium.fallbackEngine).toBe("hunyuan3d_mini");
    expect(premium.fallbackLabel).toBe("Hunyuan3D-2 mini");
    expect(premium.vramGb).toBe(16);
  });

  it("marks every tier unavailable when offline or unknown", () => {
    const offline = resolveQualityOptions({ online: false, engines: [], quality_routing: {}, error: "ECONNREFUSED" });
    expect(offline.every((o) => !o.available)).toBe(true);
    expect(offline[0].reason).toBe("3D service offline");
    expect(resolveQualityOptions(undefined).every((o) => !o.available)).toBe(true);
  });

  it("keeps an available preferred tier and otherwise picks the first available", () => {
    const options = resolveQualityOptions(ENGINES_ONLINE);
    expect(pickQuality(options, "standard")).toBe("standard");
    expect(pickQuality(options, "premium")).toBe("draft");
    const offline = resolveQualityOptions(undefined);
    expect(pickQuality(offline, "premium")).toBe("premium");
  });
});

describe("source & scene helpers", () => {
  const assets: ExtractedProductAsset[] = [
    { id: "l1", url: "https://x/lifestyle.jpg", type: "lifestyle_context" },
    { id: "p0", url: "", type: "hero_packshot", isPrimary: true },
    { id: "h1", url: "https://x/hero.jpg", type: "hero_packshot" },
    { id: "h2", url: "https://x/hero-primary.jpg", type: "hero_packshot", isPrimary: true },
  ];

  it("picks the primary hero packshot with a URL", () => {
    expect(pickDefaultSourceAsset(assets)?.id).toBe("h2");
    expect(pickDefaultSourceAsset(assets.slice(0, 3))?.id).toBe("h1");
    expect(pickDefaultSourceAsset([assets[0]])?.id).toBe("l1");
    expect(pickDefaultSourceAsset([])).toBeNull();
    expect(pickDefaultSourceAsset(undefined)).toBeNull();
  });

  it("prefers the alpha WebM over the MP4 for the scene", () => {
    expect(getSceneVideoUrl(makeAsset({ turntableUrl: "a.webm", turntableMp4Url: "a.mp4" }))).toBe("a.webm");
    expect(getSceneVideoUrl(makeAsset({ turntableMp4Url: "a.mp4" }))).toBe("a.mp4");
    expect(getSceneVideoUrl(null)).toBeNull();
  });

  it("only allows READY assets with a video into the scene", () => {
    expect(canUseInScene(makeAsset({ status: "READY", turntableUrl: "a.webm" }))).toBe(true);
    expect(canUseInScene(makeAsset({ status: "READY" }))).toBe(false);
    expect(canUseInScene(makeAsset({ status: "RENDERING", turntableUrl: "a.webm" }))).toBe(false);
  });

  it("finds the revision assigned to the scene and sorts revisions newest first", () => {
    const older = makeAsset({ id: "old", createdAt: "2026-09-10T00:00:00.000Z", turntableUrl: "old.webm" });
    const newer = makeAsset({ id: "new", createdAt: "2026-09-12T00:00:00.000Z", turntableMp4Url: "new.mp4" });
    expect(findAssetForSceneVideo([older, newer], "new.mp4")?.id).toBe("new");
    expect(findAssetForSceneVideo([older, newer], "missing.webm")).toBeNull();
    expect(findAssetForSceneVideo([older, newer], undefined)).toBeNull();
    expect(sortRevisions([older, newer]).map((a) => a.id)).toEqual(["new", "old"]);
  });
});
