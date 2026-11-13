import { NextRequest, NextResponse } from "next/server";
import { generateAudioWithModernTts, type ModernTtsOptions } from "@/lib/tts/modernTtsClient";

export async function POST(req: NextRequest) {
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
