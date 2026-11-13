import { NextResponse } from "next/server";
import { getAggregatedSystemHealth, checkMemoryHealth, type AggregatedHealth } from "@/lib/health";

export async function GET() {
  try {
    const timeoutPromise = new Promise<AggregatedHealth>((resolve) =>
      setTimeout(
        () =>
          resolve({
            status: "degraded",
            timestamp: new Date().toISOString(),
            memory: checkMemoryHealth(),
            services: {
              database: { status: "offline", error: "Health check timeout exceeded" },
              storage: { status: "offline", error: "Health check timeout exceeded" },
              ollama: { status: "offline" },
              tts: { status: "offline" },
              comfyui: { status: "offline" },
              sadtalker: { status: "offline" },
            },
            workers: {},
          }),
        2500
      )
    );
    const health = await Promise.race([getAggregatedSystemHealth(), timeoutPromise]);

    return NextResponse.json(health, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        memory: checkMemoryHealth(),
        services: {
          database: { status: "offline" },
          storage: { status: "offline" },
          ollama: { status: "offline" },
          tts: { status: "offline" },
          comfyui: { status: "offline" },
          sadtalker: { status: "offline" },
        },
        workers: {},
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
