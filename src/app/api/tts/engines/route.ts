import { NextResponse } from "next/server";
import { checkModernTtsHealth } from "@/lib/tts/modernTtsClient";

const MODERN_TTS_URL = process.env.MODERN_TTS_SERVER_URL || "http://localhost:8005";

export async function GET() {
  try {
    const fallbackEngines = [
      { id: "piper", name: "Piper Neural ONNX", available: true },
      { id: "f5_tts", name: "F5-TTS Flow Matching", available: false },
      { id: "xtts_v2", name: "XTTS v2 Multilingual", available: false },
      { id: "cosyvoice_3", name: "CosyVoice 3", available: false },
    ];

    const isLocalhost =
      !process.env.MODERN_TTS_SERVER_URL ||
      MODERN_TTS_URL.includes("localhost") ||
      MODERN_TTS_URL.includes("127.0.0.1");

    if (process.env.NODE_ENV === "production" && isLocalhost) {
      return NextResponse.json({
        available: false,
        status: "remote_worker_only",
        defaultEngine: process.env.DEFAULT_TTS_ENGINE || "f5_tts",
        defaultCheckpoint: process.env.DEFAULT_TTS_CHECKPOINT || "jpgallegoar/Spanish-F5",
        engines: fallbackEngines,
      });
    }

    const health = await checkModernTtsHealth();

    if (health.status !== "ok") {
      return NextResponse.json({
        available: false,
        status: health.status,
        defaultEngine: process.env.DEFAULT_TTS_ENGINE || "f5_tts",
        defaultCheckpoint: process.env.DEFAULT_TTS_CHECKPOINT || "jpgallegoar/Spanish-F5",
        engines: fallbackEngines,
      });
    }

    let engines = fallbackEngines;
    try {
      const res = await fetch(`${MODERN_TTS_URL}/api/models`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const models = await res.json();
        if (models && Array.isArray(models.engines)) {
          engines = models.engines;
        }
      }
    } catch {
      // Fallback gracefully to default engines if /api/models is slow or unresponsive
    }

    return NextResponse.json({
      available: true,
      status: "ok",
      device: health.device,
      gpu_name: health.gpu_name,
      defaultEngine: process.env.DEFAULT_TTS_ENGINE || "f5_tts",
      defaultCheckpoint: process.env.DEFAULT_TTS_CHECKPOINT || "jpgallegoar/Spanish-F5",
      engines,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to query TTS engines";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
