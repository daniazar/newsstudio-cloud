/**
 * src/lib/ecommerce/socialAdCopy.ts
 *
 * Client-safe copywriting generator for platform-tailored ad copy and viral hashtags.
 * Decoupled from server-side dependencies (Prisma, Storage) so it can safely run
 * in Next.js browser components as well as server workers.
 */

import { ProductSpec, AdScript } from "@/lib/types/ecommerce";

export interface PlatformPublishPayload {
  title: string;
  description: string;
  hashtags: string[];
  platform: "tiktok" | "instagram" | "youtube";
}

/**
 * Generates platform-tailored viral caption and hashtags for product ads.
 */
export function generatePlatformAdCopy(
  productSpec: ProductSpec,
  script?: AdScript,
  platform: "tiktok" | "instagram" | "youtube" = "tiktok"
): PlatformPublishPayload {
  const brandName = productSpec.brand?.name || productSpec.vendor || "Ruby";
  const brandTag = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const discountText =
    productSpec.compareAtPrice && productSpec.compareAtPrice > productSpec.price
      ? `🔥 ${Math.round(((productSpec.compareAtPrice - productSpec.price) / productSpec.compareAtPrice) * 100)}% OFF`
      : "⚡ LIMITED TIME OFFER";

  const cleanBullet = productSpec.bulletPoints[0] || "Engineered for top performance";

  if (platform === "tiktok") {
    const hashtags = [
      "tiktokmademebuyit",
      "fyp",
      "viral",
      "musthave",
      brandTag,
      productSpec.typology.replace(/_/g, ""),
      "deals",
    ];
    return {
      title: `${productSpec.title.slice(0, 50)} ${discountText}`,
      description: `${script?.hookHeadline || productSpec.title}! ${cleanBullet}. Tap below to shop before sold out! 🛍️\n\n${hashtags.map((h) => `#${h}`).join(" ")}`,
      hashtags,
      platform: "tiktok",
    };
  }

  if (platform === "instagram") {
    const hashtags = [
      "reels",
      "trending",
      "ad",
      "shopnow",
      brandTag,
      "unboxing",
      "viralproducts",
      "shoppingonline",
    ];
    return {
      title: `${productSpec.title} • ${brandName}`,
      description: `${script?.hookHeadline || productSpec.title}\n\n${cleanBullet}.\n\n🏷️ ${discountText} — Link in bio or tap view shop.\n.\n.\n${hashtags.map((h) => `#${h}`).join(" ")}`,
      hashtags,
      platform: "instagram",
    };
  }

  // YouTube Shorts
  const hashtags = ["Shorts", "ProductReview", brandTag, "Deals"];
  return {
    title: `${productSpec.title.slice(0, 60)} #Shorts`,
    description: `${productSpec.title} — ${cleanBullet}.\n\nGet yours here: ${productSpec.sourceUrl}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`,
    hashtags,
    platform: "youtube",
  };
}
