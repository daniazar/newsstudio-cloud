import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("social:tiktok");

export interface TikTokPublishOptions {
  privacyLevel?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
  disableDuet?: boolean;
  disableStitch?: boolean;
  disableComment?: boolean;
  videoCoverTimestampMs?: number;
  isAigc?: boolean;
}

export interface TikTokAnalyticsResult {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

/**
 * Refreshes the TikTok creator/business access token using the refresh token.
 */
export async function refreshTikTokToken(channelId: string, refreshToken: string): Promise<string> {
  const channel = await prisma.socialChannel.findUnique({ where: { id: channelId } });
  const clientKey = channel?.clientId || process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_CLIENT_ID || "";
  const clientSecret = channel?.clientSecret || process.env.TIKTOK_CLIENT_SECRET || "";

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh TikTok token: ${errText}`);
  }

  const data = await response.json();
  if (data.error && data.error.code !== "ok") {
    throw new Error(`TikTok token refresh error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const newAccessToken = data.data?.access_token || data.access_token;
  const newRefreshToken = data.data?.refresh_token || data.refresh_token || refreshToken;
  const expiresIn = data.data?.expires_in || data.expires_in || 86400; // 24 hours default
  const newTokenExpiry = new Date(Date.now() + expiresIn * 1000);

  await prisma.socialChannel.update({
    where: { id: channelId },
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenExpiry: newTokenExpiry,
    },
  });

  return newAccessToken;
}

/**
 * Performs video upload to TikTok using the TikTok Content Posting API v2.
 * Flow:
 *   1. Initialize direct post (`/v2/post/publish/video/init/`)
 *   2. Upload binary bytes to the provided `upload_url`
 *   3. Poll status (`/v2/post/publish/status/fetch/`) until published or timeout
 */
export async function uploadVideoToTikTok(
  channelId: string,
  videoBuffer: Buffer,
  title: string,
  options?: TikTokPublishOptions
): Promise<string> {
  const channel = await prisma.socialChannel.findUnique({ where: { id: channelId } });
  if (!channel) throw new Error(`The channel with ID ${channelId} does not exist in the database.`);

  let token = channel.accessToken;
  const isExpired = channel.tokenExpiry ? new Date(channel.tokenExpiry) <= new Date() : false;

  if (isExpired && channel.refreshToken) {
    log.info("🔄 [TikTok Upload] Access token expired. Refreshing automatically...");
    try {
      token = await refreshTikTokToken(channel.id, channel.refreshToken);
      log.info("✅ [TikTok Upload] Access token successfully refreshed.");
    } catch (err) {
      console.error("❌ [TikTok Upload] Critical error refreshing the token:", err);
      throw err;
    }
  }

  if (!token) throw new Error("No valid access token available for TikTok.");

  // Mock / Sandbox check
  if (token.startsWith("mock_")) {
    log.info("⚠️ [TikTok Upload] Mock channel detected. Simulating TikTok video publish.");
    const mockId = `mock_tiktok_video_${Math.random().toString(36).substring(7)}`;
    return mockId;
  }

  log.info(`🔄 [TikTok Upload] Initializing TikTok post session (${videoBuffer.length} bytes)...`);

  const initPayload = {
    post_info: {
      title: title.substring(0, 150),
      privacy_level: options?.privacyLevel || "PUBLIC_TO_EVERYONE",
      disable_duet: options?.disableDuet ?? false,
      disable_stitch: options?.disableStitch ?? false,
      disable_comment: options?.disableComment ?? false,
      video_cover_timestamp_ms: options?.videoCoverTimestampMs || 1000,
      is_aigc: options?.isAigc ?? true,
      aigc_disclosure_type: 1, // 1: Self-disclosed AI-generated content
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoBuffer.length,
      chunk_size: videoBuffer.length,
      total_chunk_count: 1,
    },
  };

  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(initPayload),
  });

  if (!initRes.ok) {
    const errorText = await initRes.text();
    throw new Error(`Failed to initialize TikTok upload session: ${errorText}`);
  }

  const initData = await initRes.json();
  if (initData.error && initData.error.code !== "ok") {
    throw new Error(`TikTok post init returned error: ${initData.error.message || JSON.stringify(initData.error)}`);
  }

  const publishId = initData.data?.publish_id;
  const uploadUrl = initData.data?.upload_url;

  if (!uploadUrl) {
    throw new Error("Could not retrieve binary upload URL from TikTok init response.");
  }

  log.info(`✅ [TikTok Upload] Upload URL acquired. Streaming ${videoBuffer.length} bytes to TikTok...`);

  // Step 2: Upload the binary video bytes to upload_url
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
      "Content-Length": videoBuffer.length.toString(),
      "Content-Type": "video/mp4",
    },
    body: videoBuffer as unknown as BodyInit,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to transmit binary video bytes to TikTok: ${errText}`);
  }

  log.info(`✅ [TikTok Upload] Binary bytes uploaded. Verifying publish status for ${publishId}...`);

  // Step 3: Poll status verification (up to 5 attempts with backoff)
  let platformVideoId = publishId;
  for (let attempt = 1; attempt <= 5; attempt++) {
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    try {
      const statusRes = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const postStatus = statusData.data?.status;
        const postIds = statusData.data?.publicaly_available_post_id;

        if (postStatus === "PUBLISH_COMPLETE") {
          if (Array.isArray(postIds) && postIds.length > 0) {
            platformVideoId = postIds[0];
          }
          log.info(`🎉 [TikTok Upload] Video published successfully! TikTok ID: ${platformVideoId}`);
          break;
        } else if (postStatus === "FAILED") {
          console.warn(`⚠️ [TikTok Upload] TikTok reported publish status: FAILED (${statusData.data?.fail_reason})`);
          break;
        }
      }
    } catch (pollErr) {
      console.warn(`⚠️ [TikTok Upload] Status poll attempt ${attempt} notice:`, pollErr);
    }
  }

  return platformVideoId;
}

/**
 * Queries real or simulated video analytics for a published TikTok video.
 */
export async function fetchTikTokAnalytics(
  channelId: string,
  videoId: string
): Promise<TikTokAnalyticsResult | null> {
  const channel = await prisma.socialChannel.findUnique({ where: { id: channelId } });
  if (!channel) return null;

  let token = channel.accessToken;
  const isExpired = channel.tokenExpiry ? new Date(channel.tokenExpiry) <= new Date() : false;

  if (isExpired && channel.refreshToken) {
    try {
      token = await refreshTikTokToken(channel.id, channel.refreshToken);
    } catch {
      return null;
    }
  }

  if (!token) return null;

  if (token.startsWith("mock_") || videoId.startsWith("mock_")) {
    return {
      viewCount: Math.floor(Math.random() * 2500) + 250,
      likeCount: Math.floor(Math.random() * 300) + 25,
      commentCount: Math.floor(Math.random() * 40) + 5,
      shareCount: Math.floor(Math.random() * 60) + 8,
    };
  }

  try {
    const res = await fetch("https://open.tiktokapis.com/v2/video/query/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: { video_ids: [videoId] },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const videos = data.data?.videos;
    if (Array.isArray(videos) && videos.length > 0) {
      const v = videos[0];
      return {
        viewCount: v.view_count || 0,
        likeCount: v.like_count || 0,
        commentCount: v.comment_count || 0,
        shareCount: v.share_count || 0,
      };
    }
  } catch (err) {
    console.error("Failed to query TikTok analytics:", err);
  }

  return null;
}
