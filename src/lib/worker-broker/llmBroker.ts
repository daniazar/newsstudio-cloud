import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface LlmBrokerEnqueueInput {
  prompt: string;
  systemPrompt?: string;
  schema?: Record<string, unknown>;
  model?: string;
  effort?: string;
  claimTimeoutMs?: number;
  executionTimeoutMs?: number;
}

export interface LlmBrokerClaimedTask {
  taskId: string;
  prompt: string;
  systemPrompt?: string;
  schema?: Record<string, unknown>;
  model?: string;
  effort?: string;
  createdAt: number;
}

export interface LlmBrokerCompletePayload {
  status: "done" | "failed";
  text?: string;
  error?: string;
  model?: string;
  engine?: "agy" | "ollama";
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmBrokerResult {
  text: string;
  model: string;
  engine: "agy" | "ollama";
  inputTokens?: number;
  outputTokens?: number;
}

interface InternalTaskRecord {
  taskId: string;
  input: LlmBrokerEnqueueInput;
  status: "queued" | "claimed" | "settled";
  createdAt: number;
  claimedAt?: number;
  claimedBy?: string;
  claimTimeoutMs: number;
  executionTimeoutMs: number;
  claimTimer: NodeJS.Timeout | null;
  execTimer: NodeJS.Timeout | null;
  resolve: (result: LlmBrokerResult) => void;
  reject: (err: Error) => void;
  promise: Promise<LlmBrokerResult>;
}

interface LlmBrokerGlobalState {
  tasks: Map<string, InternalTaskRecord>;
  queue: string[];
}

const GLOBAL_BROKER_KEY = "__newsstudioLlmBrokerState__";
const DEFAULT_CLAIM_TIMEOUT_MS = 3500;
const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000;
const STALE_TASK_TTL_MS = 5 * 60 * 1000;
const DB_STALE_CLEANUP_AGE_MS = 10 * 60 * 1000;
const DB_POLL_INTERVAL_MS = 500;

export class LlmBrokerTimeoutError extends Error {
  readonly code: "CLAIM_TIMEOUT" | "EXECUTION_TIMEOUT";
  constructor(code: "CLAIM_TIMEOUT" | "EXECUTION_TIMEOUT", message: string) {
    super(message);
    this.name = "LlmBrokerTimeoutError";
    this.code = code;
  }
}

function getBrokerState(): LlmBrokerGlobalState {
  const g = globalThis as unknown as Record<string, LlmBrokerGlobalState | undefined>;
  if (!g[GLOBAL_BROKER_KEY]) {
    g[GLOBAL_BROKER_KEY] = {
      tasks: new Map<string, InternalTaskRecord>(),
      queue: [],
    };
  }
  return g[GLOBAL_BROKER_KEY]!;
}

function cleanupRecord(state: LlmBrokerGlobalState, taskId: string): InternalTaskRecord | null {
  const rec = state.tasks.get(taskId);
  if (!rec) return null;
  if (rec.claimTimer) {
    clearTimeout(rec.claimTimer);
    rec.claimTimer = null;
  }
  if (rec.execTimer) {
    clearTimeout(rec.execTimer);
    rec.execTimer = null;
  }
  state.tasks.delete(taskId);
  const idx = state.queue.indexOf(taskId);
  if (idx !== -1) {
    state.queue.splice(idx, 1);
  }
  return rec;
}

function sweepStaleTasks(state: LlmBrokerGlobalState): void {
  const now = Date.now();
  for (const [id, rec] of state.tasks.entries()) {
    if (now - rec.createdAt > STALE_TASK_TTL_MS) {
      cleanupRecord(state, id);
      rec.status = "settled";
      rec.reject(new LlmBrokerTimeoutError("EXECUTION_TIMEOUT", "LLM task expired"));
    }
  }
}

export function resolveClaimTimeoutMs(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }
  const envVal = Number(process.env.LLM_WORKER_CLAIM_TIMEOUT_MS || "");
  if (Number.isFinite(envVal) && envVal > 0) {
    return envVal;
  }
  return DEFAULT_CLAIM_TIMEOUT_MS;
}

