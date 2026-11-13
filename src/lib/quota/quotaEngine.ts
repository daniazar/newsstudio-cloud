import { prisma } from "@/lib/prisma";

export type QuotaType =
  | "token"
  | "video_minute"
  | "storage_gb"
  | "persona_generation"
  | "tts_credits"
  | "video_credits"
  | "render_credits"
  | "llm_tokens";

export interface TierLimits {
  video_minute: number;
  tts_credits: number;
  video_credits: number;
  render_credits: number;
  llm_tokens: number;
  storage_gb: number;
  persona_generation: number;
  token: number;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    video_minute: 10,
    tts_credits: 50,
    video_credits: 10,
    render_credits: 10,
    llm_tokens: 25000,
    storage_gb: 2,
    persona_generation: 3,
    token: 25000,
  },
  pro: {
    video_minute: 120,
    tts_credits: 600,
    video_credits: 120,
    render_credits: 120,
    llm_tokens: 250000,
    storage_gb: 25,
    persona_generation: 15,
    token: 250000,
  },
  enterprise: {
    video_minute: 10000,
    tts_credits: 50000,
    video_credits: 10000,
    render_credits: 10000,
    llm_tokens: 5000000,
    storage_gb: 500,
    persona_generation: 100,
    token: 5000000,
  },
};

export class QuotaExceededError extends Error {
  constructor(
    public readonly companyId: string,
    public readonly quotaType: QuotaType,
    public readonly requested: number,
    public readonly available: number,
    public readonly limit: number
  ) {
    super(
      `Tenant ${companyId} exceeded ${quotaType} quota (Requested: ${requested}, Available: ${available}, Limit: ${limit}). Upgrade tier to continue.`
    );
    this.name = "QuotaExceededError";
  }
}

/**
 * Returns the start of the current calendar month in UTC.
 */
export function getBillingCycleStart(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Retrieves the tier limits for a specified tier string.
 */
export function getTierLimits(tier: string = "free"): TierLimits {
  return TIER_LIMITS[tier.toLowerCase()] || TIER_LIMITS.free;
}

export interface QuotaCheckResult {
  allowed: boolean;
  tier: string;
  limit: number;
  used: number;
  reserved: number;
  available: number;
  requested: number;
}

/**
 * Checks if a tenant has sufficient quota in the current billing cycle
 * taking into account committed UsageLog and active TenantReservation amounts.
 */
export async function checkTenantQuota(
  companyId: string,
  type: QuotaType,
  requestedAmount: number = 0
): Promise<QuotaCheckResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tier: true },
  });

  const tier = company?.tier || "free";
  const limits = getTierLimits(tier);
  const limit = limits[type] ?? 100;

  const cycleStart = getBillingCycleStart();
  const now = new Date();

  // 1. Sum committed usage within current billing cycle
  const usageAggregation = await prisma.usageLog.aggregate({
    where: {
      companyId,
      type,
      createdAt: { gte: cycleStart },
    },
    _sum: { amount: true },
  });
  const used = usageAggregation._sum.amount || 0;

  // 2. Sum active unexpired reservations
  const reservationAggregation = await prisma.tenantReservation.aggregate({
    where: {
      companyId,
      type,
      status: "RESERVED",
      expiresAt: { gt: now },
    },
    _sum: { amount: true },
  });
  const reserved = reservationAggregation._sum.amount || 0;

  const available = Math.max(0, limit - (used + reserved));
  const allowed = requestedAmount <= available;

  return {
    allowed,
    tier,
    limit,
    used,
    reserved,
    available,
    requested: requestedAmount,
  };
}

/**
 * Phase 1: Pre-flight credit reservation.
 * Atomically checks quota and creates a temporary hold on credits.
 */
