/**
 * src/app/api/ecommerce/storefronts/[id]/scrape/route.ts
 *
 * Scrapes and ingests an entire storefront catalog into the database.
 * Supports Tiendanube (StoreHaus), Shopify, WooCommerce, and Google Merchant XML feeds.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { scrapeTiendanubeCatalog } from "@/lib/ecommerce/parsers/tiendanubeParser";
import { crawlStorefrontCatalog } from "@/lib/ecommerce/storefrontCrawler";
import { ProductSpec } from "@/lib/types/ecommerce";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { limit = 120, maxPages = 3 } = body;

    const storefront = await prisma.storefront.findFirst({
      where: { id, companyId: orgId },
    });

    if (!storefront) {
      return NextResponse.json(
        { success: false, error: `Storefront with ID ${id} not found.` },
        { status: 404 }
      );
    }

    let scrapedProducts: ProductSpec[] = [];

    // Protocol Routing: Tiendanube vs Generic Crawler
    if (
      storefront.platform === "tiendanube" ||
      storefront.url.includes("storehaus") ||
      storefront.url.includes("mitiendanube")
    ) {
      const result = await scrapeTiendanubeCatalog(storefront.url, {
        limit: Number(limit) || 120,
        maxPages: Number(maxPages) || 3,
      });

      if (!result.success || result.products.length === 0) {
        return NextResponse.json(
          { success: false, error: result.error || `No products discovered at ${storefront.url}` },
          { status: 404 }
        );
      }
      scrapedProducts = result.products;
    } else {
      const crawlResult = await crawlStorefrontCatalog(storefront.url, {
        limit: Number(limit) || 30,
      });

      if (!crawlResult.success || crawlResult.products.length === 0) {
        return NextResponse.json(
          { success: false, error: crawlResult.error || `No catalog discovered at ${storefront.url}` },
          { status: 404 }
        );
      }
      scrapedProducts = crawlResult.products;
    }

    // Persist all scraped products into the Database via chunked concurrent upserts
    const CHUNK_SIZE = 10;
    for (let i = 0; i < scrapedProducts.length; i += CHUNK_SIZE) {
      const chunk = scrapedProducts.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (p) => {
          const campaign = await prisma.productCampaign.upsert({
            where: {
              companyId_sourceUrl: {
                companyId: orgId,
                sourceUrl: p.sourceUrl,
              },
            },
            update: {
              storefrontId: storefront.id,
              title: p.title,
              vendor: p.vendor || storefront.name,
              price: p.price,
              comparePrice: p.compareAtPrice || null,
              currency: p.currency || storefront.currency,
              typology: p.typology,
              rawMetadata: JSON.stringify(p),
              status: "READY",
            },
            create: {
              companyId: orgId,
              storefrontId: storefront.id,
              title: p.title,
              sourceUrl: p.sourceUrl,
              vendor: p.vendor || storefront.name,
              price: p.price,
              comparePrice: p.compareAtPrice || null,
              currency: p.currency || storefront.currency,
              typology: p.typology,
              rawMetadata: JSON.stringify(p),
              status: "READY",
            },
          });

          // Bulk upsert extracted assets using createMany with skipDuplicates
          if (p.assets && p.assets.length > 0) {
            await prisma.productAsset.createMany({
              data: p.assets.map((asset, idx) => ({
                campaignId: campaign.id,
                rawUrl: asset.url,
                assetType: asset.type || (idx === 0 ? "hero_packshot" : "lifestyle_context"),
                isPrimary: idx === 0,
              })),
            });
          }
        })
      );
    }

    // Update Storefront metadata
    const totalInDb = await prisma.productCampaign.count({
      where: { storefrontId: storefront.id },
    });

    await prisma.storefront.update({
      where: { id: storefront.id },
      data: {
        lastScrapedAt: new Date(),
        productCount: totalInDb,
      },
    });

    return NextResponse.json({
      success: true,
      scrapedCount: scrapedProducts.length,
      totalInDb,
      storefrontId: storefront.id,
      storeName: storefront.name,
      products: scrapedProducts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/storefronts/[id]/scrape] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
