import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

interface FakeSettingRow {
  id: string;
  companyId: string | null;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const fakeRows = new Map<string, FakeSettingRow>();

function matchesStringFilter(
  actual: string,
  filter: string | { startsWith?: string; in?: string[] } | undefined
): boolean {
  if (filter === undefined) return true;
  if (typeof filter === "string") return actual === filter;
  if (filter.startsWith !== undefined && !actual.startsWith(filter.startsWith)) return false;
  if (filter.in !== undefined && !filter.in.includes(actual)) return false;
  return true;
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      create: vi.fn(async ({ data }: { data: { id: string; companyId: string | null; key: string; value: string } }) => {
        for (const existing of fakeRows.values()) {
          if (existing.key === data.key) {
            throw new Error(`Unique key violation on ${data.key}`);
          }
        }
        const now = new Date();
        const row: FakeSettingRow = {
          id: data.id,
          companyId: data.companyId,
          key: data.key,
          value: data.value,
          createdAt: now,
          updatedAt: now,
        };
        fakeRows.set(row.id, row);
        return { ...row };
      }),
      findMany: vi.fn(
        async ({
          where,
          take,
        }: {
          where?: { key?: { startsWith?: string } };
          take?: number;
        }) => {
          const all = [...fakeRows.values()]
            .filter((r) => matchesStringFilter(r.key, where?.key))
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          return (take ? all.slice(0, take) : all).map((r) => ({ ...r }));
        }
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = fakeRows.get(where.id);
        return row ? { ...row } : null;
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where?: { id?: string; key?: string | { in?: string[] } };
          data: { key?: string; value?: string };
        }) => {
          let count = 0;
          for (const row of fakeRows.values()) {
            if (where?.id !== undefined && row.id !== where.id) continue;
            if (!matchesStringFilter(row.key, where?.key)) continue;
            if (data.key !== undefined) row.key = data.key;
            if (data.value !== undefined) row.value = data.value;
            row.updatedAt = new Date();
            count += 1;
          }
          return { count };
        }
      ),
      deleteMany: vi.fn(
        async ({
          where,
        }: {
          where?: { id?: string; key?: { startsWith?: string }; createdAt?: { lt?: Date } };
        }) => {
          let count = 0;
          for (const [id, row] of fakeRows.entries()) {
            if (where?.id !== undefined && row.id !== where.id) continue;
            if (!matchesStringFilter(row.key, where?.key)) continue;
            if (where?.createdAt?.lt && !(row.createdAt < where.createdAt.lt)) continue;
            fakeRows.delete(id);
            count += 1;
          }
          return { count };
        }
      ),
    },
  },
}));

import {
  enqueueTtsPreviewTask,
  claimNextTtsPreviewTask,
  completeTtsPreviewTask,
  enqueueTtsPreviewTaskPersisted,
  claimNextTtsPreviewTaskPersisted,
  completeTtsPreviewTaskPersisted,
  TtsPreviewBrokerTimeoutError,
  resetTtsPreviewBrokerForTests,
} from "../ttsPreviewBroker";
import {
  claimNextBrokerRowFromDb,
  settleBrokerRowInDb,
  enqueueLlmTaskPersisted,
  claimNextLlmTaskPersisted,
  completeLlmTaskPersisted,
  resetLlmBrokerForTests,
} from "../llmBroker";
import { prisma } from "@/lib/prisma";

