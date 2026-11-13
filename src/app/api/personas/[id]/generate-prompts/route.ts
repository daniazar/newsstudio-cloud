import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { z } from "zod";

const PersonaTraitsSchema = z.object({
  age: z.number().catch(34),
  heightCm: z.number().catch(175),
  heightFeet: z.string().catch("5'9\""),
  weightKg: z.number().catch(58),
  weightLbs: z.number().catch(128),
  hair: z.string().catch("Professional styled hair"),
  face: z.string().catch("Confident broadcast-ready expression"),
  build: z.string().catch("Athletic broadcaster posture"),
  defaultAttire: z.string().catch("Tailored business suit"),
  defaultBackground: z.string().catch("Modern virtual newsroom"),
  defaultLighting: z.string().catch("Soft volumetric studio lighting"),
});

const PersonaGeneratedPromptsSchema = z.object({
  systemPrompt: z.string().catch("You are an authoritative and engaging news presenter delivering clear, accurate coverage."),
  traits: PersonaTraitsSchema,
});

const SYSTEM_INSTRUCTION = `You are an expert AI persona architect for an autonomous AI news channel.
Your task is to take the basic attributes of a News Presenter and generate structured attributes:

1. \`systemPrompt\`: The LLM Personality Directives given to a language model when writing scripts.
2. \`traits\`: The structured visual character traits object:
   - \`age\`: number
   - \`heightCm\`: number
   - \`heightFeet\`: string
   - \`weightKg\`: number
   - \`weightLbs\`: number
   - \`hair\`: string
   - \`face\`: string
   - \`build\`: string
   - \`defaultAttire\`: string
   - \`defaultBackground\`: string
   - \`defaultLighting\`: string

Respond ONLY in valid JSON matching this schema:
{
  "systemPrompt": "string",
  "traits": {
    "age": 34,
    "heightCm": 175,
    "heightFeet": "5'9\\"",
    "weightKg": 58,
    "weightLbs": 128,
    "hair": "string",
    "face": "string",
    "build": "string",
    "defaultAttire": "string",
    "defaultBackground": "string",
    "defaultLighting": "string"
  }
}`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, role, description, bio } = body;

    if (!name || !role) {
      return NextResponse.json({ error: "Name and Role are required." }, { status: 400 });
    }

    // Ensure the persona is visible to this tenant (own or system).
    const persona = await prisma.persona.findFirst({
      where: {
        AND: [
          { OR: [{ id }, { slug: id }] },
          { OR: [{ companyId: orgId }, { isSystemPersona: true }] },
        ],
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    const userPrompt = `Generate prompts for the following persona:
Name: ${name}
Role: ${role}
Description: ${description || "N/A"}
Bio: ${bio || "N/A"}`;

    const { object } = await generateLlmObject({
      schema: PersonaGeneratedPromptsSchema,
      schemaName: "PersonaGeneratedPrompts",
      system: SYSTEM_INSTRUCTION,
      prompt: userPrompt,
      companyId: orgId,
      tier: "structured",
      temperature: 0.7,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("[generate-prompts] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate prompts: " + String(error) },
      { status: 500 }
    );
  }
}

