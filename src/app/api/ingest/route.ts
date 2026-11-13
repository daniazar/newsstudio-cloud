import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { ingestFeeds } from "@/lib/rss/parser";
import { requireTenant } from "@/lib/tenant";
import { requireWorkerKey } from "@/lib/workerAuth";

/**
 * POST /api/ingest — Trigger RSS feed ingestion.
 * Requires either an active tenant session or a valid worker API key.
 * Tries Inngest first; falls back to direct execution if Inngest dev server isn't running.
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

    // Try Inngest first
    try {
      await inngest.send({
        name: "news/ingest",
        data: { feedIds, companyId: tenantOrgId },
      });

      return NextResponse.json({
        success: true,
        message: "Ingestion triggered via Inngest",
        mode: "async",
      });
    } catch (inngestError) {
      // Inngest dev server not running — execute directly
      console.warn(
        "[API] Inngest unavailable, running ingestion directly:",
        inngestError instanceof Error ? inngestError.message : inngestError
      );

      const results = await ingestFeeds(feedIds, tenantOrgId);

      return NextResponse.json({
        success: true,
        message: "Ingestion completed directly (Inngest not available)",
        mode: "direct",
        results,
      });
    }
  } catch (error) {
    console.error("[API] Ingestion failed:", error);
    return NextResponse.json(
      { error: "Ingestion failed" },
      { status: 500 }
    );
  }
}
