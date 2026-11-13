import WebSocket from "ws";

export interface SupabaseWakeConfig {
  url: string;
  serviceRoleKey: string;
}

export interface DueScheduleRow {
  id: string;
  companyId: string;
}

export const WORKER_WAKE_CHANNEL = "newsstudio-worker-wake";
export const WORKER_WAKE_EVENT = "wake";

export function resolveSupabaseConfigFromEnv(): SupabaseWakeConfig | null {
  const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceRoleKey) {
    return null;
  }
  return { url, serviceRoleKey };
}

/**
 * Fire-and-forget HTTP broadcast via Supabase Realtime Broadcast API.
 * Serverless/cloud routes never hold persistent sockets; this wakes local
 * listeners in <150ms and silently no-ops if Supabase env is unset.
 */
export async function broadcastWorkerWake(reason = "job_queued"): Promise<void> {
  const cfg = resolveSupabaseConfigFromEnv();
  if (!cfg) return;

  try {
    const res = await fetch(`${cfg.url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic: WORKER_WAKE_CHANNEL,
            event: WORKER_WAKE_EVENT,
            payload: { reason, ts: Date.now() },
          },
        ],
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) {
      // Never throw from a best-effort wake signal
      return;
    }
  } catch {
    // Ignore transient network errors; worker 15m safety sweep still catches jobs.
  }
}

/**
 * Ultra-cheap (<300 bytes) direct PostgREST check for QUEUED GenerationJobs
 * so the idle worker never hits Railway/MAIN_APP_URL when the queue is empty.
 */
export async function checkSupabaseQueuedJobs(cfg: SupabaseWakeConfig): Promise<boolean> {
  try {
    const endpoint = `${cfg.url}/rest/v1/GenerationJob?select=id&status=eq.QUEUED&limit=1`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return true; // Fail open so worker still checks Railway if REST errors
    const rows = (await res.json()) as unknown;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return true;
  }
}

/**
 * Direct PostgREST check for active Schedule rows whose nextRunAt <= now.
 */
export async function checkSupabaseDueSchedules(
  cfg: SupabaseWakeConfig
): Promise<DueScheduleRow[]> {
  try {
    const nowIso = encodeURIComponent(new Date().toISOString());
    const endpoint =
      `${cfg.url}/rest/v1/Schedule?select=id,companyId&isActive=eq.true` +
      `&nextRunAt=not.is.null&nextRunAt=lte.${nowIso}&limit=10`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return [];
    return rows.filter(
      (r): r is DueScheduleRow =>
        Boolean(r) &&
        typeof (r as { id?: unknown }).id === "string" &&
        typeof (r as { companyId?: unknown }).companyId === "string"
    );
  } catch {
    return [];
  }
}

export interface RealtimeListenerOptions {
  onWake: (reason: string) => void;
  onLog?: (msg: string) => void;
}

/**
 * Persistent WebSocket listener subscribed to `realtime:newsstudio-worker-wake`.
 * Handles Phoenix protocol join, 25s heartbeats, and exponential backoff reconnects.
 */
export function startSupabaseRealtimeListener(
  cfg: SupabaseWakeConfig,
  opts: RealtimeListenerOptions
): { stop: () => void } {
  let stopped = false;
  let ws: WebSocket | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let reconnectAttempt = 0;
  let refCounter = 1;

  const log = (msg: string) => {
    opts.onLog?.(msg);
  };

  const wsBase = cfg.url.replace(/^http/i, "ws");
  const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(cfg.serviceRoleKey)}&vsn=1.0.0`;
  const topic = `realtime:${WORKER_WAKE_CHANNEL}`;

  const clearTimers = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    clearTimers();
    const delayMs = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempt, 5));
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      if (!stopped) connect();
    }, delayMs);
    reconnectTimer.unref?.();
  };

  const connect = () => {
    if (stopped) return;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      log(`Realtime WebSocket init failed: ${err instanceof Error ? err.message : String(err)}`);
      scheduleReconnect();
      return;
    }

    ws.on("open", () => {
      reconnectAttempt = 0;
      const joinRef = String(refCounter++);
      ws?.send(
        JSON.stringify({
          topic,
          event: "phx_join",
          payload: {
            config: {
              broadcast: { self: false, ack: false },
            },
            access_token: cfg.serviceRoleKey,
          },
          ref: joinRef,
        })
      );

      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              topic: "phoenix",
              event: "heartbeat",
              payload: {},
              ref: String(refCounter++),
            })
          );
        }
      }, 25_000);
      heartbeatTimer.unref?.();

      log(`Supabase Realtime subscribed to ${topic}`);
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      try {
        const text = typeof raw === "string" ? raw : raw.toString("utf8");
        const msg = JSON.parse(text) as {
          topic?: string;
          event?: string;
          payload?: { event?: string; payload?: { reason?: string } };
        };

        if (msg.event === "broadcast") {
          const innerEvent = msg.payload?.event;
          if (!innerEvent || innerEvent === WORKER_WAKE_EVENT) {
            const reason = msg.payload?.payload?.reason || "supabase_broadcast";
            opts.onWake(reason);
          }
        }
      } catch {
        // Ignore malformed frames
      }
    });

    ws.on("error", (err: Error) => {
      log(`Supabase Realtime socket error: ${err.message}`);
    });

    ws.on("close", () => {
      ws = null;
      if (!stopped) {
        scheduleReconnect();
      }
    });
  };

  connect();

  return {
    stop: () => {
      stopped = true;
      clearTimers();
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
        ws = null;
      }
    },
  };
}
