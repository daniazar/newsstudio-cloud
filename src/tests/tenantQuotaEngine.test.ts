import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockCompanies, mockReservations, mockUsageLogs } = vi.hoisted(() => ({
  mockCompanies: new Map<string, { id: string; name: string; tier: string }>(),
  mockReservations: new Map<
    string,
    { id: string; companyId: string; type: string; amount: number; status: string; metadata: string | null; expiresAt: Date }
  >(),
  mockUsageLogs: [] as Array<{ id: string; companyId: string; type: string; amount: number; createdAt: Date }>,
}));

vi.mock("@/lib/prisma", () => {
  let idSeq = 1;
  return {
    prisma: {
      company: {
        upsert: vi.fn(async ({ where, create, update }) => {
          const existing = mockCompanies.get(where.id);
          if (existing) {
            const updated = { ...existing, ...update };
            mockCompanies.set(where.id, updated);
            return updated;
          }
          const created = { ...create };
          mockCompanies.set(created.id, created);
          return created;
        }),
        findUnique: vi.fn(async ({ where }) => mockCompanies.get(where.id) ?? null),
      },
      tenantReservation: {
        deleteMany: vi.fn(async ({ where }) => {
          let count = 0;
          for (const [k, v] of mockReservations.entries()) {
            if (!where?.companyId || v.companyId === where.companyId) {
              mockReservations.delete(k);
              count++;
            }
          }
          return { count };
        }),
        aggregate: vi.fn(async ({ where }) => {
          let sum = 0;
          for (const v of mockReservations.values()) {
            if (
              v.companyId === where.companyId &&
              v.type === where.type &&
              v.status === where.status &&
              (!where.expiresAt?.gt || v.expiresAt > where.expiresAt.gt)
            ) {
              sum += v.amount;
            }
          }
          return { _sum: { amount: sum || null } };
        }),
        create: vi.fn(async ({ data }) => {
          const id = `res_${idSeq++}`;
          const rec = { id, ...data };
          mockReservations.set(id, rec);
          return rec;
        }),
        findUnique: vi.fn(async ({ where }) => mockReservations.get(where.id) ?? null),
        update: vi.fn(async ({ where, data }) => {
          const rec = mockReservations.get(where.id);
          if (!rec) throw new Error("Not found");
          const updated = { ...rec, ...data };
          mockReservations.set(where.id, updated);
          return updated;
        }),
      },
      usageLog: {
        deleteMany: vi.fn(async ({ where }) => {
          let count = 0;
          for (let i = mockUsageLogs.length - 1; i >= 0; i--) {
            if (!where?.companyId || mockUsageLogs[i].companyId === where.companyId) {
              mockUsageLogs.splice(i, 1);
              count++;
            }
          }
          return { count };
        }),
        aggregate: vi.fn(async ({ where }) => {
          let sum = 0;
          for (const u of mockUsageLogs) {
            if (
              u.companyId === where.companyId &&
              u.type === where.type &&
              (!where.createdAt?.gte || u.createdAt >= where.createdAt.gte)
            ) {
              sum += u.amount;
            }
          }
          return { _sum: { amount: sum || null } };
        }),
        create: vi.fn(async ({ data }) => {
          const rec = { id: `usage_${idSeq++}`, createdAt: new Date(), ...data };
          mockUsageLogs.push(rec);
          return rec;
        }),
      },
      $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
    },
  };
});

import { prisma } from "@/lib/prisma";
import {
  getTierLimits,
  checkTenantQuota,
  reserveQuota,
  commitQuota,
  rollbackQuota,
  getTenantUsageSummary,
  QuotaExceededError,
} from "@/lib/quota/quotaEngine";

