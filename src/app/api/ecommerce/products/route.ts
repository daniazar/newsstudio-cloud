/**
 * src/app/api/ecommerce/products/route.ts
 *
 * Full CRUD and catalog management API for E-Commerce Products.
 * Allows merchants to list all ingested products, create custom products,
 * update product specs, and delete products from the database.
 * Hardened with strict tenant isolation, eager loading, and zero raw SQL.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip, take, q } = parseListParams(searchParams);
    const id = searchParams.get("id");
    const search = q || searchParams.get("search") || "";
    const typology = searchParams.get("typology") || "";
    const storefrontId = searchParams.get("storefrontId") || "";
    const sortBy = searchParams.get("sortBy") || "newest";

    const andConditions: Record<string, unknown>[] = [{ companyId: orgId }];

    if (id) {
      andConditions.push({
        OR: [
          { id: id },
          { rawMetadata: { contains: id } },
          { sourceUrl: { contains: id } },
        ],
      });
    }

    if (storefrontId && storefrontId !== "all") {
      andConditions.push({ storefrontId });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search } },
          { vendor: { contains: search } },
          { sourceUrl: { contains: search } },
        ],
      });
    }

    if (typology && typology !== "all") {
      andConditions.push({ typology });
    }

    const whereClause: Record<string, unknown> = { AND: andConditions };

    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
    if (sortBy === "price_asc") orderBy = { price: "asc" };
    else if (sortBy === "price_desc") orderBy = { price: "desc" };
    else if (sortBy === "title") orderBy = { title: "asc" };
    else if (sortBy === "oldest") orderBy = { createdAt: "asc" };

    const [campaigns, total] = await Promise.all([
      prisma.productCampaign.findMany({
        where: whereClause,
        take: id ? 1 : take,
        skip: id ? 0 : skip,
        orderBy,
        include: {
          variations: id
            ? true
            : {
                select: {
                  id: true,
                  campaignId: true,
                  archetype: true,
                  targetChannel: true,
                  aspectRatio: true,
                  audioMode: true,
                  status: true,
                  renderedVideoKey: true,
                  thumbnailKey: true,
                  durationSeconds: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
          assets: {
            select: {
              id: true,
              rawUrl: true,
              assetType: true,
              isPrimary: true,
            },
          },
        },
      }),
      prisma.productCampaign.count({ where: whereClause }),
    ]);

    const products = campaigns.map((camp) => {
      let spec = null;
      try {
        if (camp.rawMetadata) {
          const parsed = JSON.parse(camp.rawMetadata);
          spec = parsed.spec || parsed;
        }
      } catch {
        // Fallback spec from direct columns
      }

      const dbAssets = (camp.assets || []).map((a) => ({
        id: a.id,
        url: a.rawUrl,
        type: a.assetType || "hero_packshot",
        isPrimary: Boolean(a.isPrimary),
      }));

      let finalSpec = spec;
      if (finalSpec) {
        finalSpec.id = camp.id;
        const seenUrls = new Set<string>();
        const mergedAssets: Array<{ id: string; url: string; type: string; isPrimary: boolean }> = [];

        for (const a of finalSpec.assets || []) {
          if (a?.url && !seenUrls.has(a.url)) {
            seenUrls.add(a.url);
            mergedAssets.push(a);
          }
        }
        for (const a of dbAssets) {
          if (a?.url && !seenUrls.has(a.url)) {
            seenUrls.add(a.url);
            mergedAssets.push(a);
          }
        }
        finalSpec.assets = mergedAssets;
      } else {
        finalSpec = {
          id: camp.id,
          title: camp.title,
          vendor: camp.vendor || "Direct",
          price: camp.price,
          compareAtPrice: camp.comparePrice || undefined,
          currency: camp.currency || "USD",
          typology: camp.typology,
          sourceUrl: camp.sourceUrl,
          description: camp.title,
          bulletPoints: [],
          assets: dbAssets,
          brand: { name: camp.vendor || "Brand", primaryColor: "#06b6d4" },
        };
      }

      const totalAssets = Math.max(camp.assets?.length || 0, finalSpec.assets?.length || 0);
      const primaryAsset =
        finalSpec.assets?.find((a: { isPrimary?: boolean; url?: string }) => a.isPrimary)?.url ||
        finalSpec.assets?.[0]?.url ||
        camp.assets?.[0]?.rawUrl ||
        "/placeholder_product.png";

      return {
        id: camp.id,
        title: camp.title,
        vendor: camp.vendor || "Direct",
        price: camp.price,
        compareAtPrice: camp.comparePrice || undefined,
        currency: camp.currency || "USD",
        typology: camp.typology,
        sourceUrl: camp.sourceUrl,
        status: camp.status,
        createdAt: camp.createdAt.toISOString(),
        variationCount: camp.variations?.length || 0,
        assetCount: totalAssets,
        thumbnailUrl: primaryAsset,
        spec: finalSpec,
      };
    });

    const singleProduct = id ? products.find((p) => p.id === id) || products[0] || null : null;

    return NextResponse.json({
      ...listResponse(products, total, page, limit),
      success: true,
      count: products.length,
      product: singleProduct,
      products,
    });
  } catch (error: unknown) {
    console.error("[API /api/ecommerce/products] GET Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const { title, vendor, price, compareAtPrice, currency, typology, sourceUrl, storefrontId, assets, bulletPoints } = body;

    if (!title || price === undefined) {
      return NextResponse.json(
        { success: false, error: "Title and price are required." },
        { status: 400 }
      );
    }

    const fullSpec = {
      id: "temp",
      title,
      vendor: vendor || "Custom Store",
      price: parseFloat(price) || 0,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
      currency: currency || "USD",
      typology: typology || "discrete_object",
      sourceUrl: sourceUrl || "https://store.local/custom-product",
      bulletPoints: bulletPoints || ["Engineered for high performance", "100% Satisfaction Guarantee"],
      assets: assets || [],
      brand: {
        name: vendor || "Custom Store",
        primaryColor: "#06b6d4",
        secondaryColor: "#f43f5e",
      },
      scrapedAt: new Date().toISOString(),
    };

    const campaign = await prisma.productCampaign.create({
      data: {
        companyId: orgId,
        storefrontId: storefrontId || null,
        sourceUrl: fullSpec.sourceUrl,
        title: fullSpec.title,
        vendor: fullSpec.vendor,
        price: fullSpec.price,
        comparePrice: fullSpec.compareAtPrice,
        currency: fullSpec.currency,
        typology: fullSpec.typology,
        rawMetadata: JSON.stringify(fullSpec),
        status: "READY",
      },
    });

    fullSpec.id = campaign.id;

    return NextResponse.json({
      success: true,
      product: fullSpec,
      campaignId: campaign.id,
    });
  } catch (error: unknown) {
    console.error("[API /api/ecommerce/products] POST Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const { id, script, presenterConfig, specUpdates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Product / Campaign ID is required" }, { status: 400 });
    }

    const campaign = await prisma.productCampaign.findFirst({
      where: { id, companyId: orgId },
      include: { variations: true },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }

    let parsedSpec: Record<string, unknown> = {};
    try {
      if (campaign.rawMetadata) {
        parsedSpec = JSON.parse(campaign.rawMetadata);
      }
    } catch {
      parsedSpec = {};
    }

    if (script) {
      parsedSpec.savedScript = script;
    }
    if (presenterConfig) {
      parsedSpec.savedPresenterConfig = presenterConfig;
    }
    if (specUpdates && typeof specUpdates === "object") {
      Object.assign(parsedSpec, specUpdates);
    }

    const newStatus = body.status || (script ? "SCRIPTED" : undefined);
    if (newStatus) {
      parsedSpec.status = newStatus;
    }

    // Persist updated spec in rawMetadata
    await prisma.productCampaign.update({
      where: { id: campaign.id },
      data: {
        rawMetadata: JSON.stringify(parsedSpec),
        ...(newStatus ? { status: newStatus } : {}),
        updatedAt: new Date(),
      },
    });

    // Also persist/sync to AdVariation if script is present
    if (script) {
      const existingVar = campaign.variations?.[0];
      if (existingVar) {
        await prisma.adVariation.update({
          where: { id: existingVar.id },
          data: {
            scriptJson: JSON.stringify(script),
            archetype: script.archetype || existingVar.archetype,
            aspectRatio: script.aspectRatio || existingVar.aspectRatio,
            durationSeconds: (script.totalFrames || 450) / 30,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.adVariation.create({
          data: {
            campaignId: campaign.id,
            archetype: script.archetype || "pdp_showcase",
            aspectRatio: script.aspectRatio || "9:16",
            scriptJson: JSON.stringify(script),
            durationSeconds: (script.totalFrames || 450) / 30,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Campaign and script state successfully persisted.",
      savedScript: parsedSpec.savedScript,
      savedPresenterConfig: parsedSpec.savedPresenterConfig,
    });
  } catch (error: unknown) {
    console.error("[API /api/ecommerce/products] PATCH Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to update product state" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const campaign = await prisma.productCampaign.findFirst({
      where: { id, companyId: orgId },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: "Product not found or not owned by your organization" }, { status: 404 });
    }

    await prisma.productCampaign.delete({
      where: { id: campaign.id },
    });

    return NextResponse.json({ success: true, message: "Product deleted from catalog." });
  } catch (error: unknown) {
    console.error("[API /api/ecommerce/products] DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to delete product" },
      { status: 500 }
    );
  }
}
