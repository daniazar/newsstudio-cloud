/**
 * src/lib/ecommerce/parsers/shopifyParser.ts
 *
 * Tier 1 Harvester: Shopify Direct JSON Harvester.
 * Detects Shopify storefronts and retrieves full-fidelity, un-obfuscated
 * product data directly via the native /{handle}.json endpoint.
 */

import { ProductSpec, ProductVariant, ExtractedProductAsset, BrandDNA } from "@/lib/types/ecommerce";

export interface ShopifyProductJson {
  id: number | string;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  created_at?: string;
  handle?: string;
  updated_at?: string;
  published_at?: string;
  tags?: string[] | string;
  variants?: Array<{
    id: number | string;
    title: string;
    price: string;
    sku?: string;
    position?: number;
    compare_at_price?: string | null;
    fulfillment_service?: string;
    inventory_management?: string | null;
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
    available?: boolean;
    featured_image?: { src: string } | null;
  }>;
  images?: Array<{
    id: number | string;
    product_id?: number | string;
    position?: number;
    src: string;
    width?: number;
    height?: number;
    alt?: string | null;
  }>;
  image?: {
    src: string;
  };
}

export interface ShopifyHarvesterResult {
  isShopify: boolean;
  rawJson?: ShopifyProductJson;
  parsedSpec?: Partial<ProductSpec>;
  domain: string;
}

/**
 * Strips HTML tags and splits into clean bullet points.
 */
function extractBulletPoints(html: string): { cleanText: string; bullets: string[] } {
  if (!html) return { cleanText: "", bullets: [] };

  // Strip scripts & styles
  const clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Extract <li> elements if present
  const liMatches = clean.match(/<li[^>]*>(.*?)<\/li>/gi);
  const bullets: string[] = [];

  if (liMatches && liMatches.length > 0) {
    for (const li of liMatches) {
      const text = li.replace(/<[^>]+>/g, "").trim();
      if (text.length > 3 && text.length < 200) {
        bullets.push(text);
      }
    }
  }

  // General text without HTML
  const plainText = clean
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  // If no <li> found, split by periods or newlines for bullet points
  if (bullets.length === 0) {
    const sentences = plainText.split(/(?<=[.!?])\s+/);
    for (const s of sentences.slice(0, 5)) {
      if (s.trim().length > 15 && s.trim().length < 180) {
        bullets.push(s.trim());
      }
    }
  }

  return { cleanText: plainText, bullets: bullets.slice(0, 6) };
}

/**
 * Converts Shopify image URLs to highest resolution available (up to 4000x4000).
 */
export function upgradeShopifyImageUrl(url: string): string {
  if (!url) return url;
  // Ensure https:
  let upgraded = url.startsWith("//") ? `https:${url}` : url;
  // Strip size suffixes like _medium, _compact, _grande, _1024x1024
  upgraded = upgraded.replace(/_(?:pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048)\./, ".");
  // Strip query params like ?v=123456
  const cleanBase = upgraded.split("?")[0];
  return cleanBase;
}

/**
 * Core parsing logic converting raw Shopify product JSON into Partial<ProductSpec>.
 */
export function parseShopifyProductJson(
  shopifyData: { product: ShopifyProductJson } | ShopifyProductJson,
  sourceUrl: string
): ShopifyHarvesterResult {
  const product: ShopifyProductJson = "product" in shopifyData ? shopifyData.product : shopifyData;

  if (!product || !product.title) {
    return { isShopify: false, domain: "" };
  }

  let domain = "";
  try {
    const parsedUrl = new URL(sourceUrl);
    domain = parsedUrl.hostname;
  } catch {
    domain = "store.myshopify.com";
  }

  const { cleanText, bullets } = extractBulletPoints(product.body_html || "");

  // Parse variants
  const variants: ProductVariant[] = (product.variants || []).map((v) => {
    const priceNum = parseFloat(v.price) || 0;
    const compareNum = v.compare_at_price ? parseFloat(v.compare_at_price) : undefined;
    return {
      id: String(v.id),
      title: v.title,
      sku: v.sku || undefined,
      price: priceNum,
      compareAtPrice: compareNum,
      available: v.available ?? true,
      option1: v.option1 || undefined,
      option2: v.option2 || undefined,
      imageUrl: v.featured_image?.src ? upgradeShopifyImageUrl(v.featured_image.src) : undefined,
    };
  });

  const primaryPrice = variants[0]?.price || 0;
  const primaryCompareAt = variants[0]?.compareAtPrice;

  // Parse images & assets
  const assets: ExtractedProductAsset[] = (product.images || []).map((img, idx) => {
    const highResUrl = upgradeShopifyImageUrl(img.src);
    return {
      id: `asset_${img.id || idx}`,
      url: highResUrl,
      type: idx === 0 ? "hero_packshot" : "lifestyle_context",
      altText: img.alt || product.title,
      width: img.width || 2048,
      height: img.height || 2048,
      isPrimary: idx === 0,
    };
  });

  // Fallback single image if images array was empty
  if (assets.length === 0 && product.image?.src) {
    assets.push({
      id: "asset_primary",
      url: upgradeShopifyImageUrl(product.image.src),
      type: "hero_packshot",
      altText: product.title,
      width: 2048,
      height: 2048,
      isPrimary: true,
    });
  }

  const defaultBrand: BrandDNA = {
    name: product.vendor || domain.split(".")[0],
    domain,
    logoUrl: null,
    faviconUrl: `https://${domain}/favicon.ico`,
    appleTouchIconUrl: `https://${domain}/apple-touch-icon.png`,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  };

  const parsedSpec: Partial<ProductSpec> = {
    id: `prod_${product.id || Date.now()}`,
    sourceUrl,
    title: product.title.trim(),
    vendor: product.vendor || domain,
    description: cleanText,
    bulletPoints: bullets,
    price: primaryPrice,
    compareAtPrice: primaryCompareAt,
    currency: "USD",
    inStock: variants.some((v) => v.available),
    brand: defaultBrand,
    variants,
    assets,
    topReviews: [],
    scrapedAt: new Date().toISOString(),
  };

  return {
    isShopify: true,
    rawJson: product,
    parsedSpec,
    domain,
  };
}

/**
 * Fetches and parses a live Shopify product URL.
 */
export async function fetchShopifyProduct(url: string): Promise<ShopifyHarvesterResult> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;

    // Check if URL matches /products/{handle} pattern
    const pathMatch = parsed.pathname.match(/\/products\/([^\/\?#]+)/);
    if (!pathMatch) {
      return { isShopify: false, domain };
    }

    const handle = pathMatch[1];
    const jsonEndpoint = `https://${domain}/products/${handle}.json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(jsonEndpoint, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 RubyECommerceBot/1.0",
        Accept: "application/json, text/plain, */*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { isShopify: false, domain };
    }

    const data = await response.json();
    return parseShopifyProductJson(data, url);
  } catch {
    return { isShopify: false, domain: "" };
  }
}
