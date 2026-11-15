import React, { act } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { useModernTts, type UseModernTtsReturn } from "@/lib/tts/useModernTts";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function ModernTtsProbe({
  onUpdate,
}: {
  onUpdate: (val: UseModernTtsReturn) => void;
}) {
  const tts = useModernTts();
  onUpdate(tts);
  return null;
}

describe("useModernTts cloud browser guard", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
    });
  });

  it("does not probe localhost:8005 from a non-localhost cloud browser origin", async () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://newsstudio.up.railway.app/editor/story-123"),
      configurable: true,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    let latest: UseModernTtsReturn | null = null;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ModernTtsProbe
          onUpdate={(val) => {
            latest = val;
          }}
        />
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(latest!.serverOnline).toBe(false);
    expect(latest!.health?.status).toBe("offline");
    expect(latest!.activeProfile).toBe("studio");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("still probes localhost:8005 when running in browser on localhost", async () => {
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost:3000/editor/story-123"),
      configurable: true,
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok", service: "Modern-TTS-Server" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "ok",
            profile: "full",
            vram_allocated_mb: 1024,
            active_models: ["piper"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    let latest: UseModernTtsReturn | null = null;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ModernTtsProbe
          onUpdate={(val) => {
            latest = val;
          }}
        />
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(latest!.serverOnline).toBe(true);
    expect(latest!.activeProfile).toBe("full");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
