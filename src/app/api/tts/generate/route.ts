import { NextRequest, NextResponse } from "next/server";
import { generateAudioWithModernTts } from "@/lib/tts/modernTtsClient";
import { resolvePersonaVoiceSettings } from "@/lib/tts/personas";
import type { TtsEngineType } from "@/lib/tts/textPreprocessor";
import { requireTenant } from "@/lib/tenant";
import { checkRateLimit, rateLimitResponse, RateLimitTiers } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const rl = checkRateLimit(orgId, RateLimitTiers.AI_EXPENSIVE);
  if (!rl.allowed) return rateLimitResponse(rl);

  const ttsUrl = process.env.MODERN_TTS_SERVER_URL || "http://localhost:8005";
  const isLocalhost = ttsUrl.includes("localhost") || ttsUrl.includes("127.0.0.1");
  if (process.env.NODE_ENV === "production" && isLocalhost) {
    return NextResponse.json(
      {
        error: "Direct localhost Modern-TTS calls are disabled in production; queue audio generation jobs for the local worker instead.",
        remoteWorkerRequired: true,
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const {
      text,
      predefined_voice_id,
      engine,
      checkpoint,
      reference_audio_filename,
      instruct_text,
      language,
      pitch_shift,
      speed_factor,
      cadence_preset,
      apply_yeismo,
      disable_cloning_if_different_language,
      disableCloningIfDifferentLanguage,
      bypass_cache,
      bypassCache,
    } = body;

    const disableCloning = disable_cloning_if_different_language ?? disableCloningIfDifferentLanguage;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text prompt is required" }, { status: 400 });
    }

    const requestedEngine = (engine || process.env.DEFAULT_TTS_ENGINE || "piper") as string;
    const activeEngine = (requestedEngine === "chatterbox" ? "piper" : requestedEngine) as TtsEngineType;

    const startTime = Date.now();

    const personaId = body.persona_id || body.personaId;
    const voiceSettings = resolvePersonaVoiceSettings({
      personaId,
      language,
      engine: activeEngine,
      modelOverride: checkpoint,
      referenceAudioOverride: reference_audio_filename || predefined_voice_id,
      speed: speed_factor,
      pitchShift: pitch_shift,
      disableCloningIfDifferentLanguage: disableCloning,
    });

    const refPath = voiceSettings.referenceAudio;
    const activeCheckpoint = voiceSettings.checkpoint || checkpoint;

    const audioBuffer = await generateAudioWithModernTts(text, refPath, {
      engine: activeEngine,
      checkpoint: activeCheckpoint,
      personaId: voiceSettings.personaId,
      instructText: instruct_text,
      language: voiceSettings.language || language,
      pitchShift: pitch_shift ?? voiceSettings.pitchShift,
      speedFactor: speed_factor ?? voiceSettings.speedFactor,
      cadencePreset: cadence_preset || voiceSettings.cadencePreset,
      applyYeismo: apply_yeismo ?? voiceSettings.applyYeismo,
      disableCloningIfDifferentLanguage: disableCloning,
      bypassCache: Boolean(bypassCache ?? bypass_cache),
      enableFallback: (activeEngine === "omni" || (activeEngine as string) === "omnivoice") ? false : true,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Check if the caller explicitly requested JSON/base64
    const wantsJson = req.headers.get("accept")?.includes("application/json") || body.format === "json";
    if (wantsJson) {
      const base64 = Buffer.from(audioBuffer).toString("base64");
      return NextResponse.json({
        success: true,
        audio_b64: base64,
        format: "wav",
        duration_ms: Date.now() - startTime,
        used_engine: audioBuffer.usedEngine || activeEngine,
      });
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audioBuffer.length),
        "X-TTS-Engine": audioBuffer.usedEngine || activeEngine,
        "X-TTS-Duration-Seconds": duration,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "TTS Generation failed";
    console.error("[TTS Proxy] Error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