export function enqueueLlmTask(input: LlmBrokerEnqueueInput): {
  taskId: string;
  wait: () => Promise<LlmBrokerResult>;
} {
  const state = getBrokerState();
  sweepStaleTasks(state);

  const taskId = crypto.randomUUID();
  const claimTimeoutMs = resolveClaimTimeoutMs(input.claimTimeoutMs);
  const executionTimeoutMs = input.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;

  let resolveFn!: (result: LlmBrokerResult) => void;
  let rejectFn!: (err: Error) => void;
  const promise = new Promise<LlmBrokerResult>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  const rec: InternalTaskRecord = {
    taskId,
    input,
    status: "queued",
    createdAt: Date.now(),
    claimTimeoutMs,
    executionTimeoutMs,
    claimTimer: null,
    execTimer: null,
    resolve: resolveFn,
    reject: rejectFn,
    promise,
  };

  rec.claimTimer = setTimeout(() => {
    if (rec.status !== "queued") return;
    cleanupRecord(state, taskId);
    rec.status = "settled";
    rec.reject(
      new LlmBrokerTimeoutError(
        "CLAIM_TIMEOUT",
        `No local worker claimed LLM task ${taskId} within ${claimTimeoutMs}ms`
      )
    );
  }, claimTimeoutMs);
  rec.claimTimer.unref?.();

  state.tasks.set(taskId, rec);
  state.queue.push(taskId);

  return {
    taskId,
    wait: () => rec.promise,
  };
}

export async function enqueueAndWaitLlmTask(
  input: LlmBrokerEnqueueInput
): Promise<LlmBrokerResult> {
  const { wait } = enqueueLlmTask(input);
  return wait();
}

export function claimNextLlmTask(workerId = "local-worker"): LlmBrokerClaimedTask | null {
  const state = getBrokerState();
  sweepStaleTasks(state);

  while (state.queue.length > 0) {
    const nextId = state.queue.shift()!;
    const rec = state.tasks.get(nextId);
    if (!rec || rec.status !== "queued") continue;

    if (rec.claimTimer) {
      clearTimeout(rec.claimTimer);
      rec.claimTimer = null;
    }

    rec.status = "claimed";
    rec.claimedAt = Date.now();
    rec.claimedBy = workerId;

    rec.execTimer = setTimeout(() => {
      if (rec.status !== "claimed") return;
      cleanupRecord(state, rec.taskId);
      rec.status = "settled";
      rec.reject(
        new LlmBrokerTimeoutError(
          "EXECUTION_TIMEOUT",
          `Local worker timed out executing LLM task ${rec.taskId} after ${rec.executionTimeoutMs}ms`
        )
      );
    }, rec.executionTimeoutMs);
    rec.execTimer.unref?.();

    return {
      taskId: rec.taskId,
      prompt: rec.input.prompt,
      systemPrompt: rec.input.systemPrompt,
      schema: rec.input.schema,
      model: rec.input.model,
      effort: rec.input.effort,
      createdAt: rec.createdAt,
    };
  }

  return null;
}

export function completeLlmTask(
  taskId: string,
  payload: LlmBrokerCompletePayload
): boolean {
  const state = getBrokerState();
  const rec = cleanupRecord(state, taskId);
  if (!rec || rec.status === "settled") {
    return false;
  }

  rec.status = "settled";

  if (payload.status === "done" && typeof payload.text === "string") {
    rec.resolve({
      text: payload.text,
      model: payload.model || rec.input.model || "agy-local",
      engine: payload.engine || "agy",
      inputTokens: payload.inputTokens,
      outputTokens: payload.outputTokens,
    });
    return true;
  }

  const errMsg = payload.error || "Local worker failed LLM task without error message";
  rec.reject(new Error(errMsg));
  return true;
}

export function getLlmBrokerStats(): { queued: number; claimed: number } {
  const state = getBrokerState();
  let queued = 0;
  let claimed = 0;
  for (const rec of state.tasks.values()) {
    if (rec.status === "queued") queued += 1;
    else if (rec.status === "claimed") claimed += 1;
  }
  return { queued, claimed };
}

