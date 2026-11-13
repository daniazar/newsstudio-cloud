import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const url = new URL(request.url);
    const isLite = url.searchParams.get("lite") === "true";
    const { page, limit, skip, take, q } = parseListParams(url.searchParams);
    const where: Record<string, unknown> = { companyId: orgId };
    if (q) where.name = { contains: q };

    if (isLite) {
      const [liteBrands, total] = await Promise.all([
        prisma.brand.findMany({
          where,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            handle: true,
            profileImageUrl: true,
            isActive: true,
            createdAt: true,
            rssGroups: {
              select: {
                id: true,
                name: true,
                feeds: {
                  select: {
                    id: true,
                    name: true,
                    url: true,
                  },
                },
              },
            },
          },
          skip,
          take,
        }),
        prisma.brand.count({ where }),
      ]);
      const res = NextResponse.json({ ...listResponse(liteBrands, total, page, limit), brands: liteBrands });
      res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
      return res;
    }

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          channels: {
            include: {
              _count: { select: { publishes: true } }
            }
          },
          personas: {
            select: { id: true, name: true, slug: true, role: true, avatarType: true },
          },
          rssGroups: {
            include: {
              feeds: {
                select: { id: true, name: true, url: true, isEnabled: true },
              },
            },
          },
        },
        skip,
        take,
      }),
      prisma.brand.count({ where }),
    ]);

    // Mask sensitive credentials inside channels
    const maskedBrands = brands.map((brand) => ({
      ...brand,
      channels: brand.channels.map(c => ({
        ...c,
        clientId: c.clientId ? "••••••••••••••••" : null,
        clientSecret: c.clientSecret ? "••••••••••••••••" : null,
        accessToken: c.accessToken ? "••••••••••••••••" : null,
        refreshToken: c.refreshToken ? "••••••••••••••••" : null,
        hasCredentials: !!c.clientId && !!c.clientSecret,
        isConnected: !!c.accessToken && !!c.refreshToken
      }))
    }));

    // `data` is canonical; `brands` retained as a deprecated alias for existing consumers.
    const res = NextResponse.json({ ...listResponse(maskedBrands, total, page, limit), brands: maskedBrands });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (error) {
    console.error("GET /api/brands failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await request.json();
    const { name, handle, profileImageUrl, titleTemplate, descriptionTemplate, autoPublish } = body;

    if (!name || !handle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        companyId: orgId,
        name,
        handle,
        profileImageUrl,
        titleTemplate: titleTemplate || null,
        descriptionTemplate: descriptionTemplate || null,
        autoPublish: autoPublish || false,
        isActive: true,
      },
      include: {
        channels: true
      }
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("POST /api/brands failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
