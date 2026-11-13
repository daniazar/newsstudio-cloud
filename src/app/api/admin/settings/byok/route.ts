import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";
import {
  getTenantCredentials,
  saveTenantCredentials,
  deleteTenantCredentials,
  maskApiKey,
  BYOK_SETTINGS_KEY,
  type TenantByokCredentials,
} from "@/lib/tenant/credentials";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/byok
 * Fetch tenant BYOK credentials (masked) or list all companies with BYOK status.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId");

  if (companyId) {
    const creds = await getTenantCredentials(companyId);
    if (!creds) {
      return NextResponse.json({
        companyId,
        hasByok: false,
        credentials: null,
      });
    }

    return NextResponse.json({
      companyId,
      hasByok: true,
      credentials: {
        ...creds,
        geminiApiKey: maskApiKey(creds.geminiApiKey),
        openaiCompatibleApiKey: maskApiKey(creds.openaiCompatibleApiKey),
        tavilyApiKey: creds.tavilyApiKey ? maskApiKey(creds.tavilyApiKey) : undefined,
        firecrawlApiKey: creds.firecrawlApiKey ? maskApiKey(creds.firecrawlApiKey) : undefined,
      },
    });
  }

  // List all registered organizations and check which have BYOK configured
  const [companies, byokRows] = await Promise.all([
    prisma.company
      ? prisma.company.findMany({
          select: {
            id: true,
            name: true,
            tier: true,
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.systemSetting
      ? prisma.systemSetting.findMany({
          where: { key: BYOK_SETTINGS_KEY },
          select: { companyId: true, updatedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const configuredSet = new Map<string, Date>();
  for (const row of byokRows) {
    if (row.companyId) {
      configuredSet.set(row.companyId, row.updatedAt);
    }
  }

  const items = companies.map((c) => ({
    id: c.id,
    name: c.name,
    tier: c.tier,
    hasByok: configuredSet.has(c.id),
    updatedAt: configuredSet.get(c.id)?.toISOString() || null,
  }));

  // Include any configured BYOK tenant IDs not yet in the Company table
  const knownIds = new Set(companies.map((c) => c.id));
  for (const [byokCompanyId, updatedAt] of configuredSet.entries()) {
    if (!knownIds.has(byokCompanyId)) {
      items.push({
        id: byokCompanyId,
        name: byokCompanyId,
        tier: "enterprise",
        hasByok: true,
        updatedAt: updatedAt.toISOString(),
      });
    }
  }

  return NextResponse.json({ companies: items });
});

/**
 * POST /api/admin/settings/byok
 * Save or update BYOK credentials for a tenant.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  const body = (await request.json()) as Partial<TenantByokCredentials> & { companyId: string };
  if (!body.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const saved = await saveTenantCredentials(body.companyId, body);

  return NextResponse.json({
    success: true,
    credentials: {
      ...saved,
      geminiApiKey: maskApiKey(saved.geminiApiKey),
      openaiCompatibleApiKey: maskApiKey(saved.openaiCompatibleApiKey),
      tavilyApiKey: saved.tavilyApiKey ? maskApiKey(saved.tavilyApiKey) : undefined,
      firecrawlApiKey: saved.firecrawlApiKey ? maskApiKey(saved.firecrawlApiKey) : undefined,
    },
  });
});

/**
 * PUT /api/admin/settings/byok
 * Alias for POST.
 */
export const PUT = POST;

/**
 * DELETE /api/admin/settings/byok
 * Remove BYOK credentials for a tenant, reverting them to global settings.
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  let companyId = searchParams.get("companyId");

  if (!companyId) {
    try {
      const body = await request.json();
      companyId = body.companyId;
    } catch {
      // Ignored
    }
  }

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  await deleteTenantCredentials(companyId);

  return NextResponse.json({ success: true, message: `BYOK credentials removed for companyId=${companyId}` });
});
