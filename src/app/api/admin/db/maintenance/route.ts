import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";
import fs from "fs";
import path from "path";

function getDatabaseFilePaths() {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const walPath = path.resolve(process.cwd(), "dev.db-wal");
  const shmPath = path.resolve(process.cwd(), "dev.db-shm");
  return { dbPath, walPath, shmPath };
}

function getFileSizeSafe(filePath: string): number {
  try {
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath).size;
    }
  } catch {
    // Non-critical if file access is restricted
  }
  return 0;
}

/**
 * GET /api/admin/db/maintenance
 * Returns comprehensive storage, page fragmentation, WAL status, and table statistics.
 */
export async function GET() {
  const sa = await requireSuperAdmin();
  if (!sa.ok) return sa.response;

  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres:") || dbUrl.startsWith("postgresql:");

  let pageCount = 0;
  let pageSize = 4096;
  let freelistCount = 0;
  let journalMode = isPostgres ? "postgres" : "unknown";
  let cacheSize = 0;
  let synchronous = 0;
  let walAutocheckpoint = 1000;

  if (!isPostgres) {
    try {
      const [
        pageCountRows,
        pageSizeRows,
        freelistRows,
        journalModeRows,
        cacheSizeRows,
        syncRows,
        walCheckpointRows,
      ] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ page_count: number }>>("PRAGMA page_count;"),
        prisma.$queryRawUnsafe<Array<{ page_size: number }>>("PRAGMA page_size;"),
        prisma.$queryRawUnsafe<Array<{ freelist_count: number }>>("PRAGMA freelist_count;"),
        prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>("PRAGMA journal_mode;"),
        prisma.$queryRawUnsafe<Array<{ cache_size: number }>>("PRAGMA cache_size;"),
        prisma.$queryRawUnsafe<Array<{ synchronous: number }>>("PRAGMA synchronous;"),
        prisma.$queryRawUnsafe<Array<{ wal_autocheckpoint: number }>>("PRAGMA wal_autocheckpoint;"),
      ]);

      pageCount = Number(pageCountRows[0]?.page_count ?? 0);
      pageSize = Number(pageSizeRows[0]?.page_size ?? 4096);
      freelistCount = Number(freelistRows[0]?.freelist_count ?? 0);
      journalMode = journalModeRows[0]?.journal_mode ?? "unknown";
      cacheSize = Number(cacheSizeRows[0]?.cache_size ?? 0);
      synchronous = Number(syncRows[0]?.synchronous ?? 0);
      walAutocheckpoint = Number(walCheckpointRows[0]?.wal_autocheckpoint ?? 1000);
    } catch {
      // Non-critical
    }
  }

  const { dbPath, walPath, shmPath } = getDatabaseFilePaths();
  const dbFileSizeBytes = getFileSizeSafe(dbPath);
  const walFileSizeBytes = getFileSizeSafe(walPath);
  const shmFileSizeBytes = getFileSizeSafe(shmPath);

  const computedDbSizeBytes = pageCount * pageSize;
  const freelistSizeBytes = freelistCount * pageSize;
  const fragmentationPercent = pageCount > 0 ? Number(((freelistCount / pageCount) * 100).toFixed(2)) : 0;

  const [
    storyCount,
    jobCount,
    jobLogCount,
    usageLogCount,
    aiTokenCount,
    presetCount,
    campaignCount,
    assetCount,
    reservationCount,
  ] = await Promise.all([
    prisma.story.count(),
    prisma.generationJob.count(),
    prisma.jobLog.count(),
    prisma.usageLog.count(),
    prisma.aiTokenUsage.count(),
    prisma.visualPreset.count(),
    prisma.productCampaign.count(),
    prisma.productAsset.count(),
    prisma.tenantReservation.count(),
  ]);

  return NextResponse.json({
    success: true,
    storage: {
      pageCount,
      pageSize,
      computedDbSizeBytes,
      computedDbSizeMB: Number((computedDbSizeBytes / (1024 * 1024)).toFixed(2)),
      actualDbFileSizeBytes: dbFileSizeBytes,
      actualDbFileSizeMB: Number((dbFileSizeBytes / (1024 * 1024)).toFixed(2)),
      freelistCount,
      freelistSizeBytes,
      freelistSizeMB: Number((freelistSizeBytes / (1024 * 1024)).toFixed(2)),
      fragmentationPercent,
      walFileSizeBytes,
      walFileSizeMB: Number((walFileSizeBytes / (1024 * 1024)).toFixed(2)),
      shmFileSizeBytes,
    },
    pragmas: {
      journalMode,
      cacheSize,
      synchronous,
      walAutocheckpoint,
    },
    tableCounts: {
      Story: storyCount,
      GenerationJob: jobCount,
      JobLog: jobLogCount,
      UsageLog: usageLogCount,
      AiTokenUsage: aiTokenCount,
      VisualPreset: presetCount,
      ProductCampaign: campaignCount,
      ProductAsset: assetCount,
      TenantReservation: reservationCount,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/admin/db/maintenance
 * Executes administrative database operations:
 * - action: "checkpoint" -> PRAGMA wal_checkpoint(TRUNCATE)
 * - action: "optimize"   -> PRAGMA optimize
 * - action: "vacuum"     -> VACUUM
 * - action: "prune"      -> Cleans expired reservations and old logs
 */
export async function POST(req: NextRequest) {
  const sa = await requireSuperAdmin();
  if (!sa.ok) return sa.response;

  const body = await req.json();
  const action = body.action as string;

  if (!action) {
    return NextResponse.json(
      { error: "Missing required 'action' in request body. Options: 'checkpoint', 'optimize', 'vacuum', 'prune'." },
      { status: 400 }
    );
  }

  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres:") || dbUrl.startsWith("postgresql:");

  switch (action) {
    case "checkpoint": {
      if (isPostgres) {
        return NextResponse.json({
          success: true,
          action: "checkpoint",
          message: "PostgreSQL WAL is managed autonomously by the engine.",
        });
      }
      const result = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("PRAGMA wal_checkpoint(TRUNCATE);");
      return NextResponse.json({
        success: true,
        action: "checkpoint",
        message: "SQLite WAL successfully flushed and truncated.",
        result,
      });
    }

    case "optimize": {
      if (isPostgres) {
        await prisma.$executeRawUnsafe("ANALYZE;");
        return NextResponse.json({
          success: true,
          action: "optimize",
          message: "PostgreSQL ANALYZE successfully executed.",
        });
      }
      await prisma.$executeRawUnsafe("PRAGMA optimize;");
      return NextResponse.json({
        success: true,
        action: "optimize",
        message: "SQLite query planner statistics successfully updated.",
      });
    }

    case "vacuum": {
      await prisma.$executeRawUnsafe("VACUUM;");
      return NextResponse.json({
        success: true,
        action: "vacuum",
        message: isPostgres
          ? "PostgreSQL database successfully vacuumed."
          : "SQLite database successfully compacted via full VACUUM.",
      });
    }

    case "prune": {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [expiredReservations, oldJobLogs] = await Promise.all([
        prisma.tenantReservation.deleteMany({
          where: {
            status: { in: ["EXPIRED", "ROLLED_BACK", "COMMITTED"] },
            expiresAt: { lt: sevenDaysAgo },
          },
        }),
        prisma.jobLog.deleteMany({
          where: {
            createdAt: { lt: thirtyDaysAgo },
            job: {
              status: { in: ["DONE", "FAILED"] },
            },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        action: "prune",
        message: "Stale database records successfully pruned.",
        pruned: {
          expiredReservations: expiredReservations.count,
          oldJobLogs: oldJobLogs.count,
        },
      });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}. Valid actions: 'checkpoint', 'optimize', 'vacuum', 'prune'.` },
        { status: 400 }
      );
  }
}
