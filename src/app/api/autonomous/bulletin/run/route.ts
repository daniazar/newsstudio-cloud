import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import {
  clusterRecentStories,
  synthesizeHourlyBulletin,
} from "@/lib/autonomous/bulletinBotEngine";

const BodySchema = z.object({
  preferredPersonaId: z.string().optional().default("ruby"),
  autoDispatchJob: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch {
    body = { preferredPersonaId: "ruby", autoDispatchJob: true };
  }

  try {
    // 1. Cluster recent news stories
    const clusters = await clusterRecentStories(orgId);

    // 2. Synthesize 60-second broadcast bulletin
    const bulletin = await synthesizeHourlyBulletin(clusters, {
      preferredPersonaId: body.preferredPersonaId,
    });

    // 3. Find or create default RSS feed for autonomous wire
    let feed = await prisma.rssFeed.findFirst({
      where: { companyId: orgId },
    });

    if (!feed) {
      feed = await prisma.rssFeed.create({
        data: {
          companyId: orgId,
          name: "Autonomous Breaking Wire",
          url: "https://news.ycombinator.com/rss",
          
        },
      });
    }

    // 4. Save Story in database
    const uniqueGuid = `auto_bulletin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const story = await prisma.story.create({
      data: {
        companyId: orgId,
        feedId: feed.id,
        title: bulletin.bulletinTitle,
        link: `https://newsstudio.ai/bulletin/${uniqueGuid}`,
        guid: uniqueGuid,
        description: bulletin.socialMetadata.description,
        fullContent: bulletin.scenes.map((s) => s.text).join("\n\n"),
        status: "SCRIPTED",
        approvalStatus: "approved",
        keywords: JSON.stringify(bulletin.socialMetadata.hashtags),
      },
    });

    // 5. Save Script & 3 Segments
    const script = await prisma.script.create({
      data: {
        storyId: story.id,
        headline: bulletin.bulletinTitle,
        rawJson: JSON.stringify(bulletin),
        segments: {
          create: bulletin.scenes.map((s, idx) => ({
            index: idx,
            startTime: idx * 20,
            endTime: (idx + 1) * 20,
            text: s.text,
            imagePrompt: s.bRollKeyword,
            personaId: s.personaId || body.preferredPersonaId,
            mediaSettings: s.dataGraphic ? JSON.stringify({ dataGraphic: s.dataGraphic, sceneStrategy: s.sceneStrategy }) : JSON.stringify({ sceneStrategy: s.sceneStrategy }),
          })),
        },
      },
    });

    // 6. Optionally create GenerationJob
    let generationJob = null;
    if (body.autoDispatchJob) {
      generationJob = await prisma.generationJob.create({
        data: {
          companyId: orgId,
          storyId: story.id,
          type: "audio",
          status: "QUEUED",
          totalSteps: bulletin.scenes.length,
          config: JSON.stringify({
            personaId: body.preferredPersonaId || "ruby",
            voiceId: body.preferredPersonaId || "ruby",
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      storyId: story.id,
      scriptId: script.id,
      jobId: generationJob?.id || null,
      bulletin,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[autonomous/bulletin/run] Execution failed:", msg);
    return NextResponse.json({ error: "Failed to run autonomous bulletin", details: msg }, { status: 500 });
  }
}
