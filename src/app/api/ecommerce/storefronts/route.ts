/**
 * src/app/api/ecommerce/storefronts/route.ts
 *
 * Storefront Directory & Webpage Registry API.
 * Manages registered e-commerce websites linked to the active company tenant.
 * Hardened with strict tenant isolation and typed Prisma queries.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { harvestBrandDNA } from "@/lib/ecommerce/brandHarvester";

const STOREHAUS_LOGO = "https://dcdn-us.mitiendanube.com/stores/006/100/594/themes/common/logo-984349678-1744744104-c583fca7419d636032dc7050fd72a8641744744104.png?0";

export async function GET(_req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    let storefronts = await prisma.storefront.findMany({
      where: { companyId: orgId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Auto-seed StoreHaus if no storefronts exist yet for this tenant
    if (storefronts.length === 0) {
      const defaultStore = await prisma.storefront.create({
        data: {
          companyId: orgId,
          name: "StoreHaus",
          url: "https://www.storehaus.com.ar",
          platform: "tiendanube",
          currency: "ARS",
          description: "Pisos vinílicos SPC, pisos flotantes alemanes, porcelanatos rectificados y decks.",
          logoUrl: STOREHAUS_LOGO,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
      storefronts = [defaultStore];
    }

    const formatted = storefronts.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      platform: s.platform,
      currency: s.currency,
      description: s.description,
      logoUrl: s.logoUrl,
      lastScrapedAt: s.lastScrapedAt ? s.lastScrapedAt.toISOString() : null,
      productCount: s._count?.products ?? s.productCount ?? 0,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      storefronts: formatted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/ecommerce/storefronts] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json();
    const { name, url, platform = "tiendanube", currency = "ARS", description } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Storefront URL is required." },
        { status: 400 }
      );
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;
    const derivedName = name || domain.replace(/^www\./, "").split(".")[0].toUpperCase();

    let discoveredLogoUrl = `https://${domain}/favicon.ico`;
    try {
      const brandDna = await harvestBrandDNA({ domain });
      if (brandDna.logoUrl) {
        discoveredLogoUrl = brandDna.logoUrl;
      } else if (brandDna.appleTouchIconUrl) {
        discoveredLogoUrl = brandDna.appleTouchIconUrl;
      }
    } catch {
      // Fallback to favicon
    }

    const storefront = await prisma.storefront.upsert({
      where: {
        companyId_url: {
          companyId: orgId,
          url: urlObj.origin,
        },
      },
      update: {
        name: derivedName,
        platform,
        currency,
        description: description || undefined,
        logoUrl: discoveredLogoUrl,
      },
      create: {
        companyId: orgId,
        name: derivedName,
        url: urlObj.origin,
        platform,
        currency,
        description: description || `Official storefront catalog for ${derivedName}`,
        logoUrl: discoveredLogoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      storefront,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/storefronts] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
