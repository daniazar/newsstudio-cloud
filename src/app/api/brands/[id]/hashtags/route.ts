import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { generateLlmText } from "@/lib/llm/aiSdkGateway";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;
    const brand = await prisma.brand.findFirst({
      where: { id, companyId: orgId },
      include: {
        rssGroups: { include: { feeds: true } },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const feedNames = brand.rssGroups.flatMap((g) => g.feeds.map((f) => f.name)).join(", ");

    const prompt = `You are a social media expert. Generate a list of 10-15 highly relevant, trending hashtags for a news brand.
Brand Name: ${brand.name}
Brand Description/Handle: ${brand.handle || "News Channel"}
Topics covered (from their feeds): ${feedNames || "General news, tech, current events"}

Requirements:
- Return ONLY a single string of hashtags separated by spaces (e.g. #news #tech #breaking).
- Include a mix of broad/popular hashtags and niche/specific ones based on the topics.
- Do NOT include any intro, outro, or explanations. Just the hashtags string.`;

    const { text } = await generateLlmText({
      prompt,
      companyId: orgId,
      tier: "structured",
      temperature: 0.7,
    });

    if (!text) {
      throw new Error("Empty response from LLM");
    }

    let hashtags = text.trim();

    // Extract all hashtag words if already formatted with '#'
    const matchedHashtags = hashtags.match(/#[a-zA-Z0-9_]+/g);
    if (matchedHashtags && matchedHashtags.length > 0) {
      hashtags = matchedHashtags.join(" ");
    } else {
      // Normalize words separated by commas, spaces, or newlines
      hashtags = hashtags
        .split(/[\s,]+/)
        .map((w: string) => w.trim().replace(/^#+/, ""))
        .filter((w: string) => w.length > 0 && !/^\d+\.?$/.test(w))
        .map((w: string) => `#${w}`)
        .join(" ");
    }

    return NextResponse.json({ hashtags });
  } catch (error) {
    console.error("Generate hashtags error:", error);
    return NextResponse.json({ error: "Failed to generate hashtags" }, { status: 500 });
  }
}

