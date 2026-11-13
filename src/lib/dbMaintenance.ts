/**
 * src/lib/dbMaintenance.ts
 *
 * Database Maintenance & Compaction Utility.
 * Reclaims unallocated disk pages (freelists) and truncates Write-Ahead Logs (WAL).
 */

import { prisma } from "@/lib/prisma";

export interface CompactDatabaseResult {
  success: boolean;
  provider: "sqlite" | "postgresql" | "other";
  durationMs: number;
  walCheckpointed: boolean;
  vacuumed: boolean;
  error?: string;
}

/**
 * Compacts the database by truncating WAL logs and running VACUUM.
 * Safe to run periodically during off-peak hours (e.g. via nightly cron).
 */
export async function compactDatabase(): Promise<CompactDatabaseResult> {
  const startTime = Date.now();
  const dbUrl = process.env.DATABASE_URL || "";
  const isSqlite = dbUrl.startsWith("file:") || dbUrl.includes(".db") || !dbUrl.includes("://");

  const result: CompactDatabaseResult = {
    success: true,
    provider: isSqlite ? "sqlite" : "postgresql",
    durationMs: 0,
    walCheckpointed: false,
    vacuumed: false,
  };

  try {
    if (isSqlite) {
      // 1. Truncate SQLite Write-Ahead Log into primary database file
      try {
        await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
        result.walCheckpointed = true;
      } catch (walErr) {
        console.warn("[dbMaintenance] wal_checkpoint warning:", walErr);
      }

      // 2. Rebuild database file, removing free-list pages and defragmenting
      try {
        await prisma.$executeRawUnsafe("VACUUM;");
        result.vacuumed = true;
      } catch (vacuumErr) {
        console.warn("[dbMaintenance] VACUUM warning:", vacuumErr);
      }
    } else {
      // PostgreSQL: analyze tables
      try {
        await prisma.$executeRawUnsafe("VACUUM ANALYZE;");
        result.vacuumed = true;
      } catch (pgErr) {
        console.warn("[dbMaintenance] PostgreSQL VACUUM warning:", pgErr);
      }
    }
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    console.error("[dbMaintenance] Failed to compact database:", error);
  } finally {
    result.durationMs = Date.now() - startTime;
  }

  return result;
}
