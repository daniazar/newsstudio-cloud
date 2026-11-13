import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;

    const brand = await prisma.brand.findFirst({
      where: { id, companyId: orgId },
      include: {
        rssGroups: {
          include: { feeds: true }
        },
        personas: true,
        channels: {
          include: {
            publishes: {
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { video: { include: { story: true } } }
            }
          }
        }
      }
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Mask sensitive credentials for all channels
    const maskedBrand = {
      ...brand,
      channels: brand.channels.map(channel => ({
        ...channel,
        clientId: channel.clientId ? "••••••••••••••••" : null,
        clientSecret: channel.clientSecret ? "••••••••••••••••" : null,
        accessToken: channel.accessToken ? "••••••••••••••••" : null,
        refreshToken: channel.refreshToken ? "••••••••••••••••" : null,
        hasCredentials: !!channel.clientId && !!channel.clientSecret,
        isConnected: !!channel.accessToken && !!channel.refreshToken
      }))
    };

    return NextResponse.json(maskedBrand);
  } catch (error) {
    console.error("GET /api/brands/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;

    const brandExists = await prisma.brand.findFirst({ where: { id, companyId: orgId } });
    if (!brandExists) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const {
      name,
      handle,
      isActive,
      profileImageUrl,
      titleTemplate,
      descriptionTemplate,
      watermarkStorageKey,
      hashtagBank,
      toneOfVoice,
      primaryColor,
      secondaryColor,
      captionStyle,
      preferredMusicMood,
      introVideoStorageKey,
      outroVideoStorageKey,
      logoStorageKeys,
      autoPublish,
      linkedRssGroupIds,
      linkedPersonaIds,
    } = await request.json();

    const updatedData: Prisma.BrandUpdateInput = {};
    if (name !== undefined) updatedData.name = name;
    if (handle !== undefined) updatedData.handle = handle;
    if (isActive !== undefined) updatedData.isActive = isActive;
    if (profileImageUrl !== undefined) updatedData.profileImageUrl = profileImageUrl;
    if (titleTemplate !== undefined) updatedData.titleTemplate = titleTemplate;
    if (descriptionTemplate !== undefined) updatedData.descriptionTemplate = descriptionTemplate;
    if (watermarkStorageKey !== undefined) updatedData.watermarkStorageKey = watermarkStorageKey;
    if (hashtagBank !== undefined) updatedData.hashtagBank = hashtagBank;
    if (toneOfVoice !== undefined) updatedData.toneOfVoice = toneOfVoice;
    if (primaryColor !== undefined) updatedData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updatedData.secondaryColor = secondaryColor;
    if (captionStyle !== undefined) updatedData.captionStyle = captionStyle;
    if (preferredMusicMood !== undefined) updatedData.preferredMusicMood = preferredMusicMood;
    if (introVideoStorageKey !== undefined) updatedData.introVideoStorageKey = introVideoStorageKey;
    if (outroVideoStorageKey !== undefined) updatedData.outroVideoStorageKey = outroVideoStorageKey;
    if (logoStorageKeys !== undefined) updatedData.logoStorageKeys = logoStorageKeys;
    if (autoPublish !== undefined) updatedData.autoPublish = autoPublish;

    // Use transaction to update relations
    const result = await prisma.$transaction(async (tx) => {
      // Connect/Disconnect logic for implicit m-n
      if (linkedRssGroupIds !== undefined && Array.isArray(linkedRssGroupIds)) {
        updatedData.rssGroups = {
          set: linkedRssGroupIds.map((groupId) => ({ id: groupId }))
        };
      }
      
      if (linkedPersonaIds !== undefined && Array.isArray(linkedPersonaIds)) {
        updatedData.personas = {
          set: linkedPersonaIds.map((personaId) => ({ id: personaId }))
        };
      }

      const b = await tx.brand.update({
        where: { id },
        data: updatedData,
        include: { rssGroups: true, personas: true }
      });

      return b;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT /api/brands/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;

    const brandExists = await prisma.brand.findFirst({ where: { id, companyId: orgId } });
    if (!brandExists) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    await prisma.brand.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/brands/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
