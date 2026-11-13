/**
 * src/lib/ecommerce/parsers/geminiVisionExtractor.ts
 *
 * Tier 3 Harvester: Multimodal AI Vision & LLM Fallback Extractor.
 * Invoked when storefront HTML is obfuscated, behind bot-walls, or lacks
 * Schema.org markup. Analyzes text excerpts and images to produce
 * a structured ProductSpec via unified AI SDK gateway (Gemini / Ollama).
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { ProductSpec, BrandDNA, ProductTypology } from "@/lib/types/ecommerce";

export interface GeminiExtractionOptions {
  apiKey?: string;
  sourceUrl: string;
  pageText: string;
  imageUrls?: string[];
}

export const ProductVisualAttributesSchema = z.object({
  title: z.string().default("Product"),
  vendor: z.string().optional(),
  description: z.string().optional(),
  bulletPoints: z.array(z.string()).default([]),
  price: z.number().default(0),
  compareAtPrice: z.number().nullable().optional(),
  currency: z.string().default("USD"),
  inStock: z.boolean().default(true),
  rating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
  typology: z
    .enum([
      "discrete_object",
      "surface_material",
      "apparel_wearable",
      "sensory_consumable",
      "bulky_furniture",
      "digital_saas",
      "local_service",
    ])
    .catch("discrete_object"),
  brandColors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
    })
    .optional(),
  variants: z
    .array(
      z.object({
        title: z.string(),
        price: z.number().optional(),
        available: z.boolean().optional(),
      })
    )
    .default([]),
});

export const ProductExtractionSchema = ProductVisualAttributesSchema;

export async function extractWithGemini(
  options: GeminiExtractionOptions
): Promise<Partial<ProductSpec> | null> {
  try {
    let domain = "shop.com";
    try {
      domain = new URL(options.sourceUrl).hostname;
    } catch {
      // ignore
    }

    const promptText = `You are an expert e-commerce data extraction engine.
Analyze the following webpage content and visual information from: ${options.sourceUrl}

## Cleaned Webpage Content:
${options.pageText.slice(0, 8000)}

## Task:
Extract product details into a strict JSON object:
- title: Clean, accurate product name
- vendor: Brand or manufacturer
- description: 1-2 paragraph description
- bulletPoints: List of key features/bullets
- price: Number (e.g. 49.99)
- compareAtPrice: Original price or null
- currency: ISO currency (e.g. USD, EUR, GBP)
- inStock: Boolean
- rating: Number or null
- reviewCount: Number or null
- typology: One of discrete_object, surface_material, apparel_wearable, sensory_consumable, bulky_furniture, digital_saas, local_service
- brandColors: { primary, secondary } hex values
- variants: Array of { title, price, available }`;

    const visionModel = process.env.OLLAMA_VISION_MODEL || "llava";

    let result;
    if (options.imageUrls && options.imageUrls.length > 0) {
      // Build multimodal message with available images
      const contentParts: Array<
        | { type: "text"; text: string }
        | { type: "image"; image: URL | string }
      > = [{ type: "text", text: promptText }];

      for (const url of options.imageUrls.slice(0, 3)) {
        if (!url || typeof url !== "string") continue;
        if (url.startsWith("data:")) {
          contentParts.push({ type: "image", image: url });
        } else {
          try {
            contentParts.push({ type: "image", image: new URL(url) });
          } catch {
            contentParts.push({ type: "image", image: url });
          }
        }
      }

      result = await generateLlmObject({
        schema: ProductVisualAttributesSchema,
        schemaName: "ProductVisualAttributes",
        messages: [{ role: "user", content: contentParts }],
        apiKey: options.apiKey,
        tier: "vision",
        temperature: 0.1,
        fallbackModel: visionModel,
        allowFallback: true,
      });
    } else {
      result = await generateLlmObject({
        schema: ProductVisualAttributesSchema,
        schemaName: "ProductVisualAttributes",
        prompt: promptText,
        apiKey: options.apiKey,
        tier: "structured",
        temperature: 0.1,
        allowFallback: true,
      });
    }

    const data = result.object;
    if (!data || !data.title) return null;

    const brand: BrandDNA = {
      name: data.vendor || domain.split(".")[0],
      domain,
      logoUrl: null,
      faviconUrl: `https://${domain}/favicon.ico`,
      appleTouchIconUrl: `https://${domain}/apple-touch-icon.png`,
      primaryColor: data.brandColors?.primary || "#06b6d4",
      secondaryColor: data.brandColors?.secondary || "#f43f5e",
      surfaceColor: "#09090b",
      toneOfVoice: "playful_hype",
      taglines: [],
    };

    const assets = (options.imageUrls || []).slice(0, 6).map((url, idx) => ({
      id: `gemini_asset_${idx}`,
      url,
      type: idx === 0 ? ("hero_packshot" as const) : ("lifestyle_context" as const),
      altText: data.title,
      width: 2048,
      height: 2048,
      isPrimary: idx === 0,
    }));

    return {
      id: `prod_gemini_${Date.now()}`,
      sourceUrl: options.sourceUrl,
      title: data.title,
      vendor: data.vendor,
      description: data.description,
      bulletPoints: data.bulletPoints || [],
      price: data.price || 0,
      compareAtPrice: data.compareAtPrice || undefined,
      currency: data.currency || "USD",
      inStock: data.inStock ?? true,
      rating: data.rating || undefined,
      reviewCount: data.reviewCount || undefined,
      typology: (data.typology as ProductTypology) || "discrete_object",
      brand,
      variants: (data.variants || []).map(
        (v: { title: string; price?: number; available?: boolean }, idx: number) => ({
          id: `var_${idx}`,
          title: v.title,
          price: v.price || data.price || 0,
          available: v.available ?? true,
        })
      ),
      assets,
      topReviews: [],
      scrapedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
