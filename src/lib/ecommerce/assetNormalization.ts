import { ProductSpec, ExtractedProductAsset } from "@/lib/types/ecommerce";

export function isValidProductUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function normalizeAssetType(
  url: string,
  defaultType: "hero_packshot" | "lifestyle_context" | "detail_macro" | "infographic" | "video_loop" = "hero_packshot"
): "hero_packshot" | "lifestyle_context" | "detail_macro" | "infographic" | "video_loop" {
  if (!url) return defaultType;
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.includes("video")) {
    return "video_loop";
  }
  if (lower.includes("detail") || lower.includes("macro") || lower.includes("zoom")) {
    return "detail_macro";
  }
  if (lower.includes("lifestyle") || lower.includes("context") || lower.includes("in-use")) {
    return "lifestyle_context";
  }
  if (lower.includes("chart") || lower.includes("specs") || lower.includes("infographic")) {
    return "infographic";
  }
  return defaultType;
}

export function normalizeProductSpec(rawSpec: Partial<ProductSpec>): ProductSpec {
  const id = rawSpec.id || `product_${Date.now()}`;
  const title = rawSpec.title || "Untitled Product";
  const vendor = rawSpec.vendor || rawSpec.brand?.name || "Generic Vendor";
  const description = rawSpec.description || "";
  const price = typeof rawSpec.price === "number" ? rawSpec.price : 0.0;
  const currency = rawSpec.currency || "USD";

  const rawAssets = rawSpec.assets || [];
  const assets: ExtractedProductAsset[] = rawAssets.map((asset, index) => ({
    id: asset.id || `ast_${index + 1}`,
    url: asset.url,
    type: asset.type || normalizeAssetType(asset.url),
    isPrimary: asset.isPrimary || index === 0,
    altText: asset.altText || title,
  }));

  return {
    id,
    sourceUrl: rawSpec.sourceUrl || "",
    title,
    vendor,
    description,
    bulletPoints: rawSpec.bulletPoints || [],
    price,
    compareAtPrice: rawSpec.compareAtPrice,
    currency,
    inStock: rawSpec.inStock ?? true,
    rating: rawSpec.rating ?? 5.0,
    reviewCount: rawSpec.reviewCount ?? 0,
    typology: rawSpec.typology || "discrete_object",
    brand: rawSpec.brand || {
      name: vendor,
      domain: "",
      logoUrl: null,
      faviconUrl: null,
      appleTouchIconUrl: null,
      primaryColor: "#3b82f6",
      secondaryColor: "#10b981",
      surfaceColor: "#0f172a",
      toneOfVoice: "approachable_friendly",
      taglines: [],
    },
    variants: rawSpec.variants || [],
    assets,
    topReviews: rawSpec.topReviews || [],
    scrapedAt: rawSpec.scrapedAt || new Date().toISOString(),
  };
}
