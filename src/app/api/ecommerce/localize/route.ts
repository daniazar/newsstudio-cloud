import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import {
  localizeAdCampaign,
  TargetMarketKey,
  MARKET_PROFILES,
} from "@/lib/ecommerce/adLocalizer";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";

/**
 * GET /api/ecommerce/localize
 * Returns available target markets and currency profiles.
 */
export async function GET() {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  return NextResponse.json({
    success: true,
    markets: Object.values(MARKET_PROFILES),
  });
}

/**
 * POST /api/ecommerce/localize
 * Localizes an AdCampaign into multiple global markets with converted prices,
 * translated copy, and native voice persona routing.
 */
export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  try {
    const body = await req.json();
    const { productSpec, script, targetMarkets } = body;

    if (!productSpec || !script) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: productSpec and script." },
        { status: 400 }
      );
    }

    const marketsToTranslate: TargetMarketKey[] =
      targetMarkets && Array.isArray(targetMarkets) && targetMarkets.length > 0
        ? targetMarkets
        : ["en_us", "es_latam", "de_de", "fr_fr", "pt_br", "ja_jp"];

    const bundle = await localizeAdCampaign(
      productSpec as ProductSpec,
      script as AdScript,
      marketsToTranslate
    );

    return NextResponse.json({
      success: true,
      bundle,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/localize] Error:", message);
    return NextResponse.json(
      { success: false, error: `Failed to localize ad campaign: ${message}` },
      { status: 500 }
    );
  }
}
