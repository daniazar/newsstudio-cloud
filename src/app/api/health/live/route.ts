import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health/live
 * Ultra-fast liveness probe for Docker, Kubernetes, and Cloud Load Balancers.
 * Returns HTTP 200 within <50ms verifying process responsiveness and DB liveness.
 */
export async function GET() {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Liveness query timeout")), 1500)
    );

    // Fast 1+1 query or count query
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      timeoutPromise,
    ]);

    return NextResponse.json(
      { status: "ok", live: true, timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "error", live: false, error: message, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