export function resetLlmBrokerForTests(): void {
  const state = getBrokerState();
  for (const id of [...state.tasks.keys()]) {
    const rec = cleanupRecord(state, id);
    if (rec && rec.status !== "settled") {
      rec.status = "settled";
      rec.reject(new Error("Broker reset"));
    }
  }
  state.queue.length = 0;
}

// ─── Shared SystemSetting Write-Through DB Persistence Helpers ─────────────

export function isBrokerDbEnabled(): boolean {
  if (process.env.VITEST === "true") {
    return process.env.LLM_BROKER_FORCE_DB_IN_TEST === "true";
  }
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function persistBrokerQueuedRow(
  rowId: string,
  queuedKey: string,
  payload: unknown
): Promise<boolean> {
  if (!isBrokerDbEnabled()) return false;
  try {
    const cutoff = new Date(Date.now() - DB_STALE_CLEANUP_AGE_MS);
    await prisma.systemSetting
      .deleteMany({
        where: {
          key: { startsWith: "broker:" },
          createdAt: { lt: cutoff },
        },
      })
      .catch(() => {});

    await prisma.systemSetting.create({
      data: {
        id: rowId,
        companyId: null,
        key: queuedKey,
        value: JSON.stringify(payload),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function markBrokerRowClaimed(
  rowId: string,
  queuedKey: string,
  claimedKey: string
): Promise<void> {
  if (!isBrokerDbEnabled()) return;
  try {
    await prisma.systemSetting.updateMany({
      where: { id: rowId, key: queuedKey },
      data: { key: claimedKey },
    });
  } catch {
    // Best-effort sync
  }
}

export async function claimNextBrokerRowFromDb<T>(
  queuedKeyPrefix: string,
  buildClaimedKey: (taskId: string) => string,
  extractTaskId: (rowValue: string, rowKey: string) => { taskId: string; data: T } | null
): Promise<T | null> {
  if (!isBrokerDbEnabled()) return null;
  try {
    const candidates = await prisma.systemSetting.findMany({
      where: { key: { startsWith: queuedKeyPrefix } },
      orderBy: { createdAt: "asc" },
      take: 5,
    });
    for (const row of candidates) {
      const parsed = extractTaskId(row.value, row.key);
      if (!parsed) continue;
      const claimedKey = buildClaimedKey(parsed.taskId);
      const updated = await prisma.systemSetting.updateMany({
        where: { id: row.id, key: row.key },
        data: { key: claimedKey },
      });
      if (updated.count === 1) {
        return parsed.data;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function settleBrokerRowInDb(
  rowId: string,
  allowedKeys: string[],
  settledKey: string,
  payload: unknown
): Promise<boolean> {
  if (!isBrokerDbEnabled()) return false;
  try {
    const updated = await prisma.systemSetting.updateMany({
      where: {
        id: rowId,
        key: { in: allowedKeys },
      },
      data: {
        key: settledKey,
        value: JSON.stringify(payload),
      },
    });
    return updated.count > 0;
  } catch {
    return false;
  }
}

export async function deleteBrokerRowFromDb(rowId: string): Promise<void> {
  if (!isBrokerDbEnabled()) return;
  try {
    await prisma.systemSetting.deleteMany({
      where: { id: rowId },
    });
  } catch {
    // Ignore cleanup errors
  }
}

export function attachBrokerDbObserver<TComplete>(opts: {
  rowId: string;
  claimedKey: string;
  settledKey: string;
  onRemoteClaimed: () => void;
  onRemoteSettled: (payload: TComplete) => void;
  basePromise: Promise<unknown>;
}): void {
  if (!isBrokerDbEnabled()) return;

  let stopped = false;
  let inFlight = false;

  const stop = () => {
    stopped = true;
    clearInterval(pollTimer);
  };

  const pollTimer = setInterval(() => {
    if (stopped || inFlight) return;
    inFlight = true;
    void (async () => {
      try {
        const row = await prisma.systemSetting.findUnique({
          where: { id: opts.rowId },
        });
        if (!row || stopped) return;
        if (row.key === opts.claimedKey) {
          opts.onRemoteClaimed();
        } else if (row.key === opts.settledKey) {
          const parsed = JSON.parse(row.value) as TComplete;
          stop();
          opts.onRemoteSettled(parsed);
        }
      } catch {
        // Ignore transient DB poll errors
      } finally {
        inFlight = false;
      }
    })();
  }, DB_POLL_INTERVAL_MS);
  pollTimer.unref?.();

  void opts.basePromise.finally(() => {
    stop();
    void deleteBrokerRowFromDb(opts.rowId);
  });
}

// ─── Persisted Cross-Replica LLM Broker Wrappers ───────────────────────────

function transitionLocalLlmTaskToClaimed(taskId: string, workerId: string): void {
  const state = getBrokerState();
  const rec = state.tasks.get(taskId);
  if (!rec || rec.status !== "queued") return;

  if (rec.claimTimer) {
    clearTimeout(rec.claimTimer);
    rec.claimTimer = null;
  }

  rec.status = "claimed";
  rec.claimedAt = Date.now();
  rec.claimedBy = workerId;

  const qIdx = state.queue.indexOf(taskId);
  if (qIdx !== -1) {
    state.queue.splice(qIdx, 1);
  }

  rec.execTimer = setTimeout(() => {
    if (rec.status !== "claimed") return;
    cleanupRecord(state, rec.taskId);
    rec.status = "settled";
    rec.reject(
      new LlmBrokerTimeoutError(
        "EXECUTION_TIMEOUT",
        `Local worker timed out executing LLM task ${rec.taskId} after ${rec.executionTimeoutMs}ms`
      )
    );
  }, rec.executionTimeoutMs);
  rec.execTimer.unref?.();
}

export async function enqueueLlmTaskPersisted(input: LlmBrokerEnqueueInput): Promise<{
  taskId: string;
  wait: () => Promise<LlmBrokerResult>;
}> {
  const handle = enqueueLlmTask(input);
  const { taskId } = handle;
  const rowId = `broker_llm_${taskId}`;
  const queuedKey = `broker:llm:queued:${taskId}`;
  const claimedKey = `broker:llm:claimed:${taskId}`;
  const settledKey = `broker:llm:settled:${taskId}`;

  const persisted = await persistBrokerQueuedRow(rowId, queuedKey, {
    taskId,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    schema: input.schema,
    model: input.model,
    effort: input.effort,
    createdAt: Date.now(),
  });

  if (persisted) {
    const basePromise = handle.wait();
    attachBrokerDbObserver<LlmBrokerCompletePayload>({
      rowId,
      claimedKey,
      settledKey,
      onRemoteClaimed: () => transitionLocalLlmTaskToClaimed(taskId, "remote-replica-worker"),
      onRemoteSettled: (payload) => {
        completeLlmTask(taskId, payload);
      },
      basePromise,
    });
    return {
      taskId,
      wait: () => basePromise,
    };
  }

  return handle;
}

export async function claimNextLlmTaskPersisted(
  workerId = "local-worker"
): Promise<LlmBrokerClaimedTask | null> {
  const localTask = claimNextLlmTask(workerId);
  if (localTask) {
    void markBrokerRowClaimed(
      `broker_llm_${localTask.taskId}`,
      `broker:llm:queued:${localTask.taskId}`,
      `broker:llm:claimed:${localTask.taskId}`
    );
    return localTask;
  }

  return claimNextBrokerRowFromDb<LlmBrokerClaimedTask>(
    "broker:llm:queued:",
    (taskId) => `broker:llm:claimed:${taskId}`,
    (rowValue) => {
      const parsed = JSON.parse(rowValue) as LlmBrokerClaimedTask;
      if (!parsed || typeof parsed.taskId !== "string" || typeof parsed.prompt !== "string") {
        return null;
      }
      return { taskId: parsed.taskId, data: parsed };
    }
  );
}

export async function completeLlmTaskPersisted(
  taskId: string,
  payload: LlmBrokerCompletePayload
): Promise<boolean> {
  const localCompleted = completeLlmTask(taskId, payload);
  if (localCompleted) {
    void deleteBrokerRowFromDb(`broker_llm_${taskId}`);
    return true;
  }

  return settleBrokerRowInDb(
    `broker_llm_${taskId}`,
    [`broker:llm:queued:${taskId}`, `broker:llm:claimed:${taskId}`],
    `broker:llm:settled:${taskId}`,
    payload
  );
}
