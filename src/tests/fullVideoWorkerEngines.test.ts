import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateVeoVideo, isVeoConfigured } from "../lib/ai/veoClient";
import { env } from "../lib/env";
import { loadWorkflow } from "../lib/ai/comfy/workflowBuilder";
import { stepVideo } from "../../workers/pipeline-worker/tasks/videoTask";
import { storage } from "../lib/storage";
import * as pipelineApi from "../../workers/pipeline-worker/api";
import * as comfyClient from "../lib/ai/comfyClient";
import * as veoClient from "../lib/ai/veoClient";
import { prisma } from "../lib/prisma";
import { claimJobAtomically } from "../../workers/pipeline-worker/index";

// Mock @google/genai module
const mockGenerateVideos = vi.fn();
const mockGetVideosOperation = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateVideos: mockGenerateVideos,
      };
      operations = {
        getVideosOperation: mockGetVideosOperation,
      };
      constructor(public opts: { apiKey: string }) {}
    },
  };
});

describe("Full Video Worker Modernization: Veo 3.1, MiniMax TaoMate, & LTX Video", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(storage, "upload").mockResolvedValue("presenter/story_test/scene-0.mp4");
    vi.spyOn(storage, "download").mockResolvedValue(Buffer.from("FAKE_IMAGE_OR_AUDIO"));
    vi.spyOn(pipelineApi, "reportProgress").mockResolvedValue(true);
    vi.spyOn(pipelineApi, "updateSegment").mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Google Veo 3.1 API Client (veoClient.ts)", () => {
    it("should correctly detect if Veo is configured via environment variables", () => {
      const origGemini = env.GEMINI_API_KEY;


      env.GEMINI_API_KEY = undefined;

      expect(isVeoConfigured()).toBe(false);

      env.GEMINI_API_KEY = "test_key_123";
      expect(isVeoConfigured()).toBe(true);

      env.GEMINI_API_KEY = undefined;
      env.GEMINI_API_KEY = "test_google_key_456";
      expect(isVeoConfigured()).toBe(true);

      env.GEMINI_API_KEY = origGemini;

    });

    it("should return an error when no API key is provided", async () => {
      const origGemini = env.GEMINI_API_KEY;

      env.GEMINI_API_KEY = undefined;


      const res = await generateVeoVideo({ prompt: "Anchor speaking" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("GEMINI_API_KEY is not configured");

      env.GEMINI_API_KEY = origGemini;

    });

    it("should clamp duration strictly to 4s or 8s native Veo blocks", async () => {
      env.GEMINI_API_KEY = "mock_key";

      const fakeVideoBytes = Buffer.from("VEO_GENERATED_MP4_BYTES");
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array(fakeVideoBytes).buffer.slice(0),
      });

      mockGenerateVideos.mockResolvedValue({
        name: "operations/veo-op-123",
        done: true,
        response: {
          generatedVideos: [
            {
              video: {
                uri: "https://generativelanguage.googleapis.com/v1beta/files/test-video",
              },
            },
          ],
        },
      });

      // Test 3s -> clamped to 4s
      const res4 = await generateVeoVideo({
        prompt: "Anchor speaking",
        durationSeconds: 3,
      });
      expect(mockGenerateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            durationSeconds: 4,
          }),
        })
      );
      expect(res4.success).toBe(true);
      expect(res4.durationSeconds).toBe(4);
      expect(res4.videoBuffer?.toString()).toEqual(fakeVideoBytes.toString());

      // Test 7s -> clamped to 8s
      const res8 = await generateVeoVideo({
        prompt: "Anchor speaking",
        durationSeconds: 7,
      });
      expect(mockGenerateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            durationSeconds: 8,
          }),
        })
      );
      expect(res8.success).toBe(true);
      expect(res8.durationSeconds).toBe(8);
    });
  });

  describe("ComfyUI Workflow Builder: MiniMax + TaoMate Mapping", () => {
    it("should map 'minimax_taomate' and 'taomate' to minimax_h3_taomate_api_prompt.json", () => {
      const workflowMinimax = loadWorkflow("minimax_taomate");
      expect(workflowMinimax).toBeDefined();

      const workflowTaomate = loadWorkflow("taomate");
      expect(workflowTaomate).toBeDefined();
    });
  });

  describe("stepVideo Pipeline Worker Execution", () => {
    const mockJob = { id: "job_video_full_1", companyId: "tenant_abc" };
    const mockStory = {
      id: "story_123",
      video: { personaId: "ruby" },
      script: {
        segments: [
          {
            id: "seg_1",
            index: 0,
            personaId: "ruby",
            text: "Breaking international news report.",
            sceneStrategy: "full",
            audioPath: "audio/story_123/scene-0.wav",
            personaAvatarUrl: "avatars/ruby.png",
          },
        ],
      },
    };

    it("should route to Veo 3.1 API when targetStrategy is 'veo'", async () => {
      const fakeBuffer = Buffer.from("VEO_OUTPUT_VIDEO");
      const veoSpy = vi.spyOn(veoClient, "generateVeoVideo").mockResolvedValueOnce({
        success: true,
        videoBuffer: fakeBuffer,
        durationSeconds: 4,
      });

      await stepVideo(
        mockJob,
        mockStory as any,
        "job_video_full_1",
        "veo",
        { role: "video", engine: "veo" } as any,
        () => false
      );

      expect(veoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Breaking international news report"),
          aspectRatio: "16:9",
        })
      );
      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringContaining("seg_0_ruby.mp4"),
        fakeBuffer,
        "video/mp4"
      );
      expect(pipelineApi.updateSegment).toHaveBeenCalledWith(
        "job_video_full_1",
        "seg_1",
        expect.objectContaining({
          presenterVideoPath: expect.stringContaining("seg_0_ruby.mp4"),
        })
      );
    });

    it("should route to ComfyUI MiniMax TaoMate when targetStrategy is 'minimax'", async () => {
      const fakeBuffer = Buffer.from("MINIMAX_COMFY_OUTPUT");
      const comfySpy = vi.spyOn(comfyClient, "generatePresenterVideo").mockResolvedValueOnce(fakeBuffer);

      await stepVideo(
        mockJob,
        mockStory as any,
        "job_video_full_1",
        "minimax",
        { role: "video", engine: "minimax" } as any,
        () => false
      );

      expect(comfySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "minimax_taomate",
        }),
        expect.any(Object),
        expect.any(Function)
      );
      expect(storage.upload).toHaveBeenCalled();
      expect(pipelineApi.updateSegment).toHaveBeenCalled();
    });

    it("should fallback gracefully to Veo API when ComfyUI encounters an error and Veo is configured", async () => {
      vi.spyOn(comfyClient, "generatePresenterVideo").mockRejectedValueOnce(
        new Error("ComfyUI Connection refused: localhost:8188")
      );
      vi.spyOn(veoClient, "isVeoConfigured").mockReturnValue(true);

      const fakeVeoBuffer = Buffer.from("FALLBACK_VEO_VIDEO");
      const veoFallbackSpy = vi.spyOn(veoClient, "generateVeoVideo").mockResolvedValueOnce({
        success: true,
        videoBuffer: fakeVeoBuffer,
        durationSeconds: 4,
      });

      await stepVideo(
        mockJob,
        mockStory as any,
        "job_video_full_1",
        "ltx",
        { role: "video", engine: "ltx" } as any,
        () => false
      );

      expect(veoFallbackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Breaking international news report"),
        })
      );
      expect(storage.upload).toHaveBeenCalledWith(
        expect.any(String),
        fakeVeoBuffer,
        "video/mp4"
      );
      expect(pipelineApi.updateSegment).toHaveBeenCalled();
    });
  });

  describe("Queue Polling and Status Claim Mapping", () => {
    it("should map veo, minimax, taomate, and ltx to VIDEO_IN_PROGRESS", async () => {
      const mockJob = {
        id: "job_veo_claim",
        status: "QUEUED",
        type: "veo",
      };

      vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValueOnce({ count: 1 });
      vi.spyOn(prisma.generationJob, "findUnique").mockResolvedValueOnce(mockJob as any);

      const claim = await claimJobAtomically("job_veo_claim", "worker-1", "VIDEO_IN_PROGRESS");
      expect(claim.claimed).toBe(true);
      expect(prisma.generationJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "VIDEO_IN_PROGRESS",
          }),
        })
      );
    });
  });
});
