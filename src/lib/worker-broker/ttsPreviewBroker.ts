import crypto from "crypto";
import {
  attachBrokerDbObserver,
  claimNextBrokerRowFromDb,
  deleteBrokerRowFromDb,
  markBrokerRowClaimed,
  persistBrokerQueuedRow,
  settleBrokerRowInDb,
} from "./llmBroker";

export interface TtsPreviewBrokerEnqueueInput {
  text: string;
  engine: string;
  checkpoint: string;
  personaId: string;
  referenceAudio: string;
  pitchShift: number;
  speedFactor: number;
  language: string;
  applyYeismo: boolean;
  claimTimeoutMs?: number;
  executionTimeoutMs?: number;
}

export interface TtsPreviewBrokerClaimedTask {
  taskId: string;
  text: string;
  engine: string;
  checkpoint: string;
  personaId: string;
  referenceAudio: string;
  pitchShift: number;
  speedFactor: number;
  language: string;
  applyYeismo: boolean;
  createdAt: number;
}

export interface TtsPreviewBrokerCompletePayload {
  status: "done" | "failed";
  audioBase64?: string;
  latencyMs?: number;
  engine?: string;
  model?: string;
  error?: string;
}

export interface TtsPreviewBrokerResult {
  audioBase64: string;
  latencyMs?: number;
  engine: string;
  model: string;
}

interface InternalTtsTaskRecord {
  taskId: string;
  input: TtsPreviewBrokerEnqueueInput;
  status: "queued" | "claimed" | "settled";
  createdAt: number;
  claimTimeoutMs: number;
  executionTimeoutMs: number;
  claimTimer: NodeJS.Timeout | null;
  execTimer: NodeJS.Timeout | null;
  resolve: (result: TtsPreviewBrokerResult) => void;
  reject: (err: Error) => void;
  promise: Promise<TtsPreviewBrokerResult>;
}

interface TtsBrokerGlobalState {
  tasks: Map<string, InternalTtsTaskRecord>;
  queue: string[];
}

const GLOBAL_TTS_BROKER_KEY = "__newsstudioTtsPreviewBrokerState__";
const DEFAULT_CLAIM_TIMEOUT_MS = 6000;
const DEFAULT_EXECUTION_TIMEOUT_MS = 90_000;
const STALE_TASK_TTL_MS = 5 * 60 * 1000;

export class TtsPreviewBrokerTimeoutError extends Error {
  readonly code: "CLAIM_TIMEOUT" | "EXECUTION_TIMEOUT";
  constructor(code: "CLAIM_TIMEOUT" | "EXECUTION_TIMEOUT", message: string) {
    super(message);
    this.name = "TtsPreviewBrokerTimeoutError";
    this.code = code;
  }
}

function getBrokerState(): TtsBrokerGlobalState {
  const g = globalThis as unknown as Record<string, TtsBrokerGlobalState | undefined>;
  if (!g[GLOBAL_TTS_BROKER_KEY]) {
    g[GLOBAL_TTS_BROKER_KEY] = {
      tasks: new Map<string, InternalTtsTaskRecord>(),
      queue: [],
    };
  }
  return g[GLOBAL_TTS_BROKER_KEY]!;
}

function cleanupRecord(state: TtsBrokerGlobalState, taskId: string): InternalTtsTaskRecord | null {
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

function sweepStaleTasks(state: TtsBrokerGlobalState): void {
  const now = Date.now();
  for (const [id, rec] of state.tasks.entries()) {
    if (now - rec.createdAt > STALE_TASK_TTL_MS) {
      cleanupRecord(state, id);
      rec.status = "settled";
      rec.reject(new TtsPreviewBrokerTimeoutError("EXECUTION_TIMEOUT", "TTS preview task expired"));
    }
  }
}

export function resolveTtsClaimTimeoutMs(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }
  const envVal = Number(process.env.TTS_PREVIEW_CLAIM_TIMEOUT_MS || "");
  if (Number.isFinite(envVal) && envVal > 0) {
    return envVal;
  }
  return DEFAULT_CLAIM_TIMEOUT_MS;
}

