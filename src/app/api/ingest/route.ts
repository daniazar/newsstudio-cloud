import { NextRequest, NextResponse } from "next/server";
import { dispatchIngest } from "@/lib/orchestration/dispatch";
import { requireTenant } from "@/lib/tenant";
import { requireWorkerKey } from "@/lib/workerAuth";

/**
 * POST /api/ingest — Trigger RSS feed ingestion.
 * Requires either an active tenant session or a valid worker API key.
 */
export async function POST(request: NextRequest) {
  // Check worker key first (for background crons/workers)
  const workerErr = requireWorkerKey(request);
  let tenantOrgId: string | undefined = undefined;

  if (workerErr) {
    // If not a worker, require tenant authentication
    const tenantResult = await requireTenant();
    if (!tenantResult.ok) {
      return tenantResult.response;
    }
    tenantOrgId = tenantResult.tenant.orgId;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const feedIds = body.feedIds as string[] | undefined;

    const results = await dispatchIngest({ feedIds, companyId: tenantOrgId });

    return NextResponse.json({
      success: true,
      message: "Ingestion completed",
      mode: "direct",
      results,
    });
  } catch (error) {
    console.error("[API] Ingestion failed:", error);
    return NextResponse.json(
      { error: "Ingestion failed" },
      { status: 500 }
    );
  }
}
