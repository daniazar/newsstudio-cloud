/**
 * src/app/api/webhooks/shopify/route.ts
 *
 * Shopify Webhook Ingestion Handler.
 * Automatically ingests newly created or updated products from Shopify stores,
 * classifies typologies, and enqueues draft video ad campaigns.
 */

import { compileAdScript } from "@/lib/ecommerce/adCopywriter";
import { verifyShopifyHmac } from "@/lib/ecommerce/shopifyHmac";
import { classifyProductTypology } from "@/lib/ecommerce/typologyClassifier";
import { prisma } from "@/lib/prisma";
import { ProductSpec } from "@/lib/types/ecommerce";
import { NextRequest,NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const hmac = req.headers.get("x-shopify-hmac-sha256");
    const topic = req.headers.get("x-shopify-topic") || "products/create";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "store.myshopify.com";

    // 1. Verify Webhook Signature
    const isValid = verifyShopifyHmac(rawBody, hmac, process.env.SHOPIFY_WEBHOOK_SECRET);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid Shopify webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Parse Shopify Product Payload
    const title = payload.title || "Untitled Product";
    const vendor = payload.vendor || shopDomain;
    const bodyHtml = payload.body_html || "";
    const cleanDescription = bodyHtml.replace(/<[^>]*>?/gm, "").trim();

    const variants = payload.variants || [];
    const firstVariant = variants[0] || {};
    const price = parseFloat(firstVariant.price) || 0;
    const compareAtPrice = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : undefined;

    // Bullet points from description
    const bulletPoints = cleanDescription
      .split(/\n|•|-|\./)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 15 && s.length < 120)
      .slice(0, 5);

    // Images
    const images = payload.images || [];
    const assets = images.map(
      (img: { id?: string | number; src?: string; width?: number; height?: number }, idx: number) => ({
        id: `shopify_${img.id || idx}`,
        url: img.src || "",
        type: idx === 0 ? ("hero_packshot" as const) : ("lifestyle_context" as const),
        isPrimary: idx === 0,
        width: img.width,
        height: img.height,
      })
    );

    const rawSpec: ProductSpec = {
      id: `shopify_${payload.id}`,
      sourceUrl: `https://${shopDomain}/products/${payload.handle}`,
      title,
      vendor,
      description: cleanDescription,
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : ["Engineered for unmatched performance"],
      price,
      compareAtPrice,
      currency: "USD",
      inStock: firstVariant.available !== false,
      typology: "discrete_object",
      brand: {
        name: vendor,
        domain: shopDomain,
        logoUrl: null,
        faviconUrl: null,
        appleTouchIconUrl: null,
        primaryColor: "#06b6d4",
        secondaryColor: "#f43f5e",
        surfaceColor: "#09090b",
        toneOfVoice: "playful_hype",
        taglines: [],
      },
      variants: variants.map(
        (v: {
          id: string | number;
          title?: string;
          price?: string | number;
          compare_at_price?: string | number;
          sku?: string;
          available?: boolean;
        }) => ({
          id: String(v.id),
          title: v.title,
          price: parseFloat(String(v.price)) || 0,
          compareAtPrice: v.compare_at_price ? parseFloat(String(v.compare_at_price)) : undefined,
          sku: v.sku,
          inStock: v.available !== false,
        })
      ),
      assets,
      topReviews: [],
      scrapedAt: new Date().toISOString(),
    };

    // 3. Classify Product Typology
    const classification = classifyProductTypology(rawSpec);
    const spec: ProductSpec = {
      ...rawSpec,
      typology: classification.typology,
      typologySpecifics: classification.typologySpecifics,
    };

    // 4. Synthesize Default Commercial Script
    const script = compileAdScript({
      productSpec: spec,
      archetype: "pdp_showcase",
      targetChannel: "shopify_pdp",
      durationSeconds: 20,
    });

    // 5. Upsert ProductCampaign in Database
    let campaignId: string | null = null;
    try {
      // Find matching registered storefront by shop domain
      const storefront = await prisma.storefront.findFirst({
        where: {
          platform: "shopify",
          OR: [
            { url: { contains: shopDomain } },
            { name: { contains: shopDomain } },
          ],
        },
      });

      if (!storefront) {
        console.warn(`[Shopify Webhook] No matching storefront registered for domain "${shopDomain}"`);
        return NextResponse.json(
          { error: `No storefront registered for domain ${shopDomain}` },
          { status: 404 }
        );
      }

      const campaign = await prisma.productCampaign.upsert({
        where: {
          companyId_sourceUrl: {
            companyId: storefront.companyId,
            sourceUrl: spec.sourceUrl,
          },
        },
        update: {
          title: spec.title,
          vendor: spec.vendor,
          price: spec.price,
          comparePrice: spec.compareAtPrice,
          currency: spec.currency,
          typology: spec.typology,
          rawMetadata: JSON.stringify({ spec, payload }),
          status: "READY",
          storefrontId: storefront.id,
        },
        create: {
          companyId: storefront.companyId,
          storefrontId: storefront.id,
          sourceUrl: spec.sourceUrl,
          title: spec.title,
          vendor: spec.vendor,
          price: spec.price,
          comparePrice: spec.compareAtPrice,
          currency: spec.currency,
          typology: spec.typology,
          rawMetadata: JSON.stringify({ spec, payload }),
          status: "READY",
          variations: {
            create: {
              archetype: script.archetype,
              targetChannel: script.targetChannel,
              aspectRatio: script.aspectRatio,
              durationSeconds: script.durationSeconds,
              scriptJson: JSON.stringify(script),
              status: "PENDING",
            },
          },
        },
      });
      campaignId = campaign.id;
    } catch (dbErr) {
      console.warn("Could not save Shopify campaign to database (continuing):", dbErr);
    }

    return NextResponse.json({
      received: true,
      topic,
      productTitle: spec.title,
      typology: spec.typology,
      campaignId,
      scriptSummary: script.hookHeadline,
    });
  } catch (error: unknown) {
    console.error("Shopify webhook processing error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Webhook handling failed" },
      { status: 500 }
    );
  }
}