export async function reserveQuota(
  companyId: string,
  type: QuotaType,
  estimatedAmount: number,
  options?: {
    ttlMinutes?: number;
    metadata?: Record<string, unknown>;
  }
) {
  const check = await checkTenantQuota(companyId, type, estimatedAmount);
  if (!check.allowed) {
    throw new QuotaExceededError(
      companyId,
      type,
      estimatedAmount,
      check.available,
      check.limit
    );
  }

  const ttl = options?.ttlMinutes || 30; // Default 30 minute reservation window
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

  const reservation = await prisma.tenantReservation.create({
    data: {
      companyId,
      type,
      amount: estimatedAmount,
      status: "RESERVED",
      metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
      expiresAt,
    },
  });

  return reservation;
}

/**
 * Phase 2A: Commit reservation upon successful pipeline job completion.
 * Atomically creates a permanent UsageLog entry and marks reservation COMMITTED.
 */
export async function commitQuota(
  reservationId: string,
  actualAmount?: number
) {
  const reservation = await prisma.tenantReservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new Error(`Reservation ${reservationId} not found`);
  }

  if (reservation.status !== "RESERVED") {
    return { committed: false, reason: `Reservation already ${reservation.status}`, reservation };
  }

  const finalAmount = actualAmount !== undefined ? actualAmount : reservation.amount;

  const [usageLog, updatedReservation] = await prisma.$transaction([
    prisma.usageLog.create({
      data: {
        companyId: reservation.companyId,
        type: reservation.type,
        amount: finalAmount,
      },
    }),
    prisma.tenantReservation.update({
      where: { id: reservationId },
      data: {
        status: "COMMITTED",
        amount: finalAmount,
      },
    }),
  ]);

  return {
    committed: true,
    reservation: updatedReservation,
    usageLog,
  };
}

/**
 * Phase 2B: Rollback reservation upon job failure or cancellation.
 * Releases the reserved credits back into the tenant's available balance.
 */
export async function rollbackQuota(
  reservationId: string,
  reason?: string
) {
  const reservation = await prisma.tenantReservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) return { rolledBack: false, reason: "Not found" };
  if (reservation.status !== "RESERVED") {
    return { rolledBack: false, reason: `Reservation already ${reservation.status}` };
  }

  let metadataObj: Record<string, unknown> = {};
  if (reservation.metadata) {
    try {
      metadataObj = JSON.parse(reservation.metadata);
    } catch {
      // ignore
    }
  }
  if (reason) metadataObj.rollbackReason = reason;

  const updatedReservation = await prisma.tenantReservation.update({
    where: { id: reservationId },
    data: {
      status: "ROLLED_BACK",
      metadata: JSON.stringify(metadataObj),
    },
  });

  return {
    rolledBack: true,
    reservation: updatedReservation,
  };
}

export interface QuotaSummaryItem {
  type: QuotaType;
  limit: number;
  used: number;
  reserved: number;
  available: number;
  utilizationPercent: number;
}

export interface TenantUsageSummary {
  companyId: string;
  tier: string;
  billingCycleStart: string;
  quotas: Record<QuotaType, QuotaSummaryItem>;
}

/**
 * Returns a comprehensive usage breakdown across all quota types for a tenant.
 */
export async function getTenantUsageSummary(companyId: string): Promise<TenantUsageSummary> {
  const types: QuotaType[] = [
    "video_minute",
    "tts_credits",
    "video_credits",
    "render_credits",
    "llm_tokens",
    "storage_gb",
    "persona_generation",
  ];

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tier: true },
  });
  const tier = company?.tier || "free";

  const quotas: Partial<Record<QuotaType, QuotaSummaryItem>> = {};

  for (const type of types) {
    const check = await checkTenantQuota(companyId, type, 0);
    const utilizationPercent = check.limit > 0 ? Math.min(100, Math.round(((check.used + check.reserved) / check.limit) * 100)) : 0;
    quotas[type] = {
      type,
      limit: check.limit,
      used: check.used,
      reserved: check.reserved,
      available: check.available,
      utilizationPercent,
    };
  }

  return {
    companyId,
    tier,
    billingCycleStart: getBillingCycleStart().toISOString(),
    quotas: quotas as Record<QuotaType, QuotaSummaryItem>,
  };
}
