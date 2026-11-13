import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { z } from "zod";

const BrandAestheticsSchema = z.object({
  toneOfVoice: z.string().catch("Professional, authoritative, and engaging news broadcast tone"),
  primaryColor: z.string().catch("#10b981"),
  secondaryColor: z.string().catch("#3b82f6"),
  captionStyle: z.string().catch("breaking"),
  preferredMusicMood: z.string().catch("tech"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;
    const brand = await prisma.brand.findFirst({ where: { id, companyId: orgId } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const { object } = await generateLlmObject({
      schema: BrandAestheticsSchema,
      schemaName: "BrandAesthetics",
      companyId: orgId,
      tier: "structured",
      system: `You are an expert brand identity designer. 
Generate a comprehensive brand aesthetic for a news brand named "${brand.name}".
The brand's handle is "${brand.handle}".

Return a JSON object with EXACTLY these keys:
{
  "toneOfVoice": "A description of the brand's tone of voice (e.g. Sarcastic, professional, Gen-Z, upbeat tech bro, etc.)",
  "primaryColor": "A hex color code (e.g. #10b981) that best represents the brand's primary color.",
  "secondaryColor": "A hex color code (e.g. #3b82f6) that complements the primary color.",
  "captionStyle": "One of the following string values: 'beast', 'minimal', 'breaking', 'karaoke', or 'tiktok'.",
  "preferredMusicMood": "A single word or short phrase describing the background music vibe (e.g. dramatic, lofi, tech, upbeat, intense)."
}`,
      prompt: `Generate the aesthetic JSON for ${brand.name}.`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Error generating brand aesthetics:", error);
    return NextResponse.json({ error: "Failed to generate aesthetics" }, { status: 500 });
  }
}

