import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("social:youtube");

/**
 * Refreshes the YouTube access token using the refresh token
 */
async function refreshYoutubeToken(channelId: string, refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh YouTube token: ${errText}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const expiresIn = data.expires_in || 3600;
  const newTokenExpiry = new Date(Date.now() + expiresIn * 1000);

  await prisma.socialChannel.update({
    where: { id: channelId },
    data: {
      accessToken: newAccessToken,
      tokenExpiry: newTokenExpiry,
    },
  });

  return newAccessToken;
}

/**
 * Performs the upload of a real video to YouTube asynchronously using
 * Google API's official Resumable Upload gateway.
 */
export async function uploadVideoToYoutube(
  channelId: string,
  videoBuffer: Buffer,
  title: string,
  description: string
): Promise<string> {
  const channel = await prisma.socialChannel.findUnique({ where: { id: channelId } });
  if (!channel) throw new Error(`The channel with ID ${channelId} does not exist in the database.`);

  let token = channel.accessToken;
  const isExpired = channel.tokenExpiry ? new Date(channel.tokenExpiry) <= new Date() : true;

  if (isExpired && channel.refreshToken) {
    log.info("🔄 [YouTube Upload] Access token expired. Refreshing automatically...");
    try {
      token = await refreshYoutubeToken(channel.id, channel.refreshToken);
      log.info("✅ [YouTube Upload] Access token successfully refreshed.");
    } catch (err) {
      log.error({ err }, "❌ [YouTube Upload] Critical error refreshing the token");
      throw err;
    }
  }

  if (!token) throw new Error("No valid access token available for YouTube.");

  // Check if token is test/mock or real
  if (token.startsWith("mock_")) {
    log.info("⚠️ [YouTube Upload] Mock channel detected. Skipping real YouTube upload.");
    return `mock_youtube_video_${Math.random().toString(36).substring(7)}`;
  }

  log.info(`🔄 [YouTube Upload] Starting resumable upload on YouTube (${videoBuffer.length} bytes)...`);

  // Step 1: Initialize the resumable upload session with Google
  const metadata = {
    snippet: {
      title: title.substring(0, 100),
      description: description,
      categoryId: "22", // People & Blogs
      tags: ["newsstudio", "ai", "broadcast", "synthetic", "ai-generated"],
    },
    status: {
      privacyStatus: "private", // Upload as private by default for security
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,
    },
  };

  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": videoBuffer.length.toString(),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new Error(`Failed to initialize upload session with Google: ${errorText}`);
  }

  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Could not retrieve upload session URL from Google API headers.");
  }

  log.info("✅ [YouTube Upload] Upload session URL successfully retrieved.");

  // Step 2: Upload the binary video bytes
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Length": videoBuffer.length.toString(),
      "Content-Type": "video/mp4",
    },
    body: videoBuffer as unknown as BodyInit,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to transmit the binary video file to Google: ${errorText}`);
  }

  const result = await uploadResponse.json();
  const youtubeVideoId = result.id;
  
  log.info(`🎉 [YouTube Upload] Video successfully uploaded! YouTube Video ID: ${youtubeVideoId}`);
  return youtubeVideoId;
}

/**
 * Sets (overrides) the thumbnail of an already-uploaded YouTube video.
 * Best-effort: returns false for mock channels/videos, throws on a real API error.
 * Requires the channel's OAuth grant to include the youtube.upload scope and a
 * verified channel (YouTube rejects custom thumbnails otherwise).
 */
export async function setYoutubeThumbnail(
  channelId: string,
  youtubeVideoId: string,
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<boolean> {
  const channel = await prisma.socialChannel.findUnique({ where: { id: channelId } });
  if (!channel) throw new Error(`The channel with ID ${channelId} does not exist in the database.`);

  let token = channel.accessToken;
  const isExpired = channel.tokenExpiry ? new Date(channel.tokenExpiry) <= new Date() : true;

  if (isExpired && channel.refreshToken) {
    token = await refreshYoutubeToken(channel.id, channel.refreshToken);
  }

  if (!token) throw new Error("No valid access token available for YouTube.");

  if (token.startsWith("mock_") || youtubeVideoId.startsWith("mock_")) {
    log.info("⚠️ [YouTube Thumbnail] Mock channel/video detected. Skipping thumbnail upload.");
    return false;
  }

  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(youtubeVideoId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType,
        "Content-Length": imageBuffer.length.toString(),
      },
      body: imageBuffer as unknown as BodyInit,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to set YouTube thumbnail: ${errText}`);
  }

  log.info(`🖼️ [YouTube Thumbnail] Thumbnail set for video ${youtubeVideoId}.`);
  return true;
}

/**
 * Fetches view and like counts for a published video.
 */
export async function fetchYoutubeAnalytics(channelId: string, youtubeVideoId: string): Promise<{ viewCount: number, likeCount: number } | null> {
  const channel = await prisma.socialChannel.findUnique({ where: { id: channelId } });
  if (!channel) return null;

  let token = channel.accessToken;
  const isExpired = channel.tokenExpiry ? new Date(channel.tokenExpiry) <= new Date() : true;

  if (isExpired && channel.refreshToken) {
    try {
      token = await refreshYoutubeToken(channel.id, channel.refreshToken);
    } catch (err) {
      log.error({ err }, "Failed to refresh token for analytics");
      return null;
    }
  }

  if (!token) return null;
  if (token.startsWith("mock_")) {
    // Return mock data for mock channels
    return {
      viewCount: Math.floor(Math.random() * 1000) + 100,
      likeCount: Math.floor(Math.random() * 100) + 10,
    };
  }

  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${youtubeVideoId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.items && data.items.length > 0) {
    const stats = data.items[0].statistics;
    return {
      viewCount: parseInt(stats.viewCount || "0", 10),
      likeCount: parseInt(stats.likeCount || "0", 10),
    };
  }

  return null;
}

