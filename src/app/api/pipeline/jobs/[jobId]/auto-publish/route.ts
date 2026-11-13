import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchPublishVideo } from "@/lib/orchestration/dispatch";
import { requireWorkerKey } from "@/lib/workerAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authErr = requireWorkerKey(req);
  if (authErr) return authErr;

  const { jobId } = await params;

  try {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const video = await prisma.video.findFirst({
      where: { storyId: job.storyId },
      include: {
        story: true,
      },
    });

    if (!video || !video.story) {
      return NextResponse.json({ error: "Video or story not found" }, { status: 404 });
    }

    const feedWithGroups = video.story.feedId
      ? await prisma.rssFeed.findUnique({
          where: { id: video.story.feedId },
          include: { groups: true },
        })
      : null;

    const groupIdsForPublish = feedWithGroups?.groups.map((g) => g.id) || [];
    let publishedCount = 0;

    if (groupIdsForPublish.length > 0) {
      const brandsToPublish = await prisma.brand.findMany({
        where: {
          rssGroups: { some: { id: { in: groupIdsForPublish } } },
          autoPublish: true,
        },
        include: { channels: true },
      });

      const publishTasks: Array<{ channelId: string; title: string; description: string }> = [];
      for (const b of brandsToPublish) {
        for (const channel of b.channels) {
          if (!channel.accessToken) continue;

          const title = video.youtubeTitle || video.story.title;
          let description = video.youtubeDescription || video.story.description || "";

          if (b.hashtagBank) {
            description += `\n\n${b.hashtagBank}`;
          }

          publishTasks.push({ channelId: channel.id, title, description });
        }
      }

      const results = await Promise.all(
        publishTasks.map(async (task) => {
          const publish = await prisma.videoPublish.create({
            data: {
              videoId: video.id,
              channelId: task.channelId,
              status: "SCHEDULED",
              title: task.title,
              description: task.description,
            },
          });

          await dispatchPublishVideo({ publishId: publish.id });

          return publish;
        })
      );

      publishedCount = results.length;
    }

    return NextResponse.json({
      success: true,
      publishedCount,
    });
  } catch (error) {
    console.error("Error triggering auto-publish:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
