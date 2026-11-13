"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LOCAL_WORKER_WAKE_URL = "http://127.0.0.1:8765/wake";
const LOCAL_WORKER_STATUS_URL = "http://127.0.0.1:8765/status";

export interface LocalWorkerStatus {
  reachable: boolean;
  running?: boolean;
  busy?: boolean;
  activeJobId?: string | null;
  lastWakeAt?: string | null;
  raw?: Record<string, unknown>;
}

/**
 * Fire-and-forget ping to the developer/operator's local PC worker daemon
 * wake bridge (127.0.0.1:8765). Zero Railway requests; fails silently when
 * the local worker bridge is not running on the user's machine.
 */
export function pingLocalWorkerWake(reason?: string): void {
  if (typeof window === "undefined") return;
  try {
    void fetch(LOCAL_WORKER_WAKE_URL, {
      method: "POST",
      mode: "cors",
      headers: reason ? { "Content-Type": "application/json" } : undefined,
      body: reason ? JSON.stringify({ reason }) : undefined,
    }).catch(() => {});
  } catch {
    // Ignore synchronous fetch/CORS construction errors
  }
}

/**
 * Reads http://127.0.0.1:8765/status locally (zero Railway requests) ONLY when
 * `active` is true. Stops polling immediately when `active` becomes false or
 * the component unmounts.
 */
export function useLocalWorkerStatus(
  active: boolean,
  intervalMs = 5000
): { status: LocalWorkerStatus; refresh: () => Promise<void> } {
  const [status, setStatus] = useState<LocalWorkerStatus>({ reachable: false });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch(LOCAL_WORKER_STATUS_URL, {
        method: "GET",
        mode: "cors",
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      if (!res.ok) {
        setStatus({ reachable: false });
        return;
      }
      const data = (await res.json()) as Record<string, unknown>;
      if (!mountedRef.current) return;
      setStatus({
        reachable: true,
        running: typeof data.running === "boolean" ? data.running : true,
        busy: typeof data.busy === "boolean" ? data.busy : undefined,
        activeJobId: typeof data.activeJobId === "string" ? data.activeJobId : null,
        lastWakeAt: typeof data.lastWakeAt === "string" ? data.lastWakeAt : null,
        raw: data,
      });
    } catch {
      if (mountedRef.current) {
        setStatus({ reachable: false });
      }
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, Math.max(2000, intervalMs));
    return () => clearInterval(timer);
  }, [active, intervalMs, refresh]);

  return { status, refresh };
}
