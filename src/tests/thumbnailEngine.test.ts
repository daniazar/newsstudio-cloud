/**
 * src/tests/thumbnailEngine.test.ts
 *
 * Test Suite for Docker-Ready Thumbnail Engine & Decoupled ComfyUI Pipeline:
 * - Dynamic HTTP endpoint configuration (COMFYUI_URL)
 * - Broadcast-safe prompt filtering (Zero NSFW)
 * - 16:9 (YouTube) and 9:16 (TikTok/Shorts) negative space layouts
 * - High-CTR hook presets and CTR prediction scoring
 * - Web Thumbnail Generator API route (/api/tools/thumbnail/generate)
 * - Pipeline Worker decoupled image/thumbnail handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  HOOK_PRESETS,
  DEFAULT_NEGATIVE_PROMPT,
  sanitizeBroadcastPrompt,
  calculatePredictedCtr,
  buildBroadcastCleanThumbnailPrompt,
  executeThumbnailGeneration,
  resolvePersonaAvatarRef,
} from "../lib/thumbnail/thumbnailEngine";
import { getComfyUIUrl, getWsUrl, checkComfyUIHealth } from "../lib/ai/comfy/api";
import { PERSONAS, getPersonaById } from "../lib/tts/personas";
import * as imageGenModule from "../lib/ai/comfy/imageGen";
import { handleImageGeneration, handleThumbnailGeneration } from "../../workers/pipeline-worker/handlers/imageGeneration";
import { storage } from "../lib/storage";
import * as pipelineApi from "../../workers/pipeline-worker/api";
import { GET, POST } from "../app/api/tools/thumbnail/generate/route";
import { NextRequest } from "next/server";

describe("Stream 4: Docker-Ready Decoupled Thumbnail Engine & Image Worker Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    vi.spyOn(storage, "upload").mockResolvedValue("tenants/company_test/thumbnails/story_1/test_thumb.png");
    vi.spyOn(storage, "download").mockResolvedValue(Buffer.from("FAKE_IMAGE_BYTES"));
    vi.spyOn(pipelineApi, "reportProgress").mockResolvedValue(true);
    vi.spyOn(imageGenModule, "generatePresenterImage").mockResolvedValue(Buffer.from("FAKE_PNG_OUTPUT_BYTES"));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Docker-Ready Decoupled Architecture & Dynamic Endpoints
  // ─────────────────────────────────────────────────────────────────────────
  describe("1. Dynamic Decoupled ComfyUI Endpoints", () => {
    it("should dynamically resolve COMFYUI_URL from environment variables", () => {
      process.env.COMFYUI_URL = "http://comfyui-docker:8188";
      expect(getComfyUIUrl()).toBe("http://comfyui-docker:8188");
      expect(getWsUrl()).toBe("ws://comfyui-docker:8188");
    });

    it("should fall back to localhost:8188 when environment variable is undefined", () => {
      delete process.env.COMFYUI_URL;
      delete process.env.NEXT_PUBLIC_COMFYUI_URL;
      expect(getComfyUIUrl()).toBe("http://localhost:8188");
      expect(getWsUrl()).toBe("ws://localhost:8188");
    });

    it("should correctly support Azure VM or custom cloud IP endpoints", () => {
      process.env.COMFYUI_URL = "http://10.0.4.12:8188";
      expect(getComfyUIUrl()).toBe("http://10.0.4.12:8188");
      expect(getWsUrl()).toBe("ws://10.0.4.12:8188");
    });

    it("should verify health check against dynamic ComfyUI endpoint", async () => {
      process.env.COMFYUI_URL = "http://comfy-remote:8188";
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ system: { os: "linux" } }),
      } as any);

      const isHealthy = await checkComfyUIHealth();

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://comfy-remote:8188/system_stats",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(isHealthy).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Clean Broadcast-Safe Prompt Filtering (Zero NSFW)
  // ─────────────────────────────────────────────────────────────────────────
  describe("2. Broadcast-Safe Prompt Filtering & Quality Assurance", () => {
    it("should sanitize and remove all NSFW and explicit tokens from text", () => {
      const dirtyPrompt = "A shocking news story with nude naked breasts and vulgarity in the market";
      const clean = sanitizeBroadcastPrompt(dirtyPrompt);

      expect(clean).not.toMatch(/\bnude\b/i);
      expect(clean).not.toMatch(/\bnaked\b/i);
      expect(clean).not.toMatch(/\bbreasts\b/i);
      expect(clean).toContain("A shocking news story with and in the market");
    });

    it("should enforce production-clean negative prompt baseline", () => {
      expect(DEFAULT_NEGATIVE_PROMPT).toContain("nsfw");
      expect(DEFAULT_NEGATIVE_PROMPT).toContain("bad anatomy");
      expect(DEFAULT_NEGATIVE_PROMPT).toContain("blurry");
      expect(DEFAULT_NEGATIVE_PROMPT).toContain("3d render");
    });

    it("should compile broadcast studio quality keywords into the prompt", () => {
      const persona = getPersonaById("ruby") || PERSONAS[0];
      const compiled = buildBroadcastCleanThumbnailPrompt({
        persona,
        hookPresetKey: "breaking_shock",
        headline: "MAJOR TECH BREAKTHROUGH ANNOUNCED",
        aspectRatio: "16:9",
        textPosition: "left",
      });

      expect(compiled.prompt).toContain("8k ultra-sharp detail");
      expect(compiled.prompt).toContain("Hasselblad H6D-100c");
      expect(compiled.prompt).toContain("broadcast television standard");
      expect(compiled.prompt).toContain("Ruby Vance");
      expect(compiled.prompt).toContain("MAJOR TECH BREAKTHROUGH ANNOUNCED");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Aspect Ratios & Negative Space Layouts
  // ─────────────────────────────────────────────────────────────────────────
  describe("3. Aspect Ratios (16:9 YouTube vs 9:16 Shorts/TikTok)", () => {
    it("should format 16:9 Widescreen layout with anchor on RIGHT and negative space on LEFT", () => {
      const persona = getPersonaById("blaze") || PERSONAS[0];
      const compiled = buildBroadcastCleanThumbnailPrompt({
        persona,
        hookPresetKey: "bullish_triumph",
        headline: "CRYPTO SURGES PAST ALL-TIME HIGHS",
        aspectRatio: "16:9",
        textPosition: "left",
      });

      expect(compiled.width).toBe(1280);
      expect(compiled.height).toBe(720);
      expect(compiled.prompt).toContain("positioned on the far RIGHT side of the frame");
      expect(compiled.prompt).toContain("The entire LEFT side of the 16:9 frame features clean, high-contrast dark negative space");
    });

    it("should format 9:16 Vertical layout with anchor on LEFT and negative space on RIGHT", () => {
      const persona = getPersonaById("isabel") || PERSONAS[0];
      const compiled = buildBroadcastCleanThumbnailPrompt({
        persona,
        hookPresetKey: "secret_mystery",
        headline: "EL SECRETO DETRAS DEL EXITO",
        aspectRatio: "9:16",
        textPosition: "right",
      });

      expect(compiled.width).toBe(768);
      expect(compiled.height).toBe(1344);
      expect(compiled.prompt).toContain("positioned on the far LEFT side of the frame");
      expect(compiled.prompt).toContain("The entire RIGHT side of the 9:16 frame features clean, high-contrast dark negative space");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Emotional Hook Presets & CTR Prediction Algorithm
  // ─────────────────────────────────────────────────────────────────────────
  describe("4. Emotional Hook Presets & CTR Prediction Scoring", () => {
    it("should contain 6 high-converting hook archetypes", () => {
      expect(HOOK_PRESETS).toHaveLength(6);
      const hookIds = HOOK_PRESETS.map((h) => h.id);
      expect(hookIds).toContain("breaking_shock");
      expect(hookIds).toContain("secret_mystery");
      expect(hookIds).toContain("bullish_triumph");
      expect(hookIds).toContain("dire_warning");
      expect(hookIds).toContain("skeptical_disbelief");
      expect(hookIds).toContain("tech_futurism");
    });

    it("should calculate higher predicted CTR for compelling concise headlines and badges", () => {
      const ctrFull = calculatePredictedCtr({
        headline: "NVIDIA REVEALS NEXT-GEN QUANTUM AI CHIP",
        hookId: "breaking_shock",
        badgeText: "EMERGENCY",
        subtext: "Quarterly report exposes surge",
        textPosition: "left",
        aspectRatio: "16:9",
      });

      const ctrBasic = calculatePredictedCtr({
        headline: "News update",
        hookId: "skeptical_disbelief",
      });

      expect(ctrFull).toBeGreaterThan(ctrBasic);
      expect(ctrFull).toBeGreaterThanOrEqual(12.0);
      expect(ctrFull).toBeLessThanOrEqual(18.5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Web Thumbnail Generator API Route Handler
  // ─────────────────────────────────────────────────────────────────────────
  describe("5. Thumbnail Generator API Route (/api/tools/thumbnail/generate)", () => {
    it("should return catalog presets and personas on GET request", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.hookPresets).toHaveLength(6);
      expect(data.availablePersonas.length).toBeGreaterThan(5);
      expect(data.aspectRatios).toEqual(["16:9", "9:16"]);
      expect(data.defaultSetup.personaId).toBe("ruby");
    });

    it("should handle POST request and synthesize thumbnail data", async () => {
      const req = new NextRequest("http://localhost:3000/api/tools/thumbnail/generate", {
        method: "POST",
        body: JSON.stringify({
          personaId: "ruby",
          hookPresetKey: "breaking_shock",
          headline: "QUANTUM BREAKTHROUGH DISRUPTS MARKETS",
          badgeText: "BREAKING",
          aspectRatio: "16:9",
          textPosition: "left",
          dryRun: true,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.persona.id).toBe("ruby");
      expect(data.aspectRatio).toBe("16:9");
      expect(data.predictedCtr).toBeGreaterThan(10);
      expect(data.prompt).toContain("QUANTUM BREAKTHROUGH DISRUPTS MARKETS");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Pipeline Worker Decoupled Image Generation Handler
  // ─────────────────────────────────────────────────────────────────────────
  describe("6. Pipeline Worker Decoupled Image Handler", () => {
    it("should execute handleImageGeneration and upload to tenant-scoped storage key", async () => {
      const result = await handleImageGeneration({
        jobId: "job_thumb_001",
        companyId: "org_alpha",
        storyId: "story_999",
        prompt: "Ruby Vance live from modern news desk",
        personaId: "ruby",
        aspectRatio: "16:9",
        seed: 424242,
      });

      expect(result.success).toBe(true);
      expect(result.imageStorageKey).toContain("tenants/org_alpha/thumbnails/story_999/");
      expect(result.seed).toBe(424242);
      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringContaining("tenants/org_alpha/thumbnails/story_999/"),
        expect.any(Buffer),
        "image/png"
      );
    });

    it("should execute handleThumbnailGeneration with compiled broadcast prompt", async () => {
      const result = await handleThumbnailGeneration({
        jobId: "job_thumb_002",
        companyId: "org_beta",
        storyId: "story_888",
        personaId: "blaze",
        hookPresetKey: "bullish_triumph",
        headline: "ENTERPRISE ADOPTION 10X SURGE",
        badgeText: "RECORD",
        aspectRatio: "16:9",
      });

      expect(result.success).toBe(true);
      expect(result.prompt).toContain("Blaze Wilder");
      expect(result.prompt).toContain("ENTERPRISE ADOPTION 10X SURGE");
    });

    it("should resolve persona avatar reference file path", () => {
      const refPath = resolvePersonaAvatarRef("ruby");
      expect(refPath).toBeDefined();
      expect(typeof refPath).toBe("string");
      expect(refPath).toMatch(/ruby(_ref)?\.png/);
    });
  });
});
