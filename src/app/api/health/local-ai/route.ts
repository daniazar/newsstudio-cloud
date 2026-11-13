import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || "http://127.0.0.1:8000";

    // Ping local Ollama instance
    let ollamaStatus = "offline";
    try {
      const ollamaRes = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000), // 2s timeout
      });
      if (ollamaRes.ok) ollamaStatus = "online";
    } catch {
      // Ignored
    }

    // Ping potential local Wan 2.2 / LivePortrait server
    let pythonWorkerStatus = "offline";
    try {
      const workerRes = await fetch(`${pythonWorkerUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (workerRes.ok) pythonWorkerStatus = "online";
    } catch {
      // Ignored
    }

    // In cloud deployments, Ollama & Python worker are optional sidecars; app-level health is advisory


    return NextResponse.json({
      status: (ollamaStatus === "online" || process.env.NODE_ENV === "production") ? "healthy" : "degraded",
      services: {
        ollama: ollamaStatus,
        python_worker: pythonWorkerStatus,
      },
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: String(error) },
      { status: 500 }
    );
  }
}
