import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { claimJobAtomically } from "../../workers/pipeline-worker/index";
import { stepTTS, stepRecalibrateTiming } from "../../workers/pipeline-worker/tasks/audioTask";
import { stepVideo, resolveActionLoopVideo } from "../../workers/pipeline-worker/tasks/videoTask";
import { monitorComfyUIWatchdog } from "../lib/ai/comfy/comfyWatchdog";
import { generateKey, withTenant, storage } from "../lib/storage";
import { prisma } from "../lib/prisma";
import * as modernTtsClient from "../lib/tts/modernTtsClient";
import * as musetalkClient from "../lib/ai/musetalkClient";
import * as talkingHeadsClient from "../lib/ai/talkingHeadsClient";
import * as pipelineApi from "../../workers/pipeline-worker/api";

describe("Worker 5: Pipeline Worker Modernization & Architecture Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(storage, "upload").mockResolvedValue("mocked_uploaded_key");
    vi.spyOn(storage, "download").mockResolvedValue(Buffer.from("RIFF_WAVE_AUDIO_TEST"));
    vi.spyOn(pipelineApi, "reportProgress").mockResolvedValue(true);
    vi.spyOn(pipelineApi, "updateSegment").mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Atomic Job Claiming & Multi-Worker Safety Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 3: Atomic Job Claiming & Multi-Worker Safety", () => {
    it("should atomically claim a QUEUED job using Prisma conditional update", async () => {
      const mockJob = {
        id: "job_test_atomic_1",
        status: "IN_PROGRESS",
        workerId: "worker-alpha",
        type: "full",
        storyId: "story_123",
        companyId: "org_tenant_abc",
      };

      vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValueOnce({ count: 1 });
      vi.spyOn(prisma.generationJob, "findUnique").mockResolvedValueOnce(mockJob as any);

      const claim = await claimJobAtomically("job_test_atomic_1", "worker-alpha");

      expect(prisma.generationJob.updateMany).toHaveBeenCalledWith({
        where: { id: "job_test_atomic_1", status: "QUEUED" },
        data: {
          status: "IN_PROGRESS",
          workerId: "worker-alpha",
          startedAt: expect.any(Date),
        },
      });
      expect(claim.claimed).toBe(true);
      expect(claim.job?.workerId).toBe("worker-alpha");
    });

    it("should reject claim (claimed = false) if job was already claimed by another worker", async () => {
      vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValueOnce({ count: 0 });

      const claim = await claimJobAtomically("job_test_atomic_1", "worker-beta");

      expect(claim.claimed).toBe(false);
      expect(claim.job).toBeUndefined();
    });

    it("should guarantee zero duplicate processing when two parallel workers claim simultaneously", async () => {
      vi.spyOn(prisma.generationJob, "updateMany")
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      vi.spyOn(prisma.generationJob, "findUnique").mockResolvedValueOnce({
        id: "job_race_1",
        status: "IN_PROGRESS",
        workerId: "worker-1",
      } as any);

      const claim1 = await claimJobAtomically("job_race_1", "worker-1");
      const claim2 = await claimJobAtomically("job_race_1", "worker-2");

      expect(claim1.claimed).toBe(true);
      expect(claim2.claimed).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Audio Task Modernization Tests (Modern-TTS-Server :8005)
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 1: Audio Task Modernization (Modern-TTS-Server :8005)", () => {
    it("should route audio synthesis directly through Modern-TTS-Server via generateAudioWithModernTts", async () => {
      const fakeAudioBuffer = Buffer.from("RIFF_WAVE_AUDIO_TEST");
      const generateSpy = vi.spyOn(modernTtsClient, "generateAudioWithModernTts").mockResolvedValueOnce(fakeAudioBuffer as any);

      const job = { id: "job_audio_1", companyId: "org_tenant_xyz" };
      const story = {
        id: "story_audio_100",
        script: {
          segments: [
            {
              id: "seg_01",
              index: 0,
              personaId: "ruby",
              text: "Bienvenidos a las noticias de tecnología.",
              language: "es",
              cadencePreset: "standard_anchor",
            },
          ],
        },
      };

      const durations = await stepTTS(job, story, undefined, "job_audio_1", () => false);

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(durations).toHaveLength(1);
      expect(durations[0].id).toBe("seg_01");
    });

    it("should honor job-level voice and tier configuration (e.g., Diego + tier2/f5_tts)", async () => {
      const fakeAudioBuffer = Buffer.from("RIFF_WAVE_AUDIO_TEST");
      const generateSpy = vi.spyOn(modernTtsClient, "generateAudioWithModernTts").mockResolvedValueOnce(fakeAudioBuffer as any);

      const job = {
        id: "job_audio_diego",
        companyId: "org_tenant_xyz",
        config: JSON.stringify({
          personaId: "diego",
          tier: "tier2",
          speed: 1.15,
        }),
      };
      const story = {
        id: "story_audio_101",
        script: {
          segments: [
            {
              id: "seg_01",
              index: 0,
              text: "Gooool de River Plate en el último minuto.",
              language: "es",
            },
          ],
        },
      };

      const durations = await stepTTS(job, story, undefined, "job_audio_diego", () => false);

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(generateSpy).toHaveBeenCalledWith(
        "Gooool de River Plate en el último minuto.",
        expect.stringContaining("diego.wav"),
        expect.objectContaining({
          personaId: "diego",
          engine: "f5_tts",
          speedFactor: 1.15,
        })
      );
      expect(durations).toHaveLength(1);
    });

    it("should honor segment-level voiceParams override over job-level defaults", async () => {
      const fakeAudioBuffer = Buffer.from("RIFF_WAVE_AUDIO_TEST");
      const generateSpy = vi.spyOn(modernTtsClient, "generateAudioWithModernTts").mockResolvedValueOnce(fakeAudioBuffer as any);

      const job = {
        id: "job_audio_override",
        companyId: "org_tenant_xyz",
        config: JSON.stringify({
          personaId: "ruby",
          engine: "piper",
        }),
      };
      const story = {
        id: "story_audio_102",
        video: { personaId: "ruby" },
        script: {
          segments: [
            {
              id: "seg_camila",
              index: 0,
              text: "Reportando desde el Congreso Nacional.",
              personaId: "camila",
              voiceParams: JSON.stringify({
                speed: 1.25,
                pitchShift: 1.0,
                engine: "piper",
              }),
            },
          ],
        },
      };

      await stepTTS(job, story, undefined, "job_audio_override", () => false);

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(generateSpy).toHaveBeenCalledWith(
        "Reportando desde el Congreso Nacional.",
        expect.stringContaining("camila.wav"),
        expect.objectContaining({
          personaId: "camila",
          speedFactor: 1.25,
          pitchShift: 1.0,
        })
      );
    });

    it("should enforce tenant-scoped S3 storage keys: tenants/{orgId}/audio/{storyId}/{filename}", () => {
      const key = generateKey({
        companyId: "company_999",
        type: "audio",
        id: "story_888",
        filename: "seg_0_ruby.wav",
      });

      expect(key).toBe("tenants/company_999/audio/story_888/seg_0_ruby.wav");

      const wrapped = withTenant("company_999", "audio/story_888/seg_0_ruby.wav");
      expect(wrapped).toBe("tenants/company_999/audio/story_888/seg_0_ruby.wav");
    });

    it("should recalibrate segment timings sequentially from audio durations", async () => {
      const updateSpy = vi.spyOn(pipelineApi, "updateSegment").mockResolvedValue(true);

      const story = {
        script: {
          segments: [
            { id: "seg_1", index: 0, startTime: 0, endTime: 5 },
            { id: "seg_2", index: 1, startTime: 5, endTime: 10 },
          ],
        },
      };

      const newDurations = [
        { id: "seg_1", index: 0, duration: 4.2 },
        { id: "seg_2", index: 1, duration: 6.8 },
      ];

      await stepRecalibrateTiming(story, newDurations, "job_timing_1");

      expect(updateSpy).toHaveBeenCalledWith("job_timing_1", "seg_1", {
        startTime: 0,
        endTime: 4.2,
      });
      expect(updateSpy).toHaveBeenCalledWith("job_timing_1", "seg_2", {
        startTime: 4.2,
        endTime: 11.0,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Video Task Modernization Tests (MuseTalk :8007 & ComfyUI)
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 2: Video Task Modernization (MuseTalk :8007 & ComfyUI)", () => {
    it("should resolve pre-rendered action loops for persona", () => {
      const resolved = resolveActionLoopVideo("ruby");
      expect(resolved).toBeDefined();
      expect(typeof resolved).toBe("string");
    });

    it("should handle empty video target segments gracefully", async () => {
      const job = { companyId: "org_123" };
      const story = { id: "story_123", script: { segments: [] } };
      await expect(
        stepVideo(job, story, "job_1", "full", { engine: "musetalk" }, () => false)
      ).resolves.toBeUndefined();
    });

    it("should route musetalk strategy to generateMuseTalkLipSync on Port 8007", async () => {
      const museSpy = vi.spyOn(musetalkClient, "generateMuseTalkLipSync").mockResolvedValueOnce({
        success: true,
        outputPath: "mock_output.mp4",
      });

      const fs = await import("fs");
      vi.spyOn(fs.default, "existsSync").mockReturnValue(true);
      vi.spyOn(fs.default, "statSync").mockReturnValue({ size: 1024 } as any);
      vi.spyOn(fs.default, "readFileSync").mockReturnValue(Buffer.from("fake_mp4_bytes") as any);
      vi.spyOn(fs.default, "writeFileSync").mockReturnValue(undefined);

      const job = { id: "job_video_muse", companyId: "org_tenant_abc" };
      const story = {
        id: "story_muse_1",
        script: {
          segments: [
            {
              id: "seg_v0",
              index: 0,
              personaId: "ruby",
              audioPath: "tenants/org_tenant_abc/audio/story_muse_1/seg_0_ruby.wav",
              sceneStrategy: "musetalk",
            },
          ],
        },
      };

      await stepVideo(job, story, "job_video_muse", "musetalk", { engine: "musetalk" }, () => false);

      expect(museSpy).toHaveBeenCalled();
    });

    it("should route sadtalker and bubble sceneStrategy to MuseTalk or Ditto talking head", async () => {
      const museSpy = vi.spyOn(musetalkClient, "generateMuseTalkLipSync").mockResolvedValueOnce({
        success: true,
        outputPath: "mock_sadtalker_mapped.mp4",
      });

      const fs = await import("fs");
      vi.spyOn(fs.default, "existsSync").mockReturnValue(true);
      vi.spyOn(fs.default, "statSync").mockReturnValue({ size: 2048 } as any);
      vi.spyOn(fs.default, "readFileSync").mockReturnValue(Buffer.from("fake_mp4_bytes") as any);
      vi.spyOn(fs.default, "writeFileSync").mockReturnValue(undefined);

      const job = { id: "job_video_sadtalker", companyId: "org_tenant_abc" };
      const story = {
        id: "story_sadtalker_1",
        script: {
          segments: [
            {
              id: "seg_st0",
              index: 0,
              personaId: "ruby",
              audioPath: "tenants/org_tenant_abc/audio/story_sadtalker_1/seg_0_ruby.wav",
              sceneStrategy: "sadtalker", // Legacy sadtalker strategy
            },
          ],
        },
      };

      await stepVideo(job, story, "job_video_sadtalker", "bubble", { engine: "bubble" }, () => false);

      expect(museSpy).toHaveBeenCalled();
    });

    it("should route ditto sceneStrategy to generateTalkingHeadInference with modelId ditto", async () => {
      const dittoSpy = vi.spyOn(talkingHeadsClient, "generateTalkingHeadInference").mockResolvedValueOnce({
        success: true,
        modelId: "ditto",
        modelName: "Ditto Motion-Space",
        videoUrl: "mock_ditto_output.mp4",
        ttfbMs: 120,
        latencyMs: 250,
        fps: 25,
        vramUsageMb: 2500,
        isFallback: false,
      });

      const fs = await import("fs");
      vi.spyOn(fs.default, "existsSync").mockReturnValue(true);
      vi.spyOn(fs.default, "statSync").mockReturnValue({ size: 4096 } as any);
      vi.spyOn(fs.default, "readFileSync").mockReturnValue(Buffer.from("fake_ditto_bytes") as any);
      vi.spyOn(fs.default, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs.default, "copyFileSync").mockReturnValue(undefined);

      const job = { id: "job_video_ditto", companyId: "org_tenant_abc" };
      const story = {
        id: "story_ditto_1",
        script: {
          segments: [
            {
              id: "seg_d0",
              index: 0,
              personaId: "ruby",
              audioPath: "tenants/org_tenant_abc/audio/story_ditto_1/seg_0_ruby.wav",
              sceneStrategy: "ditto",
            },
          ],
        },
      };

      await stepVideo(job, story, "job_video_ditto", "ditto", { engine: "ditto" }, () => false);

      expect(dittoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: "ditto",
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Self-Healing 20-Minute ComfyUI Watchdog Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 4: Self-Healing 20-Minute Comfy Watchdog", () => {
    it("should pass when job execution time is within 20-minute threshold", async () => {
      const now = Date.now();
      const isOk = await monitorComfyUIWatchdog(now - 60000); // 1 min ago
      expect(isOk).toBe(true);
    });

    it("should trigger interrupt and purge when job exceeds 20 minutes", async () => {
      const now = Date.now();
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      } as any);

      const isOk = await monitorComfyUIWatchdog(now - 1300000); // > 20 mins
      expect(fetchSpy).toHaveBeenCalled();
      expect(typeof isOk).toBe("boolean");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Job Routing & Worker Delegation Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Task 5: Job Routing & Worker Delegation", () => {
    it("render-data route should prioritize jobConfig overrides for compositionId, aspectRatio, and inputProps", async () => {
      const { GET: renderDataGet } = await import("../app/api/pipeline/jobs/[jobId]/render-data/route");

      const mockJob = {
        id: "job_render_custom_1",
        storyId: "story_custom_1",
        companyId: "org_tenant_abc",
        type: "render",
        config: JSON.stringify({
          videoId: "video_custom_1",
          compositionId: "RubyNews-Shorts",
          aspectRatio: "vertical",
          inputProps: { hookHeadline: "VIRAL HOOK", channelHandle: "@RubyNewsAI" },
        }),
      };

      vi.spyOn(prisma.generationJob, "findUnique").mockResolvedValueOnce(mockJob as any);
      vi.spyOn(prisma.video, "findUnique").mockResolvedValueOnce({
        id: "video_custom_1",
        storyId: "story_custom_1",
        aspectRatio: "horizontal", // should be overridden by jobConfig!
        story: {
          script: { segments: [] },
        },
      } as any);
      vi.spyOn(prisma.rssFeed, "findUnique").mockResolvedValueOnce(null);

      const req = {
        headers: new Headers({ "x-worker-key": process.env.WORKER_API_KEY || "worker-secret-key-change-me" }),
      } as any;

      const res = await renderDataGet(req, { params: Promise.resolve({ jobId: "job_render_custom_1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.compositionId).toBe("RubyNews-Shorts");
      expect(json.aspectRatio).toBe("vertical");
      expect(json.videoId).toBe("video_custom_1");
      expect(json.inputProps.hookHeadline).toBe("VIRAL HOOK");
      expect(json.inputProps.channelHandle).toBe("@RubyNewsAI");
    });

    it("claim route should claim render jobs without requiring script segments", async () => {
      const { POST: claimPost } = await import("../app/api/pipeline/jobs/[jobId]/claim/route");

      const mockJob = {
        id: "job_render_claim_1",
        storyId: "story_clip_1",
        companyId: "org_tenant_abc",
        type: "render",
        status: "QUEUED",
        config: JSON.stringify({ videoId: "video_clip_1" }),
      };

      vi.spyOn(prisma.generationJob, "updateMany").mockResolvedValueOnce({ count: 1 });
      vi.spyOn(prisma.generationJob, "findUnique").mockResolvedValue(mockJob as any);
      vi.spyOn(prisma.story, "findFirst").mockResolvedValueOnce(null); // Story with no segments

      const req = {
        headers: new Headers({ "x-worker-key": process.env.WORKER_API_KEY || "worker-secret-key-change-me" }),
        json: async () => ({ workerId: "worker-render-1" }),
      } as any;

      const res = await claimPost(req, { params: Promise.resolve({ jobId: "job_render_claim_1" }) });
      const json = await res.json();

      expect(json.claimed).toBe(true);
      expect(json.job.id).toBe("job_render_claim_1");
      expect(json.defaultVoices).toEqual([]);
    });
  });
});