describe("worker-broker: ttsPreviewBroker & persisted cross-replica DB flow", () => {
  beforeEach(() => {
    fakeRows.clear();
    vi.clearAllMocks();
    process.env.LLM_BROKER_FORCE_DB_IN_TEST = "true";
    resetLlmBrokerForTests();
    resetTtsPreviewBrokerForTests();
  });

  afterEach(() => {
    delete process.env.LLM_BROKER_FORCE_DB_IN_TEST;
    resetLlmBrokerForTests();
    resetTtsPreviewBrokerForTests();
  });

  it("queues, claims, and resolves in-memory TTS preview tasks", async () => {
    const { taskId, wait } = enqueueTtsPreviewTask({
      text: "Hello cloud preview",
      engine: "piper",
      checkpoint: "en_US-lessac-high",
      personaId: "ruby",
      referenceAudio: "",
      pitchShift: 0,
      speedFactor: 1,
      language: "en",
      applyYeismo: false,
      claimTimeoutMs: 1000,
    });

    const claimed = claimNextTtsPreviewTask();
    expect(claimed?.taskId).toBe(taskId);
    expect(claimed?.text).toBe("Hello cloud preview");

    const ok = completeTtsPreviewTask(taskId, {
      status: "done",
      audioBase64: "UklGRg==",
      engine: "piper",
      model: "en_US-lessac-high",
      latencyMs: 120,
    });
    expect(ok).toBe(true);

    const res = await wait();
    expect(res.audioBase64).toBe("UklGRg==");
    expect(res.engine).toBe("piper");
  });

  it("rejects unclaimed TTS preview task with CLAIM_TIMEOUT", async () => {
    const { wait } = enqueueTtsPreviewTask({
      text: "Unclaimed preview",
      engine: "piper",
      checkpoint: "ruby-es",
      personaId: "ruby",
      referenceAudio: "",
      pitchShift: 0,
      speedFactor: 1,
      language: "es",
      applyYeismo: true,
      claimTimeoutMs: 40,
    });

    await expect(wait()).rejects.toBeInstanceOf(TtsPreviewBrokerTimeoutError);
  });

  it("persists LLM task to DB and resolves Replica A when Replica B claims & settles via DB", async () => {
    const handle = await enqueueLlmTaskPersisted({
      prompt: "Summarize deployment",
      model: "agy-default",
      claimTimeoutMs: 2500,
    });

    const row = fakeRows.get(`broker_llm_${handle.taskId}`);
    expect(row?.key).toBe(`broker:llm:queued:${handle.taskId}`);

    // Simulate another Next.js replica claiming & settling directly in Postgres
    const claimed = await claimNextBrokerRowFromDb<{ taskId: string; prompt: string }>(
      "broker:llm:queued:",
      (id) => `broker:llm:claimed:${id}`,
      (val) => {
        const parsed = JSON.parse(val) as { taskId: string; prompt: string };
        return { taskId: parsed.taskId, data: parsed };
      }
    );
    expect(claimed?.taskId).toBe(handle.taskId);

    const settled = await settleBrokerRowInDb(
      `broker_llm_${handle.taskId}`,
      [`broker:llm:queued:${handle.taskId}`, `broker:llm:claimed:${handle.taskId}`],
      `broker:llm:settled:${handle.taskId}`,
      { status: "done", text: "Cross-replica OK", engine: "agy", model: "gemini" }
    );
    expect(settled).toBe(true);

    const result = await handle.wait();
    expect(result.text).toBe("Cross-replica OK");
    expect(result.engine).toBe("agy");

    // Observer cleans up settled DB row asynchronously
    await new Promise((r) => setTimeout(r, 20));
    expect(fakeRows.has(`broker_llm_${handle.taskId}`)).toBe(false);
  });

  it("claims and settles an external Replica LLM task purely through DB fallback", async () => {
    await prisma.systemSetting.create({
      data: {
        id: "broker_llm_external-1",
        companyId: null,
        key: "broker:llm:queued:external-1",
        value: JSON.stringify({
          taskId: "external-1",
          prompt: "Remote replica prompt",
          createdAt: Date.now(),
        }),
      },
    });

    const claimed = await claimNextLlmTaskPersisted("worker-1");
    expect(claimed?.taskId).toBe("external-1");
    expect(fakeRows.get("broker_llm_external-1")?.key).toBe("broker:llm:claimed:external-1");

    const ok = await completeLlmTaskPersisted("external-1", {
      status: "done",
      text: "Completed on replica 2",
      engine: "agy",
      model: "gemini",
    });
    expect(ok).toBe(true);
    expect(fakeRows.get("broker_llm_external-1")?.key).toBe("broker:llm:settled:external-1");
  });

  it("persists TTS preview task to DB, settles across replicas, and supports DB claim fallback", async () => {
    const handle = await enqueueTtsPreviewTaskPersisted({
      text: "Hola NewsStudio Cloud",
      engine: "piper",
      checkpoint: "es_AR-daniela-high",
      personaId: "ruby",
      referenceAudio: "",
      pitchShift: 0,
      speedFactor: 1,
      language: "es",
      applyYeismo: true,
      claimTimeoutMs: 2500,
    });

    expect(fakeRows.get(`broker_tts_${handle.taskId}`)?.key).toBe(
      `broker:tts:queued:${handle.taskId}`
    );

    const settled = await settleBrokerRowInDb(
      `broker_tts_${handle.taskId}`,
      [`broker:tts:queued:${handle.taskId}`, `broker:tts:claimed:${handle.taskId}`],
      `broker:tts:settled:${handle.taskId}`,
      { status: "done", audioBase64: "V0FW", engine: "piper", model: "es_AR-daniela-high" }
    );
    expect(settled).toBe(true);

    const result = await handle.wait();
    expect(result.audioBase64).toBe("V0FW");

    // External TTS task claimed and completed from DB
    await prisma.systemSetting.create({
      data: {
        id: "broker_tts_ext-tts-1",
        companyId: null,
        key: "broker:tts:queued:ext-tts-1",
        value: JSON.stringify({
          taskId: "ext-tts-1",
          text: "Remote preview",
          engine: "piper",
          checkpoint: "es_AR-daniela-high",
          personaId: "ruby",
          referenceAudio: "",
          pitchShift: 0,
          speedFactor: 1,
          language: "es",
          applyYeismo: true,
          createdAt: Date.now(),
        }),
      },
    });

    const claimed = await claimNextTtsPreviewTaskPersisted();
    expect(claimed?.taskId).toBe("ext-tts-1");
    expect(fakeRows.get("broker_tts_ext-tts-1")?.key).toBe("broker:tts:claimed:ext-tts-1");

    const completed = await completeTtsPreviewTaskPersisted("ext-tts-1", {
      status: "done",
      audioBase64: "QUJD",
      engine: "piper",
      model: "es_AR-daniela-high",
    });
    expect(completed).toBe(true);
    expect(fakeRows.get("broker_tts_ext-tts-1")?.key).toBe("broker:tts:settled:ext-tts-1");
  });
});
