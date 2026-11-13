// src/app/api/presets/preview/route.ts

import { generatePresenterImage } from "@/lib/ai/comfyClient";
import { presetRegistry } from "@/lib/prompt/presetRegistry";
import { compilePresenterPrompt } from "@/lib/prompt/promptCompiler";
import { storage } from "@/lib/storage";
import { getPersonaBroadcastPrompt,getPersonaById,getPersonaNudeBase } from "@/lib/tts/personas";
import fs from "fs";
import { NextRequest,NextResponse } from "next/server";
import path from "path";
import { z } from "zod";

const RequestSchema = z.object({
  slug: z.string().optional(),
  personaId: z.string().optional().default("ruby"),
  prompt: z.string().optional(),
  loras: z.array(z.object({
    name: z.string(),
    strength: z.number()
  })).optional()
});

/**
 * POST /api/presets/preview
 * Generate a preview image on-demand and upload it to MinIO.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload parameters", details: parsed.error.format() }, { status: 400 });
    }

    const { slug, personaId, prompt, loras } = parsed.data;

    const persona = getPersonaById(personaId);
    if (!persona) {
      return NextResponse.json({ error: `Persona with ID "${personaId}" not found` }, { status: 404 });
    }

    let positivePrompt = prompt;

    // If no direct prompt provided, compile it from preset slug
    if (!positivePrompt && slug) {
      const preset = presetRegistry.get(slug);
      if (!preset) {
        return NextResponse.json({ error: `Preset with slug "${slug}" not found` }, { status: 404 });
      }
      const compiled = compilePresenterPrompt({
        personaDescription: getPersonaBroadcastPrompt(persona),
        visualBodyPrompt: getPersonaNudeBase(persona),
        preset,
        loras
      });
      positivePrompt = compiled.positivePrompt;
    }

    if (!positivePrompt) {
      return NextResponse.json({ error: "Either 'prompt' or 'slug' must be provided" }, { status: 400 });
    }

    const defaultAvatarAbsPath = path.join(
      process.cwd(),
      "public",
      (persona.avatarUrl || "/avatars/ruby.png").replace(/^\//, "")
    );

    const generatedBuffer = await generatePresenterImage(positivePrompt, defaultAvatarAbsPath, undefined, loras, 576, 1024);

    const keyPrefix = `presets-preview/${personaId}-${slug || "custom"}-${Date.now()}.png`;
    const imageUrl = await storage.upload(keyPrefix, generatedBuffer, "image/png");

    // Also try saving locally to public/presets/ if slug matches a registered preset (dev only)
    if (slug && process.env.NODE_ENV !== "production") {
      try {
        const localPath = path.join(process.cwd(), `public/presets/${slug}.png`);
        if (!fs.existsSync(path.dirname(localPath))) {
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
        }
        fs.writeFileSync(localPath, generatedBuffer);
      } catch (err: unknown) {
        console.warn(`[API Preset Preview] Warning: Failed to write preview file locally:`, err instanceof Error ? err.message : String(err));
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      storageKey: keyPrefix
    });

  } catch (error: unknown) {
    console.error("[API Preset Preview] Error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to generate preview image" }, { status: 500 });
  }
}
