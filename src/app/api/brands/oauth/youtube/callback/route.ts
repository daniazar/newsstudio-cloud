import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

interface OAuthState {
  companyId: string;
  brandId: string;
  channelId?: string;
  nonce: string;
  exp: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (errorParam || !code) {
    console.error("❌ [YouTube OAuth Callback] Authorization failed or was cancelled by user:", errorParam);
    return NextResponse.redirect(`${appUrl}/brands?error=oauth_cancelled`);
  }

  // 1. Verify and decrypt cryptographic state parameter (CSRF Protection)
  if (!stateParam) {
    console.error("❌ [YouTube OAuth Callback] Missing OAuth state parameter (Possible CSRF attempt)");
    return NextResponse.redirect(`${appUrl}/brands?error=missing_oauth_state`);
  }

  let state: OAuthState;
  try {
    const decryptedState = decryptSecret(stateParam);
    state = JSON.parse(decryptedState) as OAuthState;

    if (!state.companyId || !state.brandId || !state.exp) {
      throw new Error("Malformed state payload");
    }

    if (Date.now() > state.exp) {
      console.error("❌ [YouTube OAuth Callback] OAuth state expired");
      return NextResponse.redirect(`${appUrl}/brands?error=oauth_state_expired`);
    }
  } catch (err) {
    console.error("❌ [YouTube OAuth Callback] Invalid or forged OAuth state:", err);
    return NextResponse.redirect(`${appUrl}/brands?error=invalid_oauth_state`);
  }

  const { companyId, brandId, channelId } = state;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/brands/oauth/youtube/callback`;

  if (!clientId || !clientSecret) {
    console.error("❌ [YouTube OAuth Callback] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in env.");
    return NextResponse.redirect(`${appUrl}/brands?error=env_config_error`);
  }

  try {
    // 2. Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ [YouTube OAuth Callback] Token exchange failed:", errorText);
      return NextResponse.redirect(`${appUrl}/brands?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const rawAccessToken = tokenData.access_token;
    const rawRefreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // 3. Encrypt sensitive tokens before persistence
    const encryptedAccessToken = encryptSecret(rawAccessToken);
    const encryptedRefreshToken = rawRefreshToken ? encryptSecret(rawRefreshToken) : undefined;

    // 4. Fetch YouTube Channel details
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: {
          Authorization: `Bearer ${rawAccessToken}`,
        },
      }
    );

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error("❌ [YouTube OAuth Callback] Error fetching channel details:", errorText);
      return NextResponse.redirect(`${appUrl}/brands?error=profile_fetch_failed`);
    }

    const channelData = await channelResponse.json();
    const channelItem = channelData.items?.[0];

    if (!channelItem) {
      console.error("❌ [YouTube OAuth Callback] No YouTube channel associated with this Google account.");
      return NextResponse.redirect(`${appUrl}/brands?error=no_channel_found`);
    }

    const channelName = channelItem.snippet.title;
    const channelHandle = channelItem.snippet.customUrl || `@${channelItem.id}`;
    const profileImageUrl = channelItem.snippet.thumbnails?.default?.url || "/placeholder_youtube.png";
    const subscriberCount = parseInt(channelItem.statistics?.subscriberCount || "0", 10);

    // 5. Persist scoped strictly to companyId and brandId
    const existingChannel = channelId
      ? await prisma.socialChannel.findFirst({
          where: { id: channelId, companyId },
        })
      : await prisma.socialChannel.findFirst({
          where: {
            companyId,
            platform: "youtube",
            handle: channelHandle,
          },
        });

    const updateData = {
      name: channelName,
      profileImageUrl,
      accessToken: encryptedAccessToken,
      tokenExpiry,
      subscriberCount,
      followerCount: 0,
      lastSyncedAt: new Date(),
      isActive: true,
      ...(encryptedRefreshToken ? { refreshToken: encryptedRefreshToken } : {}),
    };

    if (existingChannel) {
      await prisma.socialChannel.update({
        where: { id: existingChannel.id },
        data: updateData,
      });
    } else {
      await prisma.socialChannel.create({
        data: {
          companyId,
          brandId,
          platform: "youtube",
          handle: channelHandle,
          refreshToken: encryptedRefreshToken || encryptSecret("placeholder_refresh_token_not_returned_by_google"),
          ...updateData,
        },
      });
    }

    return NextResponse.redirect(`${appUrl}/brands/${brandId}?success=youtube_connected`);
  } catch (error) {
    console.error("❌ [YouTube OAuth Callback] Unhandled error during OAuth flow:", error);
    return NextResponse.redirect(`${appUrl}/brands?error=internal_oauth_error`);
  }
}
