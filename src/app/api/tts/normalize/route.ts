/**
 * src/app/api/tts/normalize/route.ts
 *
 * Universal API Route for Two-Tier Text Normalization.
 * Takes visual display text / subtitles and produces phonetically optimized
 * spoken text for neural speech engines (OmniVoice, Piper ONNX, Kokoro, F5-TTS).
 */

import { NextRequest, NextResponse } from "next/server";
import { normalizeTextForAudio } from "@/lib/llm/client";
import { getDefaultEngineForMode, StudioPipelineMode } from "@/lib/tts/modelPromptDirectives";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    let orgId: string | null = null;
    try {
      const t = await requireTenant();
      if (t.ok) orgId = t.tenant.orgId;
    } catch {
      // Local development or unauthenticated session
    }

    const body = await req.json();
    const {
      text,
      engine,
      language = "es",
      mode = "news",
    } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'text' parameter to normalize" },
        { status: 400 }
      );
    }

    // Determine target audio engine according to pipeline mode & language defaults:
    // Realtime: en -> kokoro, es -> piper. News/Ecommerce: omni.
    const resolvedEngine = engine || getDefaultEngineForMode(mode as StudioPipelineMode, language);

    const spokenText = await normalizeTextForAudio(text, {
      engine: resolvedEngine,
      language,
      companyId: orgId,
    });

    return NextResponse.json({
      success: true,
      visualText: text,
      spokenText,
      engine: resolvedEngine,
      language,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[TTS Normalize API] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
