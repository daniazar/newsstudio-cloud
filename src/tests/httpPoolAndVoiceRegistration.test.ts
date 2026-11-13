import { describe, it, expect } from "vitest";
import {
  globalHttpAgent,
  globalHttpsAgent,
  getPooledAgentForUrl,
  pooledFetch,
} from "@/lib/network/httpPool";
import {
  registerVoiceInModernTts,
  listRegisteredVoicesFromModernTts,
} from "@/lib/tts/modernTtsClient";

describe("Phase 6: HTTP Keep-Alive Connection Pooling & Modern-TTS Dynamic Voice Registration", () => {
  describe("1. HTTP Keep-Alive Connection Pooling", () => {
    it("configures persistent HTTP and HTTPS agents with keepAlive and socket limits", () => {
      const httpOptions = (globalHttpAgent as any).options || globalHttpAgent;
      expect(httpOptions.keepAlive).toBe(true);
      expect(globalHttpAgent!.maxSockets).toBe(64);
      expect(globalHttpAgent!.maxFreeSockets).toBe(16);

      const httpsOptions = (globalHttpsAgent as any).options || globalHttpsAgent;
      expect(httpsOptions.keepAlive).toBe(true);
      expect(globalHttpsAgent!.maxSockets).toBe(64);
      expect(globalHttpsAgent!.maxFreeSockets).toBe(16);
    });

    it("resolves the correct pooled agent based on URL protocol", () => {
      const httpAgent = getPooledAgentForUrl("http://localhost:8005/tts/generate");
      expect(httpAgent).toBe(globalHttpAgent);

      const httpsAgent = getPooledAgentForUrl("https://api.openai.com/v1/chat/completions");
      expect(httpsAgent).toBe(globalHttpsAgent);
    });

    it("automatically injects Keep-Alive headers into pooled requests", async () => {
      // Mock global fetch to verify headers passed
      const originalFetch = globalThis.fetch;
      let capturedInit: any = null;

      globalThis.fetch = (async (url: any, init: any) => {
        capturedInit = init;
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }) as any;

      try {
        await pooledFetch("http://localhost:8005/health");
        expect(capturedInit).toBeDefined();
        expect(capturedInit.keepalive).toBe(true);
        expect(capturedInit.headers.get("Connection")).toBe("keep-alive");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("2. Modern-TTS Dynamic Voice Registration", () => {
    it("dispatches voice registration payload and handles response", async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: any = null;

      globalThis.fetch = (async (url: any, init: any) => {
        if (typeof url === "string" && url.includes("/tts/voices/register")) {
          capturedBody = JSON.parse(init.body);
          return new Response(
            JSON.stringify({
              success: true,
              voice_id: capturedBody.voice_id,
              status: "registered",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }) as any;

      try {
        const result = await registerVoiceInModernTts({
          voiceId: "cloned_valeria_custom",
          name: "Valeria Broadcast Anchor",
          engine: "piper",
          referenceAudioPath: "personas/valeria/ref.wav",
          language: "es",
          gender: "female",
          personaId: "persona_valeria_123",
          companyId: "org_test_voice",
        });

        expect(result.success).toBe(true);
        expect(result.voiceId).toBe("cloned_valeria_custom");
        expect(capturedBody.voice_id).toBe("cloned_valeria_custom");
        expect(capturedBody.language).toBe("es");
        expect(capturedBody.persona_id).toBe("persona_valeria_123");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("falls back gracefully to offline registration mode when Modern-TTS server is offline", async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async () => {
        throw new Error("ECONNREFUSED 127.0.0.1:8005");
      }) as any;

      try {
        const result = await registerVoiceInModernTts({
          voiceId: "offline_voice_test",
          name: "Offline Anchor",
          personaId: "persona_offline",
        });

        expect(result.success).toBe(true);
        expect(result.voiceId).toBe("offline_voice_test");
        expect(result.isMock).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("queries registered voices from Modern-TTS or returns empty list gracefully", async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (url: any) => {
        if (typeof url === "string" && url.includes("/tts/voices")) {
          return new Response(
            JSON.stringify([
              { voice_id: "ruby_es", name: "Ruby Primary" },
              { voice_id: "diego_ar", name: "Diego Financial" },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      }) as any;

      try {
        const voices = await listRegisteredVoicesFromModernTts();
        expect(voices).toHaveLength(2);
        expect(voices[0].voice_id).toBe("ruby_es");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
