import { NextRequest, NextResponse } from "next/server";
import { crawlStorefrontCatalog } from "@/lib/ecommerce/storefrontCrawler";
import { requireTenant } from "@/lib/tenant";
import { checkRateLimit, rateLimitResponse, RateLimitTiers } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const rl = checkRateLimit(orgId, RateLimitTiers.API_STANDARD);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const { url, limit = 20 } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Missing required 'url' parameter" },
        { status: 400 }
      );
    }

    const result = await crawlStorefrontCatalog(url, { limit });

    if (!result.success && result.products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "No products could be discovered at the provided storefront URL.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      protocol: result.protocol,
      storeName: result.storeName,
      storeUrl: result.storeUrl,
      totalFound: result.totalFound,
      products: result.products,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/storefront/crawl] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
