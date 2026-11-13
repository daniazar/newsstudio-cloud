import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/secrets";
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
    const ch = await prisma.socialChannel.findFirst({
      where: { id, companyId: orgId },
      include: { brand: true }
    });

    if (!ch) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Mask credentials
    return NextResponse.json({
      ...ch,
      clientId: ch.clientId ? "********" : null,
      clientSecret: ch.clientSecret ? "********" : null,
      accessToken: ch.accessToken ? "********" : null,
      refreshToken: ch.refreshToken ? "********" : null,
    });
  } catch (error) {
    console.error("GET /api/channels/[id] failed:", error);
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
    const body = await request.json();
    const { clientId, clientSecret, titleTemplate, descriptionTemplate, isActive } = body;

    const channelExists = await prisma.socialChannel.findFirst({ where: { id, companyId: orgId } });
    if (!channelExists) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const updatedData: Prisma.SocialChannelUpdateInput = {};
    if (clientId !== undefined) updatedData.clientId = clientId ? encryptSecret(clientId) : null;
    if (clientSecret !== undefined) updatedData.clientSecret = clientSecret ? encryptSecret(clientSecret) : null;
    if (titleTemplate !== undefined) updatedData.titleTemplate = titleTemplate;
    if (descriptionTemplate !== undefined) updatedData.descriptionTemplate = descriptionTemplate;
    if (isActive !== undefined) updatedData.isActive = isActive;

    const ch = await prisma.socialChannel.update({
      where: { id },
      data: updatedData,
    });

    // Mask encrypted credentials before sending to the client.
    return NextResponse.json({
      ...ch,
      clientId: ch.clientId ? "********" : null,
      clientSecret: ch.clientSecret ? "********" : null,
      accessToken: ch.accessToken ? "********" : null,
      refreshToken: ch.refreshToken ? "********" : null,
    });
  } catch (error) {
    console.error("PUT /api/channels/[id] failed:", error);
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

    const channelExists = await prisma.socialChannel.findFirst({ where: { id, companyId: orgId } });
    if (!channelExists) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    await prisma.socialChannel.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/channels/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