describe("Phase 5: Tenant Quotas & Two-Phase Pre-Flight Credit Reservation Engine", () => {
  const testCompanyId = "test_tenant_quota_org";

  beforeEach(async () => {
    // Ensure test company exists in free tier
    await prisma.company.upsert({
      where: { id: testCompanyId },
      create: {
        id: testCompanyId,
        name: "Test Quota Org",
        tier: "free",
      },
      update: {
        tier: "free",
      },
    });

    // Clean up test usage logs and reservations
    await prisma.tenantReservation.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.usageLog.deleteMany({
      where: { companyId: testCompanyId },
    });
  });

  describe("1. Tier Limits & Initial Quota Checks", () => {
    it("resolves default tier limits correctly", () => {
      const freeLimits = getTierLimits("free");
      expect(freeLimits.video_minute).toBe(10);
      expect(freeLimits.tts_credits).toBe(50);

      const proLimits = getTierLimits("pro");
      expect(proLimits.video_minute).toBe(120);
      expect(proLimits.tts_credits).toBe(600);

      const entLimits = getTierLimits("enterprise");
      expect(entLimits.video_minute).toBe(10000);
      expect(entLimits.tts_credits).toBe(50000);
    });

    it("verifies clean initial quota for a free tier tenant", async () => {
      const check = await checkTenantQuota(testCompanyId, "video_minute", 2);

      expect(check.allowed).toBe(true);
      expect(check.limit).toBe(10);
      expect(check.used).toBe(0);
      expect(check.reserved).toBe(0);
      expect(check.available).toBe(10);
      expect(check.requested).toBe(2);
    });

    it("denies requests exceeding total tier limit", async () => {
      const check = await checkTenantQuota(testCompanyId, "video_minute", 15);

      expect(check.allowed).toBe(false);
      expect(check.available).toBe(10);
      expect(check.requested).toBe(15);
    });
  });

  describe("2. Two-Phase Pre-Flight Reservation Lifecycle", () => {
    it("successfully creates a pre-flight reservation and decreases available quota", async () => {
      const reservation = await reserveQuota(testCompanyId, "video_minute", 4, {
        ttlMinutes: 15,
        metadata: { jobId: "job_render_test_1" },
      });

      expect(reservation.id).toBeDefined();
      expect(reservation.status).toBe("RESERVED");
      expect(reservation.amount).toBe(4);
      expect(new Date(reservation.expiresAt).getTime()).toBeGreaterThan(Date.now());

      // Subsequent check should reflect reserved credits
      const checkAfter = await checkTenantQuota(testCompanyId, "video_minute", 0);
      expect(checkAfter.reserved).toBe(4);
      expect(checkAfter.available).toBe(6);

      // Requesting 7 minutes should now be disallowed (only 6 available)
      const overCheck = await checkTenantQuota(testCompanyId, "video_minute", 7);
      expect(overCheck.allowed).toBe(false);
    });

    it("throws QuotaExceededError when pre-flight reservation exceeds capacity", async () => {
      await expect(
        reserveQuota(testCompanyId, "video_minute", 12)
      ).rejects.toThrow(QuotaExceededError);
    });

    it("commits reservation into permanent UsageLog on successful completion", async () => {
      const reservation = await reserveQuota(testCompanyId, "video_minute", 3);

      const commitResult = await commitQuota(reservation.id, 2.5); // actual slightly less than estimate
      expect(commitResult.committed).toBe(true);
      expect(commitResult.reservation?.status).toBe("COMMITTED");
      expect(commitResult.reservation?.amount).toBe(2.5);
      expect(commitResult.usageLog?.amount).toBe(2.5);

      // UsageLog is now populated, active reservation released
      const check = await checkTenantQuota(testCompanyId, "video_minute", 0);
      expect(check.used).toBe(2.5);
      expect(check.reserved).toBe(0);
      expect(check.available).toBe(7.5);
    });

    it("rolls back reservation on failure and restores available quota", async () => {
      const reservation = await reserveQuota(testCompanyId, "video_minute", 5);

      const rollbackResult = await rollbackQuota(reservation.id, "Worker timeout or error");
      expect(rollbackResult.rolledBack).toBe(true);
      expect(rollbackResult.reservation?.status).toBe("ROLLED_BACK");

      // Reserved credits released back to tenant
      const check = await checkTenantQuota(testCompanyId, "video_minute", 0);
      expect(check.used).toBe(0);
      expect(check.reserved).toBe(0);
      expect(check.available).toBe(10);
    });
  });

  describe("3. Tenant Usage Summary & Utilization", () => {
    it("returns comprehensive usage report across all resource types", async () => {
      // Seed some usage
      await prisma.usageLog.create({
        data: {
          companyId: testCompanyId,
          type: "tts_credits",
          amount: 20,
        },
      });

      const summary = await getTenantUsageSummary(testCompanyId);
      expect(summary.companyId).toBe(testCompanyId);
      expect(summary.tier).toBe("free");
      expect(summary.quotas.tts_credits.used).toBe(20);
      expect(summary.quotas.tts_credits.limit).toBe(50);
      expect(summary.quotas.tts_credits.utilizationPercent).toBe(40);
      expect(summary.quotas.video_minute.utilizationPercent).toBe(0);
    });
  });
});
