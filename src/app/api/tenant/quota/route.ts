import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { getTenantUsageSummary, checkTenantQuota, QuotaType } from "@/lib/quota/quotaEngine";

export async function GET(request: Request) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;
    const companyId = t.tenant.orgId;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as QuotaType | null;

    if (type) {
      const check = await checkTenantQuota(companyId, type, 0);
      return NextResponse.json({
        companyId,
        quota: check,
      });
    }

    const summary = await getTenantUsageSummary(companyId);
    return NextResponse.json(summary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch tenant quota";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
