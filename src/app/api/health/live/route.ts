import { NextResponse } from "next/server";

/**
 * GET /api/health/live
 * Ultra-fast zero-DB, zero-external-fetch liveness probe for Railway, Docker, and Load Balancers.
 * Returns HTTP 200 { status: "ok", timestamp } immediately.
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
