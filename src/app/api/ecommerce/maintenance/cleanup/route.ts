/**
 * src/app/api/ecommerce/maintenance/cleanup/route.ts
 *
 * Maintenance API: Automated 48-Hour Cache Hygiene & Orphaned Media Pruning.
 * GET: Performs a dry-run sweep and returns storage hygiene metrics.
 * POST: Performs real disk pruning, unlinking orphaned cache files older than 48h.
 */

import { NextRequest, NextResponse } from "next/server";
import { pruneExpiredEcommerceCache } from "@/lib/storage/cleanup";
import { compactDatabase, CompactDatabaseResult } from "@/lib/dbMaintenance";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const maxAgeHours = searchParams.get("maxAgeHours");
    const maxAgeMs = maxAgeHours ? parseFloat(maxAgeHours) * 3600 * 1000 : undefined;

    const summary = await pruneExpiredEcommerceCache({
      dryRun: true,
      maxAgeMs,
    });

    return NextResponse.json({
      success: true,
      mode: "dry_run",
      summary,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/ecommerce/maintenance/cleanup] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const maxAgeHours = body.maxAgeHours ? parseFloat(body.maxAgeHours) : undefined;
    const maxAgeMs = maxAgeHours ? maxAgeHours * 3600 * 1000 : undefined;
    const dryRun = Boolean(body.dryRun);
    const compactDb = Boolean(body.compactDb ?? true);

    const summary = await pruneExpiredEcommerceCache({
      dryRun,
      maxAgeMs,
    });

    let dbCompaction: CompactDatabaseResult | null = null;
    if (compactDb && !dryRun) {
      dbCompaction = await compactDatabase();
    }

    return NextResponse.json({
      success: true,
      mode: dryRun ? "dry_run" : "pruned",
      summary,
      dbCompaction,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/maintenance/cleanup] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
