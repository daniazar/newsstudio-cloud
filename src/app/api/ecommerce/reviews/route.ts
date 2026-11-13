/**
 * src/app/api/ecommerce/reviews/route.ts
 *
 * API Route for harvesting and synthesizing authentic customer UGC reviews.
 * Extracts social proof from HTML/JSON-LD or generates objection-targeted reviews.
 */

import { NextRequest, NextResponse } from "next/server";
import { ProductSpec } from "@/lib/types/ecommerce";
import {
  harvestOrSynthesizeReviews,
  synthesizeUgcReviews,
  rankReviewsForVideo,
} from "@/lib/ecommerce/reviewHarvester";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    supportedSources: ["json_ld", "shopify", "judge_me", "yotpo", "amazon", "trustpilot", "synthetic_ugc"],
    objectionCategories: [
      "durability",
      "ease_of_use",
      "value_for_money",
      "sizing_and_fit",
      "aesthetic_design",
      "customer_support",
      "general_satisfaction",
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productSpec, action = "harvest", htmlSnippet, count = 4 } = body;

    if (!productSpec || !productSpec.title) {
      return NextResponse.json(
        { error: "Missing or invalid productSpec in request body" },
        { status: 400 }
      );
    }

    if (action === "synthesize") {
      const synthetic = synthesizeUgcReviews(productSpec as ProductSpec, count);
      const ranked = rankReviewsForVideo(synthetic);
      return NextResponse.json({
        success: true,
        action: "synthesize",
        reviews: ranked,
        topPick: ranked[0],
        summary: {
          averageRating: 5.0,
          totalCount: ranked.length,
          objectionDistribution: ranked.reduce((acc, r) => {
            acc[r.objectionSolved] = (acc[r.objectionSolved] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      });
    }

    // Default: harvest with fallback synthesis
    const result = await harvestOrSynthesizeReviews(
      productSpec as ProductSpec,
      htmlSnippet
    );

    return NextResponse.json({
      success: true,
      action: "harvest",
      ...result,
    });
  } catch (error: unknown) {
    console.error("[POST /api/ecommerce/reviews] Error:", error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : "Failed to process customer reviews") },
      { status: 500 }
    );
  }
}
