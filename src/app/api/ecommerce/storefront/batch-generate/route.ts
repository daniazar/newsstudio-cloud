import { NextRequest, NextResponse } from "next/server";
import { ProductSpec, VideoArchetype } from "@/lib/types/ecommerce";
import { compileAdScript } from "@/lib/ecommerce/adCopywriter";
import { renderOmnichannelBatch, OmnichannelCampaignBundle } from "@/lib/ecommerce/omnichannelExporter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      products,
      personaId = "ruby",
      archetype = "viral_ugc",
      renderOmnichannel = false,
      dryRun = true,
    } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or empty 'products' array." },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      (products as ProductSpec[]).map(async (product) => {
        // 1. Compile autonomous ad script for product
        const script = compileAdScript({
          productSpec: product,
          archetype: archetype as VideoArchetype,
          targetChannel: "tiktok_shop",
          durationSeconds: 20,
        });

        let bundle: OmnichannelCampaignBundle | undefined;

        // 2. If omnichannel generation is requested
        if (renderOmnichannel) {
          bundle = await renderOmnichannelBatch({
            productSpec: product,
            script,
            presenter: {
              enabled: true,
              personaId,
              position: "bottom_right",
              scale: 1.0,
              showNameBadge: true,
            },
            dryRun,
          });
        }

        return {
          productId: product.id,
          productTitle: product.title,
          scriptId: script.id,
          bundle,
        };
      })
    );

    return NextResponse.json({
      success: true,
      totalProcessed: results.length,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/storefront/batch-generate] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
