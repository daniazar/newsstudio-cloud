import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { generateScript } from "@/lib/llm/client";
import { scrapeArticle } from "@/lib/scraper/articleScraper";
import { StoryStatus } from "@/lib/types";
import { SCRIPT_GENERATION_RULES } from "@/lib/llm/prompts";
import { z } from "zod";

/**
 * POST /api/stories/batch-roundup
 * Merges multiple stories into a single cohesive "Roundup" story using the LLM.
 */
const BatchRoundupSchema = z.object({
  storyIds: z.array(z.string()).min(1, "At least one story is required for a roundup")
});

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const rawBody = await request.json();
    const parsedData = BatchRoundupSchema.safeParse(rawBody);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Invalid payload input", details: parsedData.error.format() },
        { status: 400 }
      );
    }

    const { storyIds } = parsedData.data;

    // 1. Fetch all stories (scoped to the tenant) and verify every id belongs to the org.
    const stories = await prisma.story.findMany({
      where: { id: { in: storyIds }, companyId: orgId },
      include: { feed: true }
    });

    if (stories.length === 0) {
      return NextResponse.json({ error: "Stories not found" }, { status: 404 });
    }

    if (stories.length !== storyIds.length) {
      return NextResponse.json(
        { error: "One or more stories do not belong to this organization." },
        { status: 403 }
      );
    }

    // 2. Ensure we have the content for all stories
    const combinedContentParts = [];
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      let content = story.fullContent;
      
      if (!content && story.link.startsWith("http")) {
        const scrapeResult = await scrapeArticle(story.link);
        if (scrapeResult.article?.content) {
          content = scrapeResult.article.content;
          await prisma.story.update({
            where: { id: story.id },
            data: { fullContent: content }
          });
        }
      }

      if (!content) content = story.description || story.title;
      
      combinedContentParts.push(
        `--- STORY ${i + 1} ---\nTitle: ${story.title}\nSource: ${story.feed.name}\nContent: ${content}\n`
      );
    }

    const combinedContent = combinedContentParts.join("\n");
    const roundupTitle = `Tech Roundup: ${stories.length} Key Stories`;
    const roundupDescription = stories.map(s => s.title).join(" • ");
    const roundupId = `roundup-${Date.now()}`;

    // 3. Create the "Roundup" story container early
    const roundupStory = await prisma.story.create({
      data: {
        companyId: orgId,
        title: roundupTitle,
        description: roundupDescription,
        fullContent: combinedContent,
        link: `roundup://${roundupId}`,
        guid: roundupId,
        status: "SCRIPTING",
        feedId: stories[0].feedId, // inherit the first feed's ID for tracking
        pubDate: new Date(),
      }
    });

    // 4. Generate a cohesive script using the LLM
    // Fetch active personas to construct dynamic recommendation directives
    const activePersonas = await prisma.persona.findMany({
      where: { isActive: true, OR: [{ companyId: orgId }, { isSystemPersona: true }] },
    });
    const personasList = activePersonas
      .map(p => `PERSONA ID: "${p.slug}"\nName: ${p.name}\nRole: ${p.role}\nPersonality Instructions: ${p.systemPrompt || p.description}\n---`)
      .join("\n");

    const baseSystemPrompt = `You are a master news scriptwriter. Your job is to write an engaging script utilizing a specific portfolio of presenting personas.`;

    const systemInstruction = `${baseSystemPrompt}\n\n${SCRIPT_GENERATION_RULES}

CRITICAL INSTRUCTION FOR ROUNDUP MODE:
You are generating a "Roundup" script that summarizes MULTIPLE news stories in a single cohesive video. 
- Do NOT just read the articles one by one. Synthesize them.
- Use transition phrases between different topics (e.g., "In other news...", "Moving on to...").
- Keep it engaging, fast-paced, and cohesive.
- Each segment must have a visual 'image_prompt' that represents the specific topic being discussed.

CRITICAL PERSONA ASSIGNMENT ROLE:
Evaluate which of the following active personas is the absolute best match to host/deliver each individual segment. For each segment, you MUST provide the field 'suggested_persona_id' containing their slug exactly as listed.
CRITICALLY IMPORTANT: When writing the 'text' for that segment, you MUST adopt that persona's exact personality, tone, and delivery style as defined in their Personality Instructions.

AVAILABLE PORTFOLIO OF ACTIVE PERSONAS:
${personasList}

Match the tone and topic of each segment to the persona's role and style. If no specific persona matches, fallback to "ruby".`;

    const scriptOutput = await generateScript({
      title: roundupTitle,
      content: combinedContent,
      source: "Multiple Sources",
    }, {
      systemInstruction,
    });

    // 5. Store the generated script in DB
    await prisma.script.create({
      data: {
        storyId: roundupStory.id,
        rawJson: JSON.stringify(scriptOutput),
        headline: scriptOutput.headline,
        segments: {
          create: scriptOutput.segments.map((seg) => ({
            index: seg.index,
            startTime: seg.start_time,
            endTime: seg.end_time,
            text: seg.text,
            imagePrompt: seg.image_prompt,
            assetType: "placeholder",
            suggestedPersonaId: seg.suggested_persona_id || "ruby",
            personaId: seg.suggested_persona_id || "ruby",
            keyword: seg.keyword ?? null,
          })),
        },
      },
      include: { segments: { orderBy: { index: "asc" } } }
    });

    // 6. Update story status and create video
    await prisma.story.update({
      where: { id: roundupStory.id },
      data: { status: "SCRIPTED" as StoryStatus }
    });

    await prisma.video.create({
      data: {
        companyId: orgId,
        storyId: roundupStory.id,
        status: "AWAITING_VOICE",
        aspectRatio: "vertical",
        sloganId: "future-now", 
        captionStyle: "beast",
        youtubeTitle: scriptOutput.youtube_title || roundupTitle,
        youtubeDescription: scriptOutput.youtube_description || roundupDescription,
        youtubeTags: scriptOutput.youtube_tags ? JSON.stringify(scriptOutput.youtube_tags) : null,
        instagramCaption: scriptOutput.instagram_caption,
        instagramHashtags: scriptOutput.instagram_hashtags ? JSON.stringify(scriptOutput.instagram_hashtags) : null,
      }
    });

    // Optional: We can mark the original stories as "MERGED" to avoid processing them individually
    // This is optional, but good for tracking
    await prisma.story.updateMany({
      where: { id: { in: storyIds }, companyId: orgId },
      data: { status: "DRAFT" } // Or a custom status, let's keep them as draft for now so they don't get auto-scripted again
    });

    return NextResponse.json({ 
      success: true, 
      storyId: roundupStory.id 
    });
  } catch (error) {
    console.error("[API] Roundup generation failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
