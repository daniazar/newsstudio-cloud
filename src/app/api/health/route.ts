import { NextResponse } from "next/server";
import { getAggregatedSystemHealth } from "@/lib/health";

export async function GET() {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Health check timeout exceeded")), 2500)
    );
    const health = await Promise.race([getAggregatedSystemHealth(), timeoutPromise]);
    
    // Always return HTTP 200 with the full system status JSON payload to avoid DevTools console errors during polling
    const httpStatus = 200;
    
    return NextResponse.json(health, { 
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      }
    });
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: String(error), timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
