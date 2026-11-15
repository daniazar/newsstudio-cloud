import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import * as tenantModule from "@/lib/tenant";
import * as rateLimitModule from "@/lib/security/rateLimit";
import * as modernTtsClient from "@/lib/tts/modernTtsClient";

describe("POST /api/voice-settings/preview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.spyOn(tenantModule, "requireTenant").mockResolvedValue({
      ok: true,
      tenant: { userId: "user_1", orgId: "org_preview_test", isDefaultOrg: true },
    });
    vi.spyOn(rateLimitModule, "checkRateLimit").mockReturnValue({
      allowed: true,
      limit: 15,
      remaining: 14,
      resetTime: Date.now() + 60_000,
      retryAfterSeconds: 60,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("enforces requireTenant() authentication", async () => {
    vi.spyOn(tenantModule, "requireTenant").mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/voice-settings/preview", {
      method: "POST",
      body: JSON.stringify({ text: "Hello world" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("enforces AI_EXPENSIVE rate limiting", async () => {
    vi.spyOn(rateLimitModule, "checkRateLimit").mockReturnValueOnce({
      allowed: false,
      limit: 15,
      remaining: 0,
      resetTime: Date.now() + 30_000,
      retryAfterSeconds: 30,
    });

    const req = new NextRequest("http://localhost:3000/api/voice-settings/preview", {
      method: "POST",
      body: JSON.stringify({ text: "Hello world" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 503 with remoteWorkerRequired in production when Modern-TTS is unset or localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MODERN_TTS_SERVER_URL", "http://localhost:8005");
    const ttsSpy = vi.spyOn(modernTtsClient, "generateAudioWithModernTts");

    const req = new NextRequest("https://newsstudio.up.railway.app/api/voice-settings/preview", {
      method: "POST",
      body: JSON.stringify({ text: "Test voice preview" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.remoteWorkerRequired).toBe(true);
    expect(ttsSpy).not.toHaveBeenCalled();
  });

  it("synthesizes audio/wav when Modern-TTS is available in local dev", async () => {
    const fakeWav = Buffer.from("RIFF_PREVIEW_WAV");
    const ttsSpy = vi
      .spyOn(modernTtsClient, "generateAudioWithModernTts")
      .mockResolvedValueOnce(fakeWav as unknown as modernTtsClient.ModernTtsBuffer);

    const req = new NextRequest("http://localhost:3000/api/voice-settings/preview", {
      method: "POST",
      body: JSON.stringify({
        text: "Breaking news live test",
        engine: "piper",
        checkpoint: "en_US-lessac-high",
      }),
    });

    const res = await POST(req);
    const bytes = Buffer.from(await res.arrayBuffer());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/wav");
    expect(bytes.toString()).toBe("RIFF_PREVIEW_WAV");
    expect(ttsSpy).toHaveBeenCalledTimes(1);
  });
});
