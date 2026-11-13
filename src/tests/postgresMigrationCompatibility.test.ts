import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  parsePostgresConnectionUrls,
  auditPrismaSchemaForPostgres,
  buildAtomicQueueLockQuery,
  generatePostgresDatasourceBlock,
} from "../../scripts/db-migration-verifier";

describe("Phase 10: PostgreSQL Flexible Server Database Migration", () => {
  describe("1. Prisma Schema Dialect Audit", () => {
    it("verifies that all models in schema.prisma are 100% compatible with PostgreSQL", () => {
      const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
      expect(fs.existsSync(schemaPath)).toBe(true);

      const schemaContent = fs.readFileSync(schemaPath, "utf-8");
      const audit = auditPrismaSchemaForPostgres(schemaContent);

      expect(audit.totalModels).toBeGreaterThanOrEqual(20);
      expect(audit.isCompatibleWithPostgres).toBe(true);
      expect(audit.unsupportedTypes).toHaveLength(0);

      // Verify core enterprise & pipeline models exist
      const expectedModels = [
        "Company",
        "Brand",
        "TenantReservation",
        "Story",
        "Script",
        "Segment",
        "Video",
        "Persona",
        "GenerationJob",
        "UsageLog",
      ];

      for (const model of expectedModels) {
        expect(audit.modelNames).toContain(model);
      }
    });
  });

  describe("2. Dual-Connection URL & PgBouncer Configuration", () => {
    it("correctly parses a pooled connection string and resolves direct migration URL", () => {
      const pooledUrl =
        "postgresql://news_admin:Secret123@news-prod.postgres.database.azure.com:6543/newsstudio?pgbouncer=true&connection_limit=50";

      const parsed = parsePostgresConnectionUrls(pooledUrl);

      expect(parsed.isPooled).toBe(true);
      expect(parsed.poolerPort).toBe(6543);
      expect(parsed.directPort).toBe(5432);
      expect(parsed.host).toBe("news-prod.postgres.database.azure.com");
      expect(parsed.database).toBe("newsstudio");
      expect(parsed.user).toBe("news_admin");

      // Verify directUrl has port 5432 and no pgbouncer parameter
      expect(parsed.directUrl).toContain(":5432/");
      expect(parsed.directUrl).not.toContain("pgbouncer=true");
    });

    it("respects explicitly supplied directUrl override", () => {
      const pooledUrl = "postgresql://user:pass@host:6543/db?pgbouncer=true";
      const customDirectUrl = "postgresql://user:pass@direct-host:5432/db";

      const parsed = parsePostgresConnectionUrls(pooledUrl, customDirectUrl);

      expect(parsed.databaseUrl).toBe(pooledUrl);
      expect(parsed.directUrl).toBe(customDirectUrl);
    });

    it("throws an error when an invalid protocol is supplied", () => {
      expect(() => parsePostgresConnectionUrls("mysql://user:pass@localhost:3306/db")).toThrow(
        /Invalid PostgreSQL databaseUrl protocol/
      );
    });
  });

  describe("3. Concurrency & Queue Contracts", () => {
    it("builds atomic row-level locking SQL using SKIP LOCKED", () => {
      const sql = buildAtomicQueueLockQuery("GenerationJob", 5);

      expect(sql).toContain('FROM "GenerationJob"');
      expect(sql).toContain("FOR UPDATE SKIP LOCKED");
      expect(sql).toContain("LIMIT 5");
      expect(sql).toContain("status = 'PENDING'");
    });

    it("generates correct Prisma PostgreSQL datasource block with directUrl", () => {
      const block = generatePostgresDatasourceBlock();

      expect(block).toContain('provider  = "postgresql"');
      expect(block).toContain('url       = env("DATABASE_URL")');
      expect(block).toContain('directUrl = env("DIRECT_URL")');
    });
  });
});
