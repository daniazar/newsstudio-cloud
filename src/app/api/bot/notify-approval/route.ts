/**
 * src/app/api/bot/notify-approval/route.ts
 *
 * Admin Notification Endpoint for Multi-Platform Story Approval Broadcasts.
 * Broadcasts rich approval cards to configured Slack, Discord, and Telegram channels.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";
import {
  broadcastStoryApprovalCard,
  getConfiguredBotPlatforms,
  parseApprovalChannels,
} from "@/lib/bot/newsroomBot";

export const GET = withAdminAuth(async () => {
  return NextResponse.json({
    configuredPlatforms: getConfiguredBotPlatforms(),
    approvalChannels: parseApprovalChannels(process.env.NEWSROOM_APPROVAL_CHANNELS),
  });
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  let body: { storyId?: string; channels?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { storyId, channels } = body;
  if (!storyId || typeof storyId !== "string" || !storyId.trim()) {
    return NextResponse.json({ error: "Missing required field: storyId" }, { status: 400 });
  }

  const cleanStoryId = storyId.trim();

  const story = await prisma.story.findUnique({
    where: { id: cleanStoryId },
    include: {
      script: {
        include: {
          _count: {
            select: { segments: true },
          },
        },
      },
    },
  });

  if (!story) {
    return NextResponse.json(
      { error: `Story '${cleanStoryId}' not found` },
      { status: 404 }
    );
  }

  const result = await broadcastStoryApprovalCard(
    {
      id: story.id,
      title: story.title,
      headline: story.script?.headline || story.title,
      status: story.status,
      category: story.category,
      segmentCount:
        (story as unknown as { _count?: { segments?: number } })._count?.segments ??
        story.script?._count?.segments ??
        0,
      companyId: story.companyId,
    },
    channels
  );

  return NextResponse.json({ success: true, ...result });
});
