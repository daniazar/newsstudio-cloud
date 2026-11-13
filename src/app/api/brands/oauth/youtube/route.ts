import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { withTenantAuth } from "@/lib/apiHandler";
import { encryptSecret } from "@/lib/secrets";
import { prisma } from "@/lib/prisma";

export const GET = withTenantAuth(async (request: NextRequest, { tenant }) => {
  const { searchParams } = new URL(request.url);
  let brandId = searchParams.get("brandId");
  const channelId = searchParams.get("channelId");

  if (!brandId && channelId) {
    const channel = await prisma.socialChannel.findFirst({
      where: {
        id: channelId,
        companyId: tenant.orgId,
      },
    });
    if (channel) {
      brandId = channel.brandId;
    }
  }

  if (!brandId) {
    return NextResponse.json(
      { error: "brandId or valid channelId is required." },
      { status: 400 }
    );
  }

  // Verify the brand belongs to this tenant
  const brand = await prisma.brand.findFirst({
    where: {
      id: brandId,
      companyId: tenant.orgId,
    },
  });

  if (!brand) {
    return NextResponse.json(
      { error: "Brand not found or not owned by your organization." },
      { status: 404 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/brands/oauth/youtube/callback`;

  if (!clientId) {
    console.warn("⚠️ GOOGLE_CLIENT_ID no configurada en el entorno.");
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID no está configurada en las variables de entorno." },
      { status: 500 }
    );
  }

  // Encrypted state containing tenant orgId, brandId, channelId, nonce, and expiration (10 min)
  const statePayload = JSON.stringify({
    companyId: tenant.orgId,
    brandId,
    channelId: channelId || undefined,
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  });

  const state = encryptSecret(statePayload);

  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const oauthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes.join(" "))}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(oauthUrl);
});
