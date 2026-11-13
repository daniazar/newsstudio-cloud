/**
 * src/app/api/ecommerce/generate-script/route.ts
 *
 * API Route: Synthesizes a frame-accurate commercial ad script across the 6 video archetypes
 * and persists the variation in Prisma.
 */

import { NextRequest, NextResponse } from "next/server";
import { compileAdScript } from "@/lib/ecommerce/adCopywriter";
import { generateCreativeAdScriptWithLlm } from "@/lib/ecommerce/creativeDirectorLlm";
import { detectProductLanguage } from "@/lib/ecommerce/languageDetector";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const t = await requireTenant();
    if (!t.ok) return t.response;
    const { orgId } = t.tenant;

    const body = await req.json();
    const {
      productSpec,
      archetype,
      targetChannel,
      aspectRatio,
      durationSeconds,
      promoCode,
      customHook,
      userCreativeDirection,
      language,
      campaignId,
      useLlm = true,
    } = body;

    if (!productSpec || !productSpec.title) {
      return NextResponse.json(
        { error: "Invalid product specification: title is required" },
        { status: 400 }
      );
    }

    let script;
    let generatedBy: "gemini-2.5-flash" | "ollama" | "deterministic" | "fallback_deterministic" = "deterministic";
    const langInfo = detectProductLanguage(productSpec);

    if (useLlm) {
      const llmResult = await generateCreativeAdScriptWithLlm({
        productSpec,
        archetype,
        targetChannel,
        aspectRatio,
        durationSeconds,
        promoCode,
        customHook,
        userCreativeDirection,
        language,
      });
      script = llmResult.script;
      generatedBy = llmResult.generatedBy;
    } else {
      script = compileAdScript({
        productSpec,
        archetype,
        targetChannel,
        aspectRatio,
        durationSeconds,
        promoCode,
        customHook,
        language,
      });
    }

    let adVariationId: string | null = null;

    // Persist to Prisma if campaignId provided
    if (campaignId) {
      try {
        const campaign = await prisma.productCampaign.findFirst({
          where: { id: campaignId, companyId: orgId },
        });
        if (campaign) {
          const variation = await prisma.adVariation.create({
            data: {
              campaignId,
              archetype: script.archetype,
              targetChannel: script.targetChannel,
              aspectRatio: script.aspectRatio,
              durationSeconds: script.durationSeconds,
              scriptJson: JSON.stringify(script),
              status: "draft",
            },
          });
          adVariationId = variation.id;
        } else {
          console.warn(`[generate-script] Campaign ${campaignId} not found for tenant ${orgId}`);
        }
      } catch (dbErr) {
        console.warn("Could not persist adVariation to DB (continuing in-memory):", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      script,
      generatedBy,
      langInfo,
      adVariationId,
      selectedPersona: {
        personaId: script.selectedPersonaId,
        reasoning: script.personaReasoning,
      },
      recommendedTemplate: {
        templateId: script.recommendedTemplateId,
        reasoning: script.templateReasoning,
      },
      bespokePrompts: {
        photoPrompt: script.bespokePhotoPrompt,
        veoPrompt: script.bespokeVeoPrompt,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to generate ad script:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to compile commercial script" },
      { status: 500 }
    );
  }
}
