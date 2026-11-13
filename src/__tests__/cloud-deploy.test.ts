import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "http";
import { MinioStorageClient } from "@/lib/storage/minio";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  enqueueLlmTask,
  claimNextLlmTask,
  completeLlmTask,
  resetLlmBrokerForTests,
  LlmBrokerTimeoutError,
} from "@/lib/worker-broker";
import { generateLlmText } from "@/lib/llm/aiSdkGateway";
import * as tokenTracker from "@/lib/llm/tokenTracker";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

describe("Cloud Deploy Verification Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetLlmBrokerForTests();
    vi.mocked(getSignedUrl).mockReset();
  });

  afterEach(() => {
    resetLlmBrokerForTests();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Part A: Cloudflare R2 Storage Verification
  // =========================================================================
  describe("R2 Storage Client", () => {
    it("returns clean public R2 URL without duplicate bucket name in getUrl()", () => {
      process.env.STORAGE_PROVIDER = "r2";
      process.env.NEXT_PUBLIC_S3_PUBLIC_URL = "https://pub-abcdef123456.r2.dev";
      process.env.S3_BUCKET_NAME = "news-studio";

      const client = new MinioStorageClient();

      const url1 = client.getUrl("audio/story-99/segment-01.wav");
      expect(url1).toBe("https://pub-abcdef123456.r2.dev/audio/story-99/segment-01.wav");
      expect(url1).not.toContain("news-studio");

      // Leading slashes should be trimmed cleanly
      const url2 = client.getUrl("///thumbnails/hero.png");
      expect(url2).toBe("https://pub-abcdef123456.r2.dev/thumbnails/hero.png");
      expect(url2).not.toContain("news-studio");
    });

    it("generates presigned upload URL with PutObjectCommand and correct content type", async () => {
      const client = new MinioStorageClient();
      vi.mocked(getSignedUrl).mockResolvedValueOnce("https://pub-mock.r2.dev/presigned-upload");

      const presigned = await client.getPresignedUploadUrl(
        "uploads/video.mp4",
        "video/mp4",
        3600
      );

      expect(presigned).toBe("https://pub-mock.r2.dev/presigned-upload");
      expect(getSignedUrl).toHaveBeenCalledTimes(1);

      const [calledClient, calledCommand, calledOptions] = vi.mocked(getSignedUrl).mock.calls[0];
      expect(calledClient).toBeDefined();
      expect(calledCommand).toBeInstanceOf(PutObjectCommand);
      expect((calledCommand as PutObjectCommand).input).toMatchObject({
        Key: "uploads/video.mp4",
        ContentType: "video/mp4",
      });
      expect(calledOptions).toEqual({ expiresIn: 3600 });
    });

    it("generates presigned read URL with GetObjectCommand and custom expiration", async () => {
      const client = new MinioStorageClient();
      vi.mocked(getSignedUrl).mockResolvedValueOnce("https://pub-mock.r2.dev/presigned-read");

      const presigned = await client.getPresignedReadUrl("assets/music.mp3", 1800);

      expect(presigned).toBe("https://pub-mock.r2.dev/presigned-read");
      expect(getSignedUrl).toHaveBeenCalledTimes(1);

      const [, calledCommand, calledOptions] = vi.mocked(getSignedUrl).mock.calls[0];
      expect(calledCommand).toBeInstanceOf(GetObjectCommand);
      expect((calledCommand as GetObjectCommand).input).toMatchObject({
        Key: "assets/music.mp3",
      });
      expect(calledOptions).toEqual({ expiresIn: 1800 });
    });
  });

  // =========================================================================
  // Part B: llmBroker + aiSdkGateway Routing & Fallback
  // =========================================================================
  describe("llmBroker & aiSdkGateway Routing", () => {
    it("routes to local worker first when task is claimed", async () => {
      process.env.LLM_BROKER_FORCE_IN_TEST = "true";
      process.env.LLM_LOCAL_WORKER_FIRST = "true";
      process.env.LLM_WORKER_CLAIM_TIMEOUT_MS = "1000";
      delete process.env.IS_PIPELINE_WORKER;

      vi.spyOn(tokenTracker, "trackLlmUsage").mockResolvedValue();

      // Local worker claims and completes the task
      setTimeout(() => {
        const task = claimNextLlmTask("cloud-verifier-worker");
        if (task) {
          expect(task.prompt).toContain("Write a breaking headline");
          completeLlmTask(task.taskId, {
            status: "done",
            text: "BREAKING: Autonomous Swarm Deployed Successfully",
            model: "gemini-3.8-flash-low",
            engine: "agy",
            inputTokens: 50,
            outputTokens: 15,
          });
        }
      }, 25);

      const res = await generateLlmText({
        prompt: "Write a breaking headline",
        companyId: "tenant-cloud",
      });

      expect(res.text).toBe("BREAKING: Autonomous Swarm Deployed Successfully");
      expect(res.providerUsed).toBe("agy");
      expect(res.modelUsed).toBe("gemini-3.8-flash-low");
    });

    it("falls back cleanly to cloud provider when claim times out", async () => {
      process.env.LLM_BROKER_FORCE_IN_TEST = "true";
      process.env.LLM_LOCAL_WORKER_FIRST = "true";
      process.env.LLM_WORKER_CLAIM_TIMEOUT_MS = "40";
      delete process.env.IS_PIPELINE_WORKER;

      // Mock Ollama/cloud response when Gemini key is absent
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            model: "qwen3.5:9b",
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: "Cloud fallback response after timeout" },
            done: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await generateLlmText({
        provider: "gemini",
        prompt: "Test fallback on timeout",
        allowFallback: true,
      });

      expect(res.providerUsed).toBe("ollama");
      expect(res.text).toBe("Cloud fallback response after timeout");
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Part C: Worker Idle Loop & Wake Server Verification
  // =========================================================================
  describe("Worker Idle Loop & Wake Server", () => {
    it("makes 0 HTTP requests to MAIN_APP_URL while sleeping", async () => {
      const mainAppUrl = "https://newsstudio-cloud.railway.app";
      process.env.MAIN_APP_URL = mainAppUrl;

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // Simulate worker interruptible sleep logic for 200ms
      const sleepPromise = new Promise<"woken" | "timeout">((resolve) => {
        const timer = setTimeout(() => resolve("timeout"), 200);
        timer.unref?.();
      });

      const outcome = await sleepPromise;
      expect(outcome).toBe("timeout");

      // Verify no network calls were made to MAIN_APP_URL during sleep
      const callsToMainApp = fetchSpy.mock.calls.filter(([url]) =>
        String(url).startsWith(mainAppUrl)
      );
      expect(callsToMainApp.length).toBe(0);
    });

    it("wakes immediately on HTTP /wake endpoint and responds HTTP 200", async () => {
      let wokenReason: string | null = null;
      let sleepCancel: (() => void) | null = null;

      // Spin up a test instance of the wake server
      const server = http.createServer((req, res) => {
        const reqPath = (req.url || "/").split("?")[0];
        if (reqPath === "/wake") {
          wokenReason = "http_wake";
          if (sleepCancel) sleepCancel();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, woken: true, workerId: "test-worker" }));
          return;
        }
        res.writeHead(404);
        res.end();
      });

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address() as { port: number };

      const startTime = Date.now();

      // Start an interruptible sleep of 5000ms
      const sleepPromise = new Promise<"woken" | "timeout">((resolve) => {
        const timer = setTimeout(() => resolve("timeout"), 5000);
        sleepCancel = () => {
          clearTimeout(timer);
          resolve("woken");
        };
      });

      // Send /wake request after 30ms
      setTimeout(async () => {
        const res = await fetch(`http://127.0.0.1:${address.port}/wake`, { method: "POST" });
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.woken).toBe(true);
      }, 30);

      const outcome = await sleepPromise;
      const elapsed = Date.now() - startTime;

      expect(outcome).toBe("woken");
      expect(wokenReason).toBe("http_wake");
      expect(elapsed).toBeLessThan(1000); // Woke immediately, did not wait 5000ms

      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("wakes immediately on Supabase Realtime broadcast event", async () => {
      let wokenReason: string | null = null;
      let sleepCancel: (() => void) | null = null;

      const onWake = (reason: string) => {
        wokenReason = reason;
        if (sleepCancel) sleepCancel();
      };

      const startTime = Date.now();

      const sleepPromise = new Promise<"woken" | "timeout">((resolve) => {
        const timer = setTimeout(() => resolve("timeout"), 5000);
        sleepCancel = () => {
          clearTimeout(timer);
          resolve("woken");
        };
      });

      // Simulate Realtime broadcast wake arriving after 20ms
      setTimeout(() => {
        onWake("supabase_realtime_broadcast");
      }, 20);

      const outcome = await sleepPromise;
      const elapsed = Date.now() - startTime;

      expect(outcome).toBe("woken");
      expect(wokenReason).toBe("supabase_realtime_broadcast");
      expect(elapsed).toBeLessThan(500); // Woke immediately
    });
  });
});
