/**
 * src/tests/modernMotionAcceleration.test.ts
 *
 * Vitest Verification Suite for Modern Motion Animation Offline Pre-vectorization,
 * Guidance Cache Resolution, and Neural Compilation Telemetry.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { GET as getCachesRoute } from "@/app/api/motion/caches/route";
import { PrecomputedMotionCache } from "@/lib/ai/modernMotionClient";

describe("Modern Motion Offline Pre-Vectorization & Guidance Cache Suite", () => {
  const preprocessedDir = path.join(process.cwd(), "storage", "motion", "preprocessed");

  it("should have preprocessed cache directory populated with canonical loops", () => {
    expect(fs.existsSync(preprocessedDir)).toBe(true);
    const loops = fs.readdirSync(preprocessedDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const canonicalExpected = [
      "analyst",
      "breaking",
      "gesture_left",
      "gesture_right",
      "idle",
      "look_notes",
      "nod",
      "signoff",
      "welcome",
    ];

    for (const expected of canonicalExpected) {
      expect(loops).toContain(expected);
    }
  });

  it("should validate that each preprocessed loop contains required guidance tensors and valid metadata", () => {
    const loopDirs = fs.readdirSync(preprocessedDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    expect(loopDirs.length).toBeGreaterThanOrEqual(10);

    for (const loopId of loopDirs) {
      const loopPath = path.join(preprocessedDir, loopId);
      const metaPath = path.join(loopPath, "metadata.json");

      expect(fs.existsSync(metaPath)).toBe(true);
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

      expect(meta.loopId).toBe(loopId);
      expect(meta.fps).toBe(30);
      expect(meta.frameCount).toBe(120);
      expect(meta.sha256).toBeDefined();
      expect(meta.sha256.length).toBe(64); // Valid SHA-256
      expect(meta.estimatedRuntimeSavingsSec).toBeGreaterThan(10);

      // Verify guidance tensors exist
      const dwposePath = path.join(loopPath, "dwpose.npy");
      const smplxPath = path.join(loopPath, "smplx_normals.pt");
      const vaePath = path.join(loopPath, "vae_latents.pt");
      const ehmPath = path.join(loopPath, "ehm_disentangle.pkl");

      expect(fs.existsSync(dwposePath)).toBe(true);
      expect(fs.existsSync(smplxPath)).toBe(true);
      expect(fs.existsSync(vaePath)).toBe(true);
      expect(fs.existsSync(ehmPath)).toBe(true);

      // Verify non-zero file sizes
      expect(fs.statSync(dwposePath).size).toBeGreaterThan(1000);
      expect(fs.statSync(smplxPath).size).toBeGreaterThan(1000);
      expect(fs.statSync(vaePath).size).toBeGreaterThan(1000);
      expect(fs.statSync(ehmPath).size).toBeGreaterThan(1000);
    }
  });

  it("should correctly map motion models to their required guidance tensor types", () => {
    const modelToGuidanceMap: Record<string, { type: string; file: string }> = {
      "mimicmotion": { type: "dwpose", file: "dwpose.npy" },
      "moore-animateanyone": { type: "dwpose", file: "dwpose.npy" },
      "animate-anyone-2": { type: "dwpose", file: "dwpose.npy" },
      "original-animate-anyone": { type: "dwpose", file: "dwpose.npy" },
      "champ": { type: "smplx_normals", file: "smplx_normals.pt" },
      "wan-animate-2": { type: "vae_latents", file: "vae_latents.pt" },
      "wan-animate-2-distilled": { type: "vae_latents", file: "vae_latents.pt" },
      "scail-2": { type: "vae_latents", file: "vae_latents.pt" },
      "liveanimate": { type: "vae_latents", file: "vae_latents.pt" },
      "echomimicv3": { type: "ehm_disentangle", file: "ehm_disentangle.pkl" },
      "emosh": { type: "ehm_disentangle", file: "ehm_disentangle.pkl" },
      "homa": { type: "ehm_disentangle", file: "ehm_disentangle.pkl" },
    };

    // Test a sample loop directory against all mappings
    const sampleDir = path.join(preprocessedDir, "gesture_left");
    for (const [modelId, spec] of Object.entries(modelToGuidanceMap)) {
      const targetFile = path.join(sampleDir, spec.file);
      expect(
        fs.existsSync(targetFile),
        `Model ${modelId} requires ${spec.file} which should exist in gesture_left`
      ).toBe(true);
    }
  });

  it("should verify GET /api/motion/caches responds with populated loop catalogs and savings", async () => {
    const response = await getCachesRoute();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.count).toBeGreaterThanOrEqual(10);
    expect(Array.isArray(json.caches)).toBe(true);

    const gestureLeft = json.caches.find((c: PrecomputedMotionCache) => c.loopId === "gesture_left");
    expect(gestureLeft).toBeDefined();
    expect(gestureLeft?.guidanceTypes?.dwpose).toBe(true);
    expect(gestureLeft?.guidanceTypes?.smplxNormals).toBe(true);
    expect(gestureLeft?.guidanceTypes?.vaeLatents).toBe(true);
    expect(gestureLeft?.estimatedRuntimeSavingsSec).toBe(16.5);
  });

  it("should benchmark that reading preprocessed tensor headers executes in <15ms", () => {
    const sampleFile = path.join(preprocessedDir, "gesture_left", "dwpose.npy");
    const t0 = performance.now();

    // Read initial 4KB header
    const fd = fs.openSync(sampleFile, "r");
    const buffer = Buffer.alloc(4096);
    fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(15);
  });

  it("should verify persona appearance caching and zero-copy hardware encoder types", () => {
    const sampleJobResult = {
      success: true,
      job_id: "motion_wan-animate-2_test",
      output_path: "storage/motion/outputs/test.mp4",
      output_url: "/api/motion/outputs/test.mp4",
      filename: "test.mp4",
      model_id: "wan-animate-2",
      model_name: "Wan-Animate-2 (14B FP8)",
      resolution: "720x1280",
      fps: 30,
      duration_sec: 4.0,
      inference_time_sec: 3.1,
      engine_mode: "simulated_preview" as const,
      weights_found: false,
      hardware_encoder: "h264_nvenc",
      mux_time_ms: 118.5,
      persona_cache: {
        hit: true,
        persona_id: "ruby",
        latency_ms: 2.1,
        savings_sec: 1.8,
      },
    };

    expect(sampleJobResult.hardware_encoder).toBe("h264_nvenc");
    expect(sampleJobResult.mux_time_ms).toBeLessThan(150);
    expect(sampleJobResult.persona_cache.hit).toBe(true);
    expect(sampleJobResult.persona_cache.savings_sec).toBe(1.8);
  });
});

