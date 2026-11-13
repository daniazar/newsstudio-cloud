import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { clonePersonaFromImage } from "@/lib/personas/personaCloner";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { z } from "zod";

export const PersonaFullTraitsSchema = z.object({
  age: z.number().catch(34),
  heightCm: z.number().catch(175),
  heightFeet: z.string().catch("5'9\""),
  weightKg: z.number().catch(58),
  weightLbs: z.number().catch(128),
  skinTone: z.string().catch("Neutral fair"),
  hair: z.string().catch("Sleek styled hair"),
  face: z.string().catch("Engaging broadcast features"),
  build: z.string().catch("Athletic news presenter build"),
  defaultAttire: z.string().catch("Modern dark blazer"),
  defaultBackground: z.string().catch("Modern broadcast studio"),
  defaultLighting: z.string().catch("Three-point key lighting"),
});

export const PersonaFullProfileSchema = z.object({
  slug: z.string().catch("news_anchor"),
  name: z.string().catch("Broadcast Presenter"),
  role: z.string().catch("News Anchor"),
  gender: z.string().catch("female"),
  language: z.string().catch("en"),
  description: z.string().catch("Professional broadcast news presenter."),
  bio: z.string().catch("Experienced news anchor delivering objective journalism."),
  systemPrompt: z.string().catch("You are an authoritative and engaging news presenter delivering clear, accurate coverage."),
  traits: PersonaFullTraitsSchema,
});

export type PersonaFullProfile = z.infer<typeof PersonaFullProfileSchema>;

const SYSTEM_INSTRUCTION = `You are an expert AI persona architect and visual character designer.
Analyze the user's concept and design a professional AI News Presenter persona profile.
CRITICAL: Include detailed physical body proportions (bust/chest size, waist, hips, build), facial features, and style guidelines.

Respond ONLY in valid JSON matching this schema:
{
  "slug": "string (lowercase, no spaces, e.g. 'elena_vance_tech')",
  "name": "string (fitting first and last name)",
  "role": "string (e.g. 'Senior Financial Analyst', 'Tech Journalist', 'Lead World News Anchor')",
  "gender": "string ('male' or 'female')",
  "language": "string ('en', 'es', 'pt', 'de', 'fr', 'it', 'ja')",
  "description": "string (1-2 short sentences summarizing their expertise and broadcast tone)",
  "bio": "string (A rich background paragraph detailing their career, journalism style, and domain authority)",
  "systemPrompt": "string (LLM Personality Directive in the second person, e.g. 'You are [Name], a sharp and authoritative financial presenter...')",
  "traits": {
    "age": 34,
    "heightCm": 175,
    "heightFeet": "5'9\\"",
    "weightKg": 58,
    "weightLbs": 128,
    "skinTone": "string",
    "hair": "string",
    "face": "string",
    "build": "string (Precise body proportions, e.g. 'Voluptuous 34D bust, 25-inch waist, 37-inch hips')",
    "defaultAttire": "string",
    "defaultBackground": "string",
    "defaultLighting": "string"
  }
}`;

export async function POST(req: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  try {
    const body = await req.json();
    const { prompt, imageBase64, mimeType } = body;

    if (!prompt && !imageBase64) {
      return NextResponse.json({ error: "Either a text prompt or an image is required." }, { status: 400 });
    }

    if (imageBase64) {
      const cloned = await clonePersonaFromImage({
        imageBase64,
        mimeType,
        guidance: prompt,
        companyId: t.tenant.orgId,
        syncToDatabase: false,
      });

      return NextResponse.json({
        ...cloned.persona,
        slug: cloned.persona.id,
        role: cloned.persona.title,
        visualPrompt: `${cloned.persona.traits.build}. Hair: ${cloned.persona.traits.hair}. Face: ${cloned.persona.traits.face}. Attire: ${cloned.persona.traits.defaultAttire}.`,
        visualPromptNeutral: `A hyper-photorealistic close-up portrait of ${cloned.persona.traits.age}-year-old ${cloned.persona.name}. Solid medium-grey studio backdrop.`,
        signatureAttire: cloned.signatureAttire,
        avatarUrl: cloned.avatarUrl,
      });
    }

    const userPrompt = `Create a persona based on this idea: "${prompt}"`;

    const { object } = await generateLlmObject({
      schema: PersonaFullProfileSchema,
      schemaName: "PersonaFullProfile",
      system: SYSTEM_INSTRUCTION,
      prompt: userPrompt,
      companyId: t.tenant.orgId,
      tier: "structured",
      temperature: 0.7,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("[generate-full] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate persona: " + String(error) },
      { status: 500 }
    );
  }
}