export function enqueueTtsPreviewTask(input: TtsPreviewBrokerEnqueueInput): {
  taskId: string;
  wait: () => Promise<TtsPreviewBrokerResult>;
} {
  const state = getBrokerState();
  sweepStaleTasks(state);

  const taskId = crypto.randomUUID();
  const claimTimeoutMs = resolveTtsClaimTimeoutMs(input.claimTimeoutMs);
  const executionTimeoutMs = input.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;

  let resolveFn!: (result: TtsPreviewBrokerResult) => void;
  let rejectFn!: (err: Error) => void;
  const promise = new Promise<TtsPreviewBrokerResult>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  const rec: InternalTtsTaskRecord = {
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
      new TtsPreviewBrokerTimeoutError(
        "CLAIM_TIMEOUT",
        `No local worker claimed TTS preview task ${taskId} within ${claimTimeoutMs}ms`
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

function startExecTimer(state: TtsBrokerGlobalState, rec: InternalTtsTaskRecord): void {
  rec.execTimer = setTimeout(() => {
    if (rec.status !== "claimed") return;
    cleanupRecord(state, rec.taskId);
    rec.status = "settled";
    rec.reject(
      new TtsPreviewBrokerTimeoutError(
        "EXECUTION_TIMEOUT",
        `Local worker timed out executing TTS preview ${rec.taskId} after ${rec.executionTimeoutMs}ms`
      )
    );
  }, rec.executionTimeoutMs);
  rec.execTimer.unref?.();
}

export function claimNextTtsPreviewTask(): TtsPreviewBrokerClaimedTask | null {
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
    startExecTimer(state, rec);

    return {
      taskId: rec.taskId,
      text: rec.input.text,
      engine: rec.input.engine,
      checkpoint: rec.input.checkpoint,
      personaId: rec.input.personaId,
      referenceAudio: rec.input.referenceAudio,
      pitchShift: rec.input.pitchShift,
      speedFactor: rec.input.speedFactor,
      language: rec.input.language,
      applyYeismo: rec.input.applyYeismo,
      createdAt: rec.createdAt,
    };
  }

  return null;
}

export function completeTtsPreviewTask(
  taskId: string,
  payload: TtsPreviewBrokerCompletePayload
): boolean {
  const state = getBrokerState();
  const rec = cleanupRecord(state, taskId);
  if (!rec || rec.status === "settled") {
    return false;
  }

  rec.status = "settled";

  if (payload.status === "done" && typeof payload.audioBase64 === "string" && payload.audioBase64.length > 0) {
    rec.resolve({
      audioBase64: payload.audioBase64,
      latencyMs: payload.latencyMs,
      engine: payload.engine || rec.input.engine,
      model: payload.model || rec.input.checkpoint,
    });
    return true;
  }

  rec.reject(new Error(payload.error || "Local worker failed TTS preview without error message"));
  return true;
}

function transitionLocalTtsTaskToClaimed(taskId: string): void {
  const state = getBrokerState();
  const rec = state.tasks.get(taskId);
  if (!rec || rec.status !== "queued") return;

  if (rec.claimTimer) {
    clearTimeout(rec.claimTimer);
    rec.claimTimer = null;
  }

  rec.status = "claimed";
  const qIdx = state.queue.indexOf(taskId);
  if (qIdx !== -1) {
    state.queue.splice(qIdx, 1);
  }
  startExecTimer(state, rec);
}

export async function enqueueTtsPreviewTaskPersisted(
  input: TtsPreviewBrokerEnqueueInput
): Promise<{
  taskId: string;
  wait: () => Promise<TtsPreviewBrokerResult>;
}> {
  const handle = enqueueTtsPreviewTask(input);
  const { taskId } = handle;
  const rowId = `broker_tts_${taskId}`;
  const queuedKey = `broker:tts:queued:${taskId}`;
  const claimedKey = `broker:tts:claimed:${taskId}`;
  const settledKey = `broker:tts:settled:${taskId}`;

  const persisted = await persistBrokerQueuedRow(rowId, queuedKey, {
    taskId,
    text: input.text,
    engine: input.engine,
    checkpoint: input.checkpoint,
    personaId: input.personaId,
    referenceAudio: input.referenceAudio,
    pitchShift: input.pitchShift,
    speedFactor: input.speedFactor,
    language: input.language,
    applyYeismo: input.applyYeismo,
    createdAt: Date.now(),
  });

  if (persisted) {
    const basePromise = handle.wait();
    attachBrokerDbObserver<TtsPreviewBrokerCompletePayload>({
      rowId,
      claimedKey,
      settledKey,
      onRemoteClaimed: () => transitionLocalTtsTaskToClaimed(taskId),
      onRemoteSettled: (payload) => {
        completeTtsPreviewTask(taskId, payload);
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

export async function claimNextTtsPreviewTaskPersisted(): Promise<TtsPreviewBrokerClaimedTask | null> {
  const localTask = claimNextTtsPreviewTask();
  if (localTask) {
    void markBrokerRowClaimed(
      `broker_tts_${localTask.taskId}`,
      `broker:tts:queued:${localTask.taskId}`,
      `broker:tts:claimed:${localTask.taskId}`
    );
    return localTask;
  }

  return claimNextBrokerRowFromDb<TtsPreviewBrokerClaimedTask>(
    "broker:tts:queued:",
    (taskId) => `broker:tts:claimed:${taskId}`,
    (rowValue) => {
      const parsed = JSON.parse(rowValue) as TtsPreviewBrokerClaimedTask;
      if (!parsed || typeof parsed.taskId !== "string" || typeof parsed.text !== "string") {
        return null;
      }
      return { taskId: parsed.taskId, data: parsed };
    }
  );
}

export async function completeTtsPreviewTaskPersisted(
  taskId: string,
  payload: TtsPreviewBrokerCompletePayload
): Promise<boolean> {
  const localCompleted = completeTtsPreviewTask(taskId, payload);
  if (localCompleted) {
    void deleteBrokerRowFromDb(`broker_tts_${taskId}`);
    return true;
  }

  return settleBrokerRowInDb(
    `broker_tts_${taskId}`,
    [`broker:tts:queued:${taskId}`, `broker:tts:claimed:${taskId}`],
    `broker:tts:settled:${taskId}`,
    payload
  );
}

export function resetTtsPreviewBrokerForTests(): void {
  const state = getBrokerState();
  for (const id of [...state.tasks.keys()]) {
    const rec = cleanupRecord(state, id);
    if (rec && rec.status !== "settled") {
      rec.status = "settled";
      rec.reject(new Error("TTS preview broker reset"));
    }
  }
  state.queue.length = 0;
}
