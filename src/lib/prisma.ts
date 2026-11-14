import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma_v5?: PrismaClient;
  pgPool?: Pool;
};

function createPrismaClient(): PrismaClient {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    !process.env.DATABASE_URL
  ) {
    throw new Error("DATABASE_URL environment variable is required in production");
  }

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://newsstudio:newsstudiopassword@localhost:5432/newsstudio?schema=public";

  const needsSsl =
    process.env.DATABASE_SSL === "true" ||
    connectionString.includes("sslmode=require") ||
    (process.env.NODE_ENV === "production" &&
      !connectionString.includes("localhost") &&
      !connectionString.includes("127.0.0.1"));

  const pool =
    globalForPrisma.pgPool ||
    new Pool({
      connectionString,
      max: process.env.DATABASE_POOL_MAX
        ? parseInt(process.env.DATABASE_POOL_MAX, 10)
        : process.env.NODE_ENV === "production"
        ? 5
        : 10,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: true,
      ssl: needsSsl
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" }
        : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
  });

  // Client extension logging slow queries (>150ms in dev)
  const extendedClient = client.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        const before = performance.now();
        const result = await query(args);
        const duration = Math.round(performance.now() - before);
        if (process.env.NODE_ENV !== "production" && duration > 150) {
          console.warn(
            `⚠️  [Prisma Slow Query] ${model ? model + "." : ""}${operation} took ${duration}ms`
          );
        }
        return result;
      },
    },
  }) as unknown as PrismaClient;

  return extendedClient;
}

// Force reload to pick up new schema fields
export const prisma = globalForPrisma.prisma_v5 || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_v5 = prisma;
}

/**
 * Checkpoint WAL log. In PostgreSQL, this is a no-op as Postgres manages its own WAL.
 */
export async function checkpointSqliteWal(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("file:") || dbUrl.includes(".db")) {
    try {
      await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(PASSIVE);");
      await prisma.$executeRawUnsafe("PRAGMA optimize;");
    } catch {
      // Non-critical
    }
  }
}
