import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import {
  resolveSupabaseConfigFromEnv,
  broadcastWorkerWake,
  checkSupabaseQueuedJobs,
  checkSupabaseDueSchedules,
  enqueueLlmTask,
  claimNextLlmTask,
  completeLlmTask,
  resetLlmBrokerForTests,
  LlmBrokerTimeoutError,
  parseAgyJsonLine,
  resolveAgyModel,
} from "@/lib/worker-broker";
import { generateLlmText, generateLlmObject } from "@/lib/llm/aiSdkGateway";
import * as tokenTracker from "@/lib/llm/tokenTracker";

describe("worker-broker: supabaseWake", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("resolveSupabaseConfigFromEnv returns null when env vars missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(resolveSupabaseConfigFromEnv()).toBeNull();
  });

  it("resolveSupabaseConfigFromEnv trims trailing slash and returns config", () => {
    process.env.SUPABASE_URL = "https://abc.supabase.co/";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    expect(resolveSupabaseConfigFromEnv()).toEqual({
      url: "https://abc.supabase.co",
      serviceRoleKey: "service-role-secret",
    });
  });

  it("broadcastWorkerWake is a silent no-op when Supabase env is unset", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(broadcastWorkerWake("job_queued")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("broadcastWorkerWake posts to /realtime/v1/api/broadcast and never throws on HTTP failure", async () => {
    process.env.SUPABASE_URL = "https://abc.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "key-123";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("err", { status: 500 }));

    await expect(broadcastWorkerWake("llm_task")).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://abc.supabase.co/realtime/v1/api/broadcast");
    expect((init as RequestInit).method).toBe("POST");
    const parsedBody = JSON.parse(String((init as RequestInit).body));
    expect(parsedBody.messages[0].topic).toBe("newsstudio-worker-wake");
    expect(parsedBody.messages[0].event).toBe("wake");
    expect(parsedBody.messages[0].payload.reason).toBe("llm_task");
  });

  it("checkSupabaseQueuedJobs returns true only when PostgREST finds queued rows", async () => {
    const cfg = { url: "https://abc.supabase.co", serviceRoleKey: "k" };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "job-1" }]), { status: 200 }));

    expect(await checkSupabaseQueuedJobs(cfg)).toBe(false);
    expect(await checkSupabaseQueuedJobs(cfg)).toBe(true);
  });

  it("checkSupabaseDueSchedules returns validated rows from PostgREST", async () => {
    const cfg = { url: "https://abc.supabase.co", serviceRoleKey: "k" };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ id: "sched-1", companyId: "org-1" }]), { status: 200 })
    );

    const due = await checkSupabaseDueSchedules(cfg);
    expect(due).toEqual([{ id: "sched-1", companyId: "org-1" }]);
  });
});

