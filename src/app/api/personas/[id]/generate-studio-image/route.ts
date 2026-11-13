/**
 * app/api/personas/[id]/generate-studio-image/route.ts
 *
 * POST /api/personas/[id]/generate-studio-image
 *
 * Generates a studio-specific attire image for a persona using:
 * - Persona's existing _ref.png as PuLID face reference
 * - compilePresenterPrompt() with a STUDIO_FULL_PRESETS entry mapped to the studio type
 * - generatePresenterImage() from lib/ai/comfy/imageGen.ts (FLUX.2 + PuLID pipeline)
 *
 * Body: { studioType, presetOverride?, attireOverride? }
 * Returns: { imageUrl, storageKey, personaId, studioType }
 */

import { getRandomStudioAttire,STUDIO_FULL_PRESETS } from "@/data/prompt_presets";
import { checkComfyUIHealth,generatePresenterImage } from "@/lib/ai/comfyClient";
import { prisma } from "@/lib/prisma";
import { compilePresenterPrompt } from "@/lib/prompt/promptCompiler";
import { storage,withTenant } from "@/lib/storage";
import type { StudioType } from "@/lib/studio/parsers/types";
import { requireTenant } from "@/lib/tenant";
import fs from "fs";
import { NextRequest,NextResponse } from "next/server";
import path from "path";
import { z } from "zod";

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
  presetOverride: z.string().optional(), // e.g. "evening-talk-show"
  attireOverride: z.string().optional(), // override the clothing description
});

/**
 * Maps studio type to the best matching STUDIO_FULL_PRESETS name.
 * Used to pick the right environment/scene for the persona image.
 */
const STUDIO_PRESET_MAP: Record<StudioType, string> = {
  interview: "Evening Talk Show",
  podcast: "Morning Talk Show",
  vtuber: "Tech Segment Reviewer",
  localization: "Global Summit Correspondent",
  data_studio: "Financial Market Update",
  narrative_matrix: "Press Briefing",
  debate: "Press Briefing",
};

function getPresenterDescription(personaSlug: string): string {
  // Basic description seed — the persona's visual prompt drives the face via _ref.png
  const defaults: Record<string, string> = {
    ruby: "Ruby, a female news anchor with red hair and green eyes, professional appearance",
    blaze: "Blaze, a female presenter with platinum blonde bob and blue eyes, sharp professional style",
    tomas: "Tomas, a male financial analyst with dark hair, formal suit",
    mateo: "Mateo, a male news anchor with dark hair and warm complexion",
    aris: "Aris, a male analyst with a calm, academic appearance",
    storm: "Storm, a dynamic female breaking-news anchor with bold styling",
  };
  return defaults[personaSlug] || `${personaSlug}, a professional news presenter`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  const { id: personaId } = await params;

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body", details: String(err) }, { status: 400 });
  }

  // Fetch persona with tenant isolation
  const persona = await prisma.persona.findFirst({
    where: { id: personaId, companyId: orgId },
    select: {
      id: true,
      slug: true,
      name: true,
      visualPrompt: true,
      visualBodyPrompt: true,
    },
  });

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  // Check ComfyUI health before starting
  const comfyOnline = await checkComfyUIHealth();
  if (!comfyOnline) {
    return NextResponse.json(
      { error: "ComfyUI is offline. Start the ComfyUI server before generating images." },
      { status: 503 }
    );
  }

  // Resolve _ref.png path (used as PuLID face reference — multi-angle composite)
  const refImagePath = path.join(process.cwd(), `public/avatars/${persona.slug}_ref.png`);
  const fallbackRefPath = path.join(process.cwd(), `public/avatars/${persona.slug}.png`);
  const resolvedRefPath = fs.existsSync(refImagePath) ? refImagePath : fallbackRefPath;

  if (!fs.existsSync(resolvedRefPath)) {
    return NextResponse.json(
      { error: `Reference image not found for persona "${persona.slug}". Expected: ${refImagePath}` },
      { status: 422 }
    );
  }

  // Pick the preset
  const presetName = body.presetOverride
    ? (STUDIO_FULL_PRESETS.find(p =>
        p.name.toLowerCase().replace(/\s+/g, "-") === body.presetOverride?.toLowerCase()
      )?.name || STUDIO_PRESET_MAP[body.studioType as StudioType])
    : STUDIO_PRESET_MAP[body.studioType as StudioType];

  const preset = STUDIO_FULL_PRESETS.find(p => p.name === presetName);
  if (!preset) {
    return NextResponse.json({ error: `Preset "${presetName}" not found` }, { status: 422 });
  }

  // Compile the full presenter prompt using the master prompt compiler
  const attire = body.attireOverride || getRandomStudioAttire();
  const personaDescription = persona.visualPrompt || getPresenterDescription(persona.slug);

  const { positivePrompt } = compilePresenterPrompt({
    personaDescription,
    preset,
    attire,
    visualBodyPrompt: persona.visualBodyPrompt || undefined,
    enableDuplicateStripping: true,
    enableQualityBoilerplate: true,
    studioApprovedOnly: true,
    fullAttireOnly: true,
  });

  try {
    // Generate image via ComfyUI (FLUX.2 + PuLID using _ref.png)
    const imageBuffer = await generatePresenterImage(
      positivePrompt,
      resolvedRefPath,
      undefined,   // onProgress
      [],          // loras — default from workflow
      1024,        // width
      576,         // height
      0.85         // denoise
    );

    // Upload to storage with tenant isolation
    const timestamp = Date.now();
    const rawKey = `studio-images/${persona.slug}/${body.studioType}/${timestamp}.png`;
    const storageKey = withTenant(orgId, rawKey);
    const imageUrl = await storage.upload(storageKey, imageBuffer, "image/png");

    return NextResponse.json({
      success: true,
      personaId: persona.id,
      personaSlug: persona.slug,
      studioType: body.studioType,
      presetUsed: presetName,
      attireUsed: attire,
      storageKey,
      imageUrl,
    });
  } catch (err: unknown) {
    console.error(`[generate-studio-image] Failed for persona=${persona.slug}:`, err);
    return NextResponse.json(
      { error: "Image generation failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
