import { NextRequest, NextResponse } from "next/server";
import { generateAudioWithModernTts, type ModernTtsOptions } from "@/lib/tts/modernTtsClient";
import { requireTenant } from "@/lib/tenant";
import { checkRateLimit, rateLimitResponse, RateLimitTiers } from "@/lib/security/rateLimit";
import { createLogger } from "@/lib/logger";
import { broadcastWorkerWake, enqueueTtsPreviewTaskPersisted } from "@/lib/worker-broker";

const log = createLogger("api:voice-settings:preview");

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const rl = checkRateLimit(orgId, RateLimitTiers.AI_EXPENSIVE);
  if (!rl.allowed) return rateLimitResponse(rl);

  const ttsUrl =
    process.env.MODERN_TTS_SERVER_URL ||
    process.env.NEXT_PUBLIC_MODERN_TTS_SERVER_URL ||
    "http://localhost:8005";
  const isLocalhost =
    ttsUrl.includes("localhost") || ttsUrl.includes("127.0.0.1") || ttsUrl.includes("::1");

  const startTime = performance.now();
  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const text =
    typeof parsedBody.text === "string" && parsedBody.text.trim().length > 0
      ? parsedBody.text
      : "Welcome to Ruby News Studio. Testing voice synthesis calibration.";
  const engine =
    typeof parsedBody.engine === "string" && parsedBody.engine ? parsedBody.engine : "piper";
  const checkpoint =
    typeof parsedBody.checkpoint === "string" && parsedBody.checkpoint
      ? parsedBody.checkpoint
      : "en_US-lessac-high";
  const personaId =
    typeof parsedBody.personaId === "string" && parsedBody.personaId ? parsedBody.personaId : "ruby";
  const referenceAudio =
    typeof parsedBody.referenceAudio === "string" && parsedBody.referenceAudio
      ? parsedBody.referenceAudio
      : "Emily.wav";
  const pitchShift = Number(parsedBody.pitchShift ?? 0.0);
  const speedFactor = Number(parsedBody.speedFactor ?? 1.0);
  const language =
    typeof parsedBody.language === "string" && parsedBody.language ? parsedBody.language : "auto";
  const applyYeismo =
    parsedBody.applyYeismo !== undefined ? Boolean(parsedBody.applyYeismo) : true;

  if (process.env.NODE_ENV === "production" && isLocalhost) {
    try {
      const handle = await enqueueTtsPreviewTaskPersisted({
        text,
        engine,
        checkpoint,
        personaId,
        referenceAudio,
        pitchShift: Number.isFinite(pitchShift) ? pitchShift : 0.0,
        speedFactor: Number.isFinite(speedFactor) ? speedFactor : 1.0,
        language,
        applyYeismo,
      });
      void broadcastWorkerWake("tts_preview");
      const result = await handle.wait();
      const audioBuffer = Buffer.from(result.audioBase64, "base64");
      const elapsedMs = result.latencyMs ?? Math.round(performance.now() - startTime);

      return new NextResponse(new Uint8Array(audioBuffer), {
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": String(audioBuffer.length),
          "X-Synthesis-Latency-Ms": String(elapsedMs),
          "X-Synthesis-Engine": result.engine,
          "X-Synthesis-Model": result.model,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn({ err: message, orgId }, "Cloud-relayed TTS preview unavailable");
      // Return HTTP 200 JSON so browsers never emit noisy 503 console errors when worker is offline
      return NextResponse.json(
        {
          ok: false,
          remoteWorkerRequired: true,
          error:
            "Local PC worker did not respond for voice preview. Ensure npm run worker is running alongside Modern-TTS (:8005).",
          detail: message,
        },
        { status: 200 }
      );
    }
  }

  try {
    const audioBuffer = await generateAudioWithModernTts(text, referenceAudio, {
      engine: engine as ModernTtsOptions["engine"],
      checkpoint,
      personaId,
      pitchShift: Number.isFinite(pitchShift) ? pitchShift : 0.0,
      speedFactor: Number.isFinite(speedFactor) ? speedFactor : 1.0,
      language,
      applyYeismo,
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audioBuffer.length),
        "X-Synthesis-Latency-Ms": String(elapsedMs),
        "X-Synthesis-Engine": engine,
        "X-Synthesis-Model": checkpoint,
      },
    });
  } catch (err: unknown) {
    const elapsedMs = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message, orgId, latencyMs: elapsedMs }, "VoicePreview API synthesis failed");
    return NextResponse.json(
      {
        error: message,
        latencyMs: elapsedMs,
      },
      { status: 500 }
    );
  }
}
