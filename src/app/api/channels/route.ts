import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseListParams, listResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { page, limit, skip, take, q } = parseListParams(new URL(request.url).searchParams);
    const where: Record<string, unknown> = { companyId: orgId };
    if (q) where.name = { contains: q };

    const [channels, total] = await Promise.all([
      prisma.socialChannel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              handle: true,
              profileImageUrl: true,
            },
          },
        },
        skip,
        take,
      }),
      prisma.socialChannel.count({ where }),
    ]);

    // Mask encrypted credentials before sending to the client.
    const masked = channels.map((ch) => ({
      ...ch,
      clientId: ch.clientId ? "********" : null,
      clientSecret: ch.clientSecret ? "********" : null,
      accessToken: ch.accessToken ? "********" : null,
      refreshToken: ch.refreshToken ? "********" : null,
    }));

    return NextResponse.json({ ...listResponse(masked, total, page, limit), channels: masked });
  } catch (error) {
    console.error("GET /api/channels failed:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { brandId, platform } = await request.json();

    if (!brandId || !platform) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const brand = await prisma.brand.findFirst({ where: { id: brandId, companyId: orgId } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Check if channel for this platform already exists for this brand
    const existing = await prisma.socialChannel.findFirst({
      where: { brandId, platform, companyId: orgId }
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 }); // Just return it if it exists
    }

    // Create the channel
    const channel = await prisma.socialChannel.create({
      data: {
        companyId: orgId,
        brandId,
        platform,
        name: `${brand.name} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
        handle: brand.handle
      }
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error("POST /api/channels failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
