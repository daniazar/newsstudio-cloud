import React, { act } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import type http from "http";
import { config } from "../../../../workers/pipeline-worker/config";
import { startLocalWakeServer } from "../../../../workers/pipeline-worker/index";
import * as serverLifecycle from "../../../../workers/pipeline-worker/serverLifecycle";
import * as modernTtsClient from "@/lib/tts/modernTtsClient";
import {
  LOCAL_WORKER_BASE_URL,
  pingLocalWorkerWake,
  useLocalWorkerStatus,
  type LocalWorkerStatus,
} from "@/lib/hooks/useLocalWorkerWake";
import nextConfig from "../../../../next.config";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function WorkerStatusProbe({
  onUpdate,
}: {
  onUpdate: (val: { status: LocalWorkerStatus; refresh: () => Promise<void> }) => void;
}) {
  const result = useLocalWorkerStatus(true, 0);
  onUpdate(result);
  return null;
}

describe("Local Worker Wake Port (8766) & Bridge Suite", () => {
  let server: http.Server | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = null;
    }
  });

  it("defaults WORKER_WAKE_PORT to 8766 to avoid CineZero (8765) collision", () => {
    expect(config.wakePort).toBe(8766);
    expect(LOCAL_WORKER_BASE_URL).toBe("http://127.0.0.1:8766");
  });

  it("serves /status with NewsStudio identity and /tts/preview WAV audio from wake server", async () => {
    const startTtsSpy = vi
      .spyOn(serverLifecycle, "startModernTtsServer")
      .mockResolvedValue();
    const fakeWav = Object.assign(Buffer.from("RIFF_LOCAL_BRIDGE_WAV"), {
      usedEngine: "piper" as const,
      isFallback: false,
      model: "en_US-lessac-high",
      latencyMs: 42,
      headers: {},
    }) as modernTtsClient.ModernTtsBuffer;
    const ttsSpy = vi
      .spyOn(modernTtsClient, "generateAudioWithModernTts")
      .mockResolvedValueOnce(fakeWav);

    server = startLocalWakeServer(0);
    await new Promise<void>((resolve) => {
      if (server!.listening) resolve();
      else server!.once("listening", resolve);
    });
    const port = (server.address() as { port: number }).port;

    // 1. /status verification
    const statusRes = await fetch(`http://127.0.0.1:${port}/status`);
    const statusJson = await statusRes.json();
    expect(statusRes.status).toBe(200);
    expect(statusRes.headers.get("Access-Control-Allow-Private-Network")).toBe("true");
    expect(statusJson.service).toBe("newsstudio-worker");
    expect(statusJson.running).toBe(true);
    expect(statusJson.busy).toBe(false);
    expect(statusJson.activeJobId).toBeNull();

    // 2. POST /tts/preview verification
    const previewRes = await fetch(`http://127.0.0.1:${port}/tts/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Local worker preview bridge test",
        engine: "piper",
        checkpoint: "en_US-lessac-high",
        personaId: "ruby",
        referenceAudio: "Emily.wav",
        pitchShift: 0.5,
        speedFactor: 1.1,
        language: "en-US",
        applyYeismo: false,
      }),
    });
    const wavBytes = Buffer.from(await previewRes.arrayBuffer());

    expect(previewRes.status).toBe(200);
    expect(previewRes.headers.get("Content-Type")).toBe("audio/wav");
    expect(previewRes.headers.get("Access-Control-Allow-Private-Network")).toBe("true");
    expect(previewRes.headers.get("Access-Control-Expose-Headers")).toContain(
      "X-Synthesis-Latency-Ms"
    );
    expect(wavBytes.toString()).toBe("RIFF_LOCAL_BRIDGE_WAV");
    expect(startTtsSpy).toHaveBeenCalledTimes(1);
    expect(ttsSpy).toHaveBeenCalledWith(
      "Local worker preview bridge test",
      "Emily.wav",
      expect.objectContaining({
        engine: "piper",
        checkpoint: "en_US-lessac-high",
        personaId: "ruby",
        pitchShift: 0.5,
        speedFactor: 1.1,
        language: "en-US",
        applyYeismo: false,
      })
    );
  });

  it("returns 503 JSON when Modern-TTS fails on /tts/preview", async () => {
    vi.spyOn(serverLifecycle, "startModernTtsServer").mockRejectedValueOnce(
      new Error("Modern-TTS directory missing")
    );

    server = startLocalWakeServer(0);
    await new Promise<void>((resolve) => {
      if (server!.listening) resolve();
      else server!.once("listening", resolve);
    });
    const port = (server.address() as { port: number }).port;

    const res = await fetch(`http://127.0.0.1:${port}/tts/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Fail test" }),
    });
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toContain("Modern-TTS directory missing");
  });

  it("rejects foreign worker payloads on port 8766 and accepts NewsStudio worker status", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, app: "cinezero-flow" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            service: "newsstudio-worker",
            running: true,
            busy: false,
            activeJobId: null,
            role: "full",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    let latest: { status: LocalWorkerStatus; refresh: () => Promise<void> } | null = null;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkerStatusProbe
          onUpdate={(val) => {
            latest = val;
          }}
        />
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8766/status",
      expect.objectContaining({ method: "GET", mode: "cors" })
    );
    expect(latest!.status.reachable).toBe(false);

    await act(async () => {
      await latest!.refresh();
    });
    expect(latest!.status.reachable).toBe(true);
    expect(latest!.status.running).toBe(true);
    expect(latest!.status.busy).toBe(false);
    expect(latest!.status.activeJobId).toBeNull();

    pingLocalWorkerWake("unit_test");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8766/wake",
      expect.objectContaining({ method: "POST", mode: "cors" })
    );

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("hardens COOP and CSP headers in next.config.ts for Clerk auth and :8766 bridge", async () => {
    const headerRules = await nextConfig.headers!();
    const rootRule = headerRules.find((rule) => rule.source === "/(.*)");
    expect(rootRule).toBeDefined();

    const headerMap = new Map(rootRule!.headers.map((h) => [h.key, h.value]));
    expect(headerMap.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");

    const csp = headerMap.get("Content-Security-Policy") || "";
    expect(csp).toContain("http://127.0.0.1:8766");
    expect(csp).toContain(
      "form-action 'self' https://*.clerk.accounts.dev https://accounts.google.com"
    );
  });

  it("rewrites /studio_environments/:path* to R2 public URL when NEXT_PUBLIC_S3_PUBLIC_URL is set", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_S3_PUBLIC_URL", "https://pub-test-r2.r2.dev/");
    const freshConfig = (await import("../../../../next.config")).default;
    const rules = await freshConfig.rewrites!();
    vi.unstubAllEnvs();

    expect(rules).toEqual(
      expect.arrayContaining([
        {
          source: "/avatars/:path*",
          destination: "https://pub-test-r2.r2.dev/avatars/:path*",
        },
        {
          source: "/studio_plates/:path*",
          destination: "https://pub-test-r2.r2.dev/studio_plates/:path*",
        },
        {
          source: "/studio_environments/:path*",
          destination: "https://pub-test-r2.r2.dev/studio_environments/:path*",
        },
      ])
    );
  });
});
