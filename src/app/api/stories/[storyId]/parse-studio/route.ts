/**
 * app/api/stories/[id]/parse-studio/route.ts
 *
 * POST /api/stories/[id]/parse-studio
 *
 * Parses a story's fullContent into a studio-specific script payload
 * using the appropriate Gemini system prompt for each studio type.
 *
 * Body: { studioType, personaSlugs?, personaSlug? }
 * Returns: { studioType, payload: StudioPayload }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { parseArticleForStudio, streamArticleForStudio } from "@/lib/studio/parsers";
import type { StudioType } from "@/lib/studio/parsers/types";

const BodySchema = z.object({
  studioType: z.enum([
    "interview",
    "podcast",
    "vtuber",
    "localization",
    "data_studio",
    "narrative_matrix",
    "debate",
  ]),
  personaSlugs: z.array(z.string()).optional(),
  personaSlug: z.string().optional(),
  participantCount: z.union([z.literal(2), z.literal(3)]).optional(),
  layoutKey: z.string().optional(),
  provider: z.enum(["gemini", "ollama"]).optional(),
  model: z.string().optional(),
  allowFallback: z.boolean().optional(),
  stream: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { storyId } = await params;

  // Validate body
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body", details: String(err) }, { status: 400 });
  }

  // Fetch story with full content — enforce tenant isolation
  const story = await prisma.story.findFirst({
    where: { id: storyId, companyId: orgId },
    select: {
      id: true,
      title: true,
      fullContent: true,
      description: true,
    },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const articleContent = story.fullContent || story.description || story.title;

  if (!articleContent || articleContent.trim().length < 50) {
    return NextResponse.json(
      { error: "Story has insufficient content to parse. Ensure fullContent is scraped." },
      { status: 422 }
    );
  }

  const parseOptions = {
    personaSlugs: body.personaSlugs,
    personaSlug: body.personaSlug,
    participantCount: body.participantCount,
    layoutKey: body.layoutKey,
    provider: body.provider,
    model: body.model,
    companyId: orgId,
    storyId,
    allowFallback: body.allowFallback,
  };

  if (body.stream === true) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const generator = streamArticleForStudio(
            body.studioType as StudioType,
            articleContent,
            parseOptions
          );

          for await (const event of generator) {
            const line =
              JSON.stringify({
                ...event,
                storyId,
                storyTitle: story.title,
              }) + "\n";
            try {
              controller.enqueue(encoder.encode(line));
            } catch {
              // Client disconnected or stream closed
              return;
            }
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
        } catch (streamErr: unknown) {
          const message =
            streamErr instanceof Error ? streamErr.message : String(streamErr);
          const errorLine =
            JSON.stringify({
              type: "error",
              error: message,
              storyId,
              storyTitle: story.title,
            }) + "\n";
          try {
            controller.enqueue(encoder.encode(errorLine));
            controller.close();
          } catch {
            // Controller already closed or errored
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  try {
    const payload = await parseArticleForStudio(
      body.studioType as StudioType,
      articleContent,
      parseOptions
    );

    return NextResponse.json({
      studioType: body.studioType,
      storyId,
      storyTitle: story.title,
      payload,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[parse-studio] Failed for storyId=${storyId} studioType=${body.studioType}:`, err);
    return NextResponse.json(
      { error: "Failed to parse article for studio", details: message },
      { status: 500 }
    );
  }
}
