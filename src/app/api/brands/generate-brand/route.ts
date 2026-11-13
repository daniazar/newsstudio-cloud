import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { z } from "zod";

export const BrandProfileSchema = z.object({
  name: z.string().catch("News Channel"),
  handle: z.string().catch("newschannel"),
  description: z.string().catch("Breaking news and insightful analysis."),
  avatarPrompt: z.string().catch("Photorealistic 3D news network logo with obsidian and metallic gold accents"),
  tags: z.array(z.string()).catch(["news", "breaking", "world", "markets", "tech"]),
});

export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  try {
    const { prompt, platform } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const systemInstruction = `You are an expert social media brand manager and channel creator.
Your goal is to generate a comprehensive, highly engaging channel profile based on the user's concept.
You MUST output raw, valid JSON matching this schema:
{
  "name": "Channel Name",
  "handle": "unique_handle",
  "description": "2-3 sentences explaining the channel's value proposition",
  "avatarPrompt": "A detailed Midjourney/DALL-E prompt for the channel's profile picture logo",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Keep the handle compatible with the target platform (no spaces, appropriate length).`;

    const { object } = await generateLlmObject({
      schema: BrandProfileSchema,
      schemaName: "BrandProfile",
      system: systemInstruction,
      prompt: `Create a branding profile for a ${platform || "YouTube"} channel based on this concept:\n"${prompt}"`,
      companyId: t.tenant.orgId,
      tier: "structured",
      temperature: 0.7,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("POST /api/brands/generate-brand failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

