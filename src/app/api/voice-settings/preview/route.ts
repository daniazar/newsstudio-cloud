import { NextRequest, NextResponse } from "next/server";
import { generateAudioWithModernTts, type ModernTtsOptions } from "@/lib/tts/modernTtsClient";
import { requireTenant } from "@/lib/tenant";
import { checkRateLimit, rateLimitResponse, RateLimitTiers } from "@/lib/security/rateLimit";

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
  if (process.env.NODE_ENV === "production" && isLocalhost) {
    return NextResponse.json(
      {
        error:
          "Direct localhost Modern-TTS calls are disabled in production; routing preview to local worker.",
        remoteWorkerRequired: true,
      },
      { status: 503 }
    );
  }

  const startTime = performance.now();
  try {
    const body = await req.json();
    const {
      text = "Welcome to Ruby News Studio. Testing voice synthesis calibration.",
      engine = "piper",
      checkpoint = "en_US-lessac-high",
      personaId = "ruby",
      referenceAudio = "Emily.wav",
      pitchShift = 0.0,
      speedFactor = 1.0,
      language = "auto",
      applyYeismo = true
    } = body;

    const audioBuffer = await generateAudioWithModernTts(text, referenceAudio, {
      engine: engine as ModernTtsOptions["engine"],
      checkpoint,
      personaId,
      pitchShift: Number(pitchShift),
      speedFactor: Number(speedFactor),
      language,
      applyYeismo
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audioBuffer.length),
        "X-Synthesis-Latency-Ms": String(elapsedMs),
        "X-Synthesis-Engine": engine,
        "X-Synthesis-Model": checkpoint
      }
    });
  } catch (err: unknown) {
    const elapsedMs = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    console.error("[VoicePreview API] Synthesis failed:", message);
    return NextResponse.json(
      {
        error: message,
        latencyMs: elapsedMs
      },
      { status: 500 }
    );
  }
}
