/**
 * src/app/api/ecommerce/parse/route.ts
 *
 * Unified E-Commerce Product Harvester & Brand DNA Extractor API.
 * 
 * Orchestrates:
 * 1. Tier 1: Shopify Direct JSON Harvester (fastest, un-obfuscated)
 * 2. Tier 2: JSDOM Schema.org JSON-LD & OpenGraph Harvester
 * 3. Tier 3: Gemini 2.5 Flash Vision & LLM Fallback
 * 4. Product Typology Classifier (Surfaces, Gadgets, Apparel, Consumables, etc.)
 * 5. Autonomous Brand DNA Harvester (Logos, Favicons, Hex Palettes)
 *
 * Usage:
 *   POST /api/ecommerce/parse
 *   Body: { "url": "https://brand.com/products/item", "companyId": "optional-org-id" }
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyProduct } from "@/lib/ecommerce/parsers/shopifyParser";
import { isMarketplaceUrl, fetchMarketplaceProduct } from "@/lib/ecommerce/parsers/marketplaceScraper";
import { scrapeTiendanubeProduct } from "@/lib/ecommerce/parsers/tiendanubeParser";
import { fetchHtmlAndParse } from "@/lib/ecommerce/parsers/jsonLdParser";
import { extractWithGemini } from "@/lib/ecommerce/parsers/geminiVisionExtractor";
import { harvestBrandDNA } from "@/lib/ecommerce/brandHarvester";
import { classifyProductTypology } from "@/lib/ecommerce/typologyClassifier";
import { ProductSpec } from "@/lib/types/ecommerce";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;
    const { orgId } = t.tenant;

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid product URL is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Malformed URL format." },
        { status: 400 }
      );
    }

    const domain = parsedUrl.hostname;
    let partialSpec: Partial<ProductSpec> | null = null;
    let rawHtml: string | undefined = undefined;

    // -------------------------------------------------------------
    // Tier 1: Shopify Direct JSON
    // -------------------------------------------------------------
    const shopifyResult = await fetchShopifyProduct(url);
    if (shopifyResult.isShopify && shopifyResult.parsedSpec?.title) {
      partialSpec = shopifyResult.parsedSpec;
    }

    // -------------------------------------------------------------
    // Tier 1.2: Tiendanube / Nuvemshop Dedicated Harvester
    // -------------------------------------------------------------
    if (!partialSpec?.title && (url.includes("/productos/") || url.includes("/produtos/") || url.includes("mitiendanube.com") || url.includes("nuvemshop.com.br"))) {
      try {
        const tnProduct = await scrapeTiendanubeProduct(url);
        if (tnProduct?.title) {
          partialSpec = tnProduct;
        }
      } catch {
        // Fall through to marketplace / JSON-LD
      }
    }

    // -------------------------------------------------------------
    // Tier 1.5: Stealth Marketplace Scraper (Amazon, Walmart, MercadoLibre)
    // -------------------------------------------------------------
    if (!partialSpec?.title && isMarketplaceUrl(url)) {
      const marketplaceResult = await fetchMarketplaceProduct(url);
      if (marketplaceResult.parsedSpec?.title) {
        partialSpec = marketplaceResult.parsedSpec;
      }
    }

    // -------------------------------------------------------------
    // Tier 2: Standardized JSON-LD & OpenGraph Markup
    // -------------------------------------------------------------
    if (!partialSpec?.title) {
      const jsonLdResult = await fetchHtmlAndParse(url);
      if (jsonLdResult.hasProductData && jsonLdResult.parsedSpec?.title) {
        partialSpec = jsonLdResult.parsedSpec;
        if (jsonLdResult.rawHtml) {
          rawHtml = jsonLdResult.rawHtml;
        }
      }
    }

    // -------------------------------------------------------------
    // Tier 3: Gemini 2.5 Flash Fallback
    // -------------------------------------------------------------
    if (!partialSpec?.title) {
      try {
        const pageRes = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RubyBot/1.0" },
        });
        if (pageRes.ok) {
          rawHtml = await pageRes.text();
          const geminiResult = await extractWithGemini({
            sourceUrl: url,
            pageText: rawHtml,
          });
          if (geminiResult?.title) {
            partialSpec = geminiResult;
          }
        }
      } catch {
        // Fall through to error response
      }
    }

    // If still no title, could not parse
    if (!partialSpec || !partialSpec.title) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract product metadata. Please verify the URL or try pasting details manually.",
        },
        { status: 422 }
      );
    }

    // -------------------------------------------------------------
    // Product Typology Classification
    // -------------------------------------------------------------
    const classification = classifyProductTypology({
      title: partialSpec.title,
      description: partialSpec.description,
      vendor: partialSpec.vendor,
      bulletPoints: partialSpec.bulletPoints,
    });

    // -------------------------------------------------------------
    // Autonomous Brand DNA Harvesting
    // -------------------------------------------------------------
    const brandDNA = await harvestBrandDNA({
      domain,
      url,
      html: rawHtml,
      companyId: orgId,
      brandNameFallback: partialSpec.vendor,
    });

    if (!brandDNA.logoUrl && partialSpec.brand?.logoUrl) {
      brandDNA.logoUrl = partialSpec.brand.logoUrl;
    }

    // Assemble complete ProductSpec
    const fullProductSpec: ProductSpec = {
      id: partialSpec.id || `prod_${Date.now()}`,
      sourceUrl: url,
      title: partialSpec.title,
      vendor: partialSpec.vendor || brandDNA.name,
      description: partialSpec.description || "",
      bulletPoints: partialSpec.bulletPoints || [],
      price: partialSpec.price || 0,
      compareAtPrice: partialSpec.compareAtPrice,
      currency: partialSpec.currency || "USD",
      inStock: partialSpec.inStock ?? true,
      rating: partialSpec.rating,
      reviewCount: partialSpec.reviewCount,
      typology: classification.typology,
      typologySpecifics: classification.typologySpecifics,
      brand: brandDNA,
      variants: partialSpec.variants || [],
      assets: partialSpec.assets || [],
      topReviews: partialSpec.topReviews || [],
      scrapedAt: partialSpec.scrapedAt || new Date().toISOString(),
    };

    let campaignId: string | null = null;
    try {
      const campaign = await prisma.productCampaign.upsert({
        where: {
          companyId_sourceUrl: {
            companyId: orgId,
            sourceUrl: url,
          },
        },
        update: {
          title: fullProductSpec.title,
          vendor: fullProductSpec.vendor,
          price: fullProductSpec.price,
          comparePrice: fullProductSpec.compareAtPrice,
          currency: fullProductSpec.currency,
          typology: fullProductSpec.typology,
          rawMetadata: JSON.stringify(fullProductSpec),
          status: "READY",
        },
        create: {
          companyId: orgId,
          sourceUrl: url,
          title: fullProductSpec.title,
          vendor: fullProductSpec.vendor,
          price: fullProductSpec.price,
          comparePrice: fullProductSpec.compareAtPrice,
          currency: fullProductSpec.currency,
          typology: fullProductSpec.typology,
          rawMetadata: JSON.stringify(fullProductSpec),
          status: "READY",
        },
      });
      campaignId = campaign.id;
      fullProductSpec.id = campaign.id;
    } catch (dbErr) {
      console.warn("Could not persist scraped campaign to Prisma (continuing in-memory):", dbErr);
    }

    return NextResponse.json({
      success: true,
      product: fullProductSpec,
      productSpec: fullProductSpec,
      brand: brandDNA,
      campaignId,
      classification: {
        typology: classification.typology,
        confidence: classification.confidence,
        matchedKeywords: classification.matchedKeywords,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error.";
    console.error("[API /api/ecommerce/parse] Error:", errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