describe("worker-broker: llmBroker & aiSdkGateway", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetLlmBrokerForTests();
  });

  afterEach(() => {
    resetLlmBrokerForTests();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("claims queued task in FIFO order and completes waiting caller promise", async () => {
    const h1 = enqueueLlmTask({ prompt: "First", claimTimeoutMs: 1000 });
    const h2 = enqueueLlmTask({ prompt: "Second", claimTimeoutMs: 1000 });

    const c1 = claimNextLlmTask("w1");
    expect(c1?.taskId).toBe(h1.taskId);
    expect(c1?.prompt).toBe("First");

    const c2 = claimNextLlmTask("w1");
    expect(c2?.taskId).toBe(h2.taskId);

    expect(claimNextLlmTask("w1")).toBeNull();

    expect(
      completeLlmTask(h1.taskId, {
        status: "done",
        text: "Answer 1",
        model: "gemini-3.8-flash-low",
        engine: "agy",
        inputTokens: 12,
        outputTokens: 8,
      })
    ).toBe(true);

    expect(
      completeLlmTask(h2.taskId, {
        status: "done",
        text: "Answer 2",
        model: "gemini-3.8-flash-low",
        engine: "agy",
      })
    ).toBe(true);

    await expect(h1.wait()).resolves.toMatchObject({
      text: "Answer 1",
      engine: "agy",
      inputTokens: 12,
      outputTokens: 8,
    });
    await expect(h2.wait()).resolves.toMatchObject({ text: "Answer 2" });
  });

  it("rejects with CLAIM_TIMEOUT when no worker claims in time", async () => {
    const handle = enqueueLlmTask({ prompt: "Unclaimed", claimTimeoutMs: 40 });
    await expect(handle.wait()).rejects.toThrow(LlmBrokerTimeoutError);
    expect(claimNextLlmTask("w1")).toBeNull();
  });

  it("routes generateLlmText through llmBroker and tracks $0 agy usage when claimed", async () => {
    process.env.LLM_BROKER_FORCE_IN_TEST = "true";
    process.env.LLM_LOCAL_WORKER_FIRST = "true";
    process.env.LLM_WORKER_CLAIM_TIMEOUT_MS = "1000";
    delete process.env.IS_PIPELINE_WORKER;

    const trackSpy = vi.spyOn(tokenTracker, "trackLlmUsage").mockResolvedValue();

    // Simulate local worker waking up after 20ms and solving the broker task
    setTimeout(() => {
      const task = claimNextLlmTask("test-worker");
      if (task) {
        completeLlmTask(task.taskId, {
          status: "done",
          text: "Local zero-cost response",
          model: "gemini-3.8-flash-low",
          engine: "agy",
          inputTokens: 100,
          outputTokens: 25,
        });
      }
    }, 20);

    const res = await generateLlmText({
      prompt: "Say hi",
      companyId: "org_test",
    });

    expect(res.text).toBe("Local zero-cost response");
    expect(res.providerUsed).toBe("agy");
    expect(res.modelUsed).toBe("gemini-3.8-flash-low");
    expect(trackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "agy",
        estimatedCost: 0.0,
        companyId: "org_test",
      })
    );
  });

  it("falls back transparently to cloud/ollama when llmBroker is unclaimed within timeout", async () => {
    process.env.LLM_BROKER_FORCE_IN_TEST = "true";
    process.env.LLM_LOCAL_WORKER_FIRST = "true";
    process.env.LLM_WORKER_CLAIM_TIMEOUT_MS = "40";
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    // Gemini key missing triggers fallback to Ollama fetch mock
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "qwen3.5:9b",
          created_at: new Date().toISOString(),
          message: { role: "assistant", content: "Cloud fallback response" },
          done: true,
          prompt_eval_count: 5,
          eval_count: 4,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await generateLlmText({
      provider: "gemini",
      prompt: "Fallback test",
      allowFallback: true,
    });

    expect(res.providerUsed).toBe("ollama");
    expect(res.text).toBe("Cloud fallback response");
  });

  it("validates structured Zod output from broker on generateLlmObject", async () => {
    process.env.LLM_BROKER_FORCE_IN_TEST = "true";
    process.env.LLM_LOCAL_WORKER_FIRST = "true";
    process.env.LLM_WORKER_CLAIM_TIMEOUT_MS = "1000";

    vi.spyOn(tokenTracker, "trackLlmUsage").mockResolvedValue();

    setTimeout(() => {
      const task = claimNextLlmTask("test-worker");
      if (task) {
        completeLlmTask(task.taskId, {
          status: "done",
          text: JSON.stringify({ headline: "Breaking News", score: 9 }),
          model: "gemini-3.8-flash-low",
          engine: "agy",
        });
      }
    }, 20);

    const schema = z.object({ headline: z.string(), score: z.number() });
    const res = await generateLlmObject({
      schema,
      prompt: "Extract headline",
    });

    expect(res.object).toEqual({ headline: "Breaking News", score: 9 });
    expect(res.providerUsed).toBe("agy");
  });

  it("parseAgyJsonLine extracts response/structured_output and resolveAgyModel sanitizes API model names", () => {
    delete process.env.AGY_MODEL;
    expect(resolveAgyModel("gemini-2.5-flash")).toBe("gemini-3.8-flash-low");
    expect(resolveAgyModel("gemini-4-hydrogen-high")).toBe("gemini-4-hydrogen-high");

    const plain = parseAgyJsonLine(
      JSON.stringify({
        status: "SUCCESS",
        response: "PONG\n",
        usage: { input_tokens: 100, output_tokens: 2 },
      })
    );
    expect(plain).toEqual({ text: "PONG\n", inputTokens: 100, outputTokens: 2 });

    const structured = parseAgyJsonLine(
      JSON.stringify({
        status: "SUCCESS",
        response: '{"reply":"ok"}',
        structured_output: { reply: "ok" },
        usage: { input_tokens: 50, output_tokens: 5 },
      })
    );
    expect(structured).toEqual({ text: '{"reply":"ok"}', inputTokens: 50, outputTokens: 5 });

    expect(() =>
      parseAgyJsonLine(JSON.stringify({ status: "ERROR", error: "quota exceeded" }))
    ).toThrow(/quota exceeded/);
  });
});
