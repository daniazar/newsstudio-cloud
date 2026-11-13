import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * The owner organization. Existing/backfilled data belongs to it and it is
 * exempt from the System Persona generation cap. Set DEFAULT_ORG_ID in .env to
 * your real Clerk org id (org_...).
 */
export const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || "";

export interface TenantContext {
  userId: string;
  orgId: string;
  isDefaultOrg: boolean;
}

// In-process cache so we don't upsert the Company row on every request.
const ensuredCompanies = new Set<string>();

/**
 * Lazily provision the Company row for a Clerk organization. Idempotent.
 */
export async function ensureCompany(orgId: string, name?: string): Promise<void> {
  if (!orgId || ensuredCompanies.has(orgId)) return;
  await prisma.company.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: name || orgId },
  });
  ensuredCompanies.add(orgId);
}

/**
 * Resolve the active tenant from the Clerk session. Throws a `Response` (401/403)
 * when there is no signed-in user or no active organization context.
 */
export async function getTenant(): Promise<TenantContext> {
  const { userId, orgId } = await auth();
  if (!userId) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    throw Response.json({ error: "No active organization selected" }, { status: 403 });
  }
  return { userId, orgId, isDefaultOrg: orgId === DEFAULT_ORG_ID };
}

type RequireTenantResult =
  | { ok: true; tenant: TenantContext }
  | { ok: false; response: Response };

/**
 * Ergonomic guard for route handlers. Returns the tenant context or a ready
 * `Response` to return immediately, and lazily provisions the Company row.
 *
 *   const t = await requireTenant();
 *   if (!t.ok) return t.response;
 *   const { orgId } = t.tenant;
 */
export async function requireTenant(): Promise<RequireTenantResult> {
  try {
    const tenant = await getTenant();
    await ensureCompany(tenant.orgId);
    return { ok: true, tenant };
  } catch (e) {
    if (e instanceof Response) return { ok: false, response: e };
    throw e;
  }
}
