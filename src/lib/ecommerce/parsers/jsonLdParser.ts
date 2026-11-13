/**
 * src/lib/ecommerce/parsers/jsonLdParser.ts
 *
 * Tier 2 Harvester: Standardized JSON-LD & OpenGraph Metadata Extractor.
 * Parses Schema.org Product structured data and semantic OpenGraph tags
 * to harvest products from WooCommerce, BigCommerce, Magento, Amazon, and custom sites.
 */

import { JSDOM } from "jsdom";
import { ProductSpec, ExtractedProductAsset, CustomerReviewItem, BrandDNA } from "@/lib/types/ecommerce";

export interface JsonLdHarvesterResult {
  hasProductData: boolean;
  parsedSpec?: Partial<ProductSpec>;
  domain: string;
  rawHtml?: string;
}

interface JsonLdProduct {
  name?: string;
  title?: string;
  description?: string;
  brand?: string | { name?: string };
  image?: string | string[] | Array<{ url?: string; contentUrl?: string }> | { url?: string };
  offers?: {
    price?: string | number;
    lowPrice?: string | number;
    highPrice?: string | number;
    priceCurrency?: string;
    availability?: string;
  } | Array<{
    price?: string | number;
    lowPrice?: string | number;
    highPrice?: string | number;
    priceCurrency?: string;
    availability?: string;
  }>;
  aggregateRating?: {
    ratingValue?: string | number;
    reviewCount?: string | number;
    ratingCount?: string | number;
  };
  review?: Array<{
    author?: string | { name?: string };
    reviewRating?: { ratingValue?: string | number };
    reviewBody?: string;
    description?: string;
    name?: string;
    datePublished?: string;
  }>;
  "@type"?: string | string[];
  "@graph"?: unknown[];
}

/**
 * Searches for Schema.org Product objects in JSON-LD scripts (including @graph arrays).
 */
function findProductInJsonLd(parsedJson: unknown): JsonLdProduct | null {
  if (!parsedJson || typeof parsedJson !== "object") return null;

  if (Array.isArray(parsedJson)) {
    for (const item of parsedJson) {
      const match = findProductInJsonLd(item);
      if (match) return match;
    }
    return null;
  }

  const obj = parsedJson as JsonLdProduct;

  if (obj["@type"] === "Product" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Product"))) {
    return obj;
  }

  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      const match = findProductInJsonLd(item);
      if (match) return match;
    }
  }

  return null;
}

/**
 * Parses raw HTML string into Partial<ProductSpec> using JSDOM.
 */
export function parseHtmlMetadata(html: string, sourceUrl: string): JsonLdHarvesterResult {
  let domain = "";
  try {
    domain = new URL(sourceUrl).hostname;
  } catch {
    domain = "shop.example.com";
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // 1. Try JSON-LD Extraction
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  let productNode: JsonLdProduct | null = null;

  for (const script of Array.from(jsonLdScripts)) {
    try {
      const text = script.textContent?.trim();
      if (!text) continue;
      const parsed = JSON.parse(text);
      const found = findProductInJsonLd(parsed);
      if (found) {
        productNode = found;
        break;
      }
    } catch {
      // Ignore invalid JSON-LD chunks
    }
  }

  // 2. OpenGraph / Meta tag fallback helper
  const getMeta = (property: string): string | null => {
    const el =
      doc.querySelector(`meta[property="${property}"]`) ||
      doc.querySelector(`meta[name="${property}"]`);
    return el?.getAttribute("content") || null;
  };

  const title =
    productNode?.name ||
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    doc.querySelector("title")?.textContent?.trim() ||
    "";

  if (!title) {
    return { hasProductData: false, domain };
  }

  const description =
    productNode?.description ||
    getMeta("og:description") ||
    getMeta("description") ||
    "";

  // Brand
  let brandName = domain.split(".")[0];
  if (productNode?.brand) {
    brandName = typeof productNode.brand === "string" ? productNode.brand : productNode.brand.name || brandName;
  }

  // Images
  const rawImages: string[] = [];
  if (productNode?.image) {
    if (typeof productNode.image === "string") {
      rawImages.push(productNode.image);
    } else if (Array.isArray(productNode.image)) {
      for (const img of productNode.image) {
        if (typeof img === "string") rawImages.push(img);
        else if (img?.url) rawImages.push(img.url);
        else if (img?.contentUrl) rawImages.push(img.contentUrl);
      }
    } else if (productNode.image.url) {
      rawImages.push(productNode.image.url);
    }
  }

  const ogImage = getMeta("og:image") || getMeta("twitter:image");
  if (ogImage && !rawImages.includes(ogImage)) {
    rawImages.push(ogImage);
  }

  const assets: ExtractedProductAsset[] = rawImages.map((imgUrl, idx) => ({
    id: `jsonld_asset_${idx}`,
    url: imgUrl.startsWith("//") ? `https:${imgUrl}` : imgUrl,
    type: idx === 0 ? "hero_packshot" : "lifestyle_context",
    altText: title,
    width: 2048,
    height: 2048,
    isPrimary: idx === 0,
  }));

  // Offers / Pricing
  let price = 0;
  let comparePrice: number | undefined = undefined;
  let currency = "USD";
  let inStock = true;

  if (productNode?.offers) {
    const offers = Array.isArray(productNode.offers) ? productNode.offers[0] : productNode.offers;
    if (offers) {
      price = parseFloat(String(offers.price ?? 0)) || parseFloat(String(offers.lowPrice ?? 0)) || 0;
      if (offers.highPrice && parseFloat(String(offers.highPrice)) > price) {
        comparePrice = parseFloat(String(offers.highPrice));
      }
      currency = offers.priceCurrency || "USD";
      if (offers.availability) {
        inStock = String(offers.availability).toLowerCase().includes("instock");
      }
    }
  }

  // Meta price fallback
  if (price === 0) {
    const metaPrice = getMeta("product:price:amount") || getMeta("price");
    if (metaPrice) price = parseFloat(metaPrice) || 0;
    const metaCurr = getMeta("product:price:currency");
    if (metaCurr) currency = metaCurr;
  }

  // Ratings
  let rating: number | undefined = undefined;
  let reviewCount: number | undefined = undefined;

  if (productNode?.aggregateRating) {
    rating = parseFloat(String(productNode.aggregateRating.ratingValue ?? 0)) || undefined;
    reviewCount =
      parseInt(String(productNode.aggregateRating.reviewCount ?? 0), 10) ||
      parseInt(String(productNode.aggregateRating.ratingCount ?? 0), 10) ||
      undefined;
  }

  // Reviews
  const topReviews: CustomerReviewItem[] = [];
  if (productNode?.review && Array.isArray(productNode.review)) {
    for (const r of productNode.review.slice(0, 5)) {
      const authorName = typeof r.author === "string" ? r.author : r.author?.name || "Verified Customer";
      const ratingVal = parseFloat(String(r.reviewRating?.ratingValue ?? 5)) || 5;
      const body = r.reviewBody || r.description || "";
      if (body) {
        topReviews.push({
          id: `review_${topReviews.length}`,
          author: authorName,
          rating: ratingVal,
          title: r.name || undefined,
          body,
          verifiedBuyer: true,
          date: r.datePublished || undefined,
        });
      }
    }
  }

  // Bullet points from description
  const bulletPoints: string[] = [];
  if (description) {
    const lines = description.split(/\r?\n|\.\s+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20 && trimmed.length < 180 && !trimmed.includes("<")) {
        bulletPoints.push(trimmed);
        if (bulletPoints.length >= 5) break;
      }
    }
  }

  // Discover Brand Logo
  let discoveredLogoUrl: string | null = null;

  // A. Check JSON-LD for Organization / WebSite logo
  for (const script of Array.from(jsonLdScripts)) {
    try {
      const parsed = JSON.parse(script.textContent || "{}");
      const candidates: Record<string, unknown>[] = [];
      if (Array.isArray(parsed)) candidates.push(...(parsed as Record<string, unknown>[]));
      else if (parsed && typeof parsed === "object") {
        const graph = (parsed as Record<string, unknown>)["@graph"];
        if (Array.isArray(graph)) candidates.push(...(graph as Record<string, unknown>[]));
        else candidates.push(parsed as Record<string, unknown>);
      }
      for (const item of candidates) {
        if (!item || typeof item !== "object") continue;
        const type = item["@type"];
        const isOrg =
          type === "Organization" ||
          type === "WebSite" ||
          (Array.isArray(type) && (type.includes("Organization") || type.includes("WebSite")));
        if (isOrg && item.logo) {
          const logoObj = item.logo as { url?: string; contentUrl?: string } | string;
          const candidate =
            typeof logoObj === "string"
              ? logoObj.trim()
              : logoObj.url || logoObj.contentUrl || null;
          if (candidate && typeof candidate === "string" && candidate.trim().length > 3) {
            let normalized = candidate.trim();
            if (normalized.startsWith("//")) normalized = `https:${normalized}`;
            else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;
            discoveredLogoUrl = normalized;
            break;
          }
        }
      }
      if (discoveredLogoUrl) break;
    } catch {}
  }

  // B. Check OpenGraph logo or meta logo
  if (!discoveredLogoUrl) {
    const ogLogo = getMeta("og:logo") || getMeta("logo");
    if (ogLogo && ogLogo.trim().length > 3) {
      let normalized = ogLogo.trim();
      if (normalized.startsWith("//")) normalized = `https:${normalized}`;
      else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;
      discoveredLogoUrl = normalized;
    }
  }

  // C. Check DOM Header/Nav logo elements
  if (!discoveredLogoUrl) {
    const logoSelectors = [
      'img[class*="logo-img" i]',
      'img[class*="logo" i]',
      'a[class*="logo" i] img',
      '.logo-img',
      '.logo img',
      '.site-logo img',
      'header img[alt*="logo" i]',
      'nav img[alt*="logo" i]',
      'header a[href="/"] img',
      'nav a[href="/"] img',
      'header img',
    ];
    for (const sel of logoSelectors) {
      const img = doc.querySelector(sel);
      if (img) {
        const src =
          img.getAttribute("src") ||
          img.getAttribute("data-src") ||
          img.getAttribute("srcset")?.split(/\s+/)[0];
        if (src && src.trim().length > 3 && !src.startsWith("data:")) {
          let normalized = src.trim();
          if (normalized.startsWith("//")) normalized = `https:${normalized}`;
          else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;
          discoveredLogoUrl = normalized;
          break;
        }
      }
    }
  }

  const defaultBrand: BrandDNA = {
    name: brandName,
    domain,
    logoUrl: discoveredLogoUrl,
    faviconUrl: `https://${domain}/favicon.ico`,
    appleTouchIconUrl: `https://${domain}/apple-touch-icon.png`,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  };

  const parsedSpec: Partial<ProductSpec> = {
    id: `prod_jsonld_${Date.now()}`,
    sourceUrl,
    title: title.trim(),
    vendor: brandName,
    description: description.trim(),
    bulletPoints,
    price,
    compareAtPrice: comparePrice,
    currency,
    inStock,
    rating,
    reviewCount,
    brand: defaultBrand,
    variants: [
      {
        id: "var_default",
        title: "Standard",
        price,
        compareAtPrice: comparePrice,
        available: inStock,
      },
    ],
    assets,
    topReviews,
    scrapedAt: new Date().toISOString(),
  };

  return {
    hasProductData: true,
    parsedSpec,
    domain,
    rawHtml: html,
  };
}

/**
 * Fetches HTML from a remote URL and parses its JSON-LD / OpenGraph markup.
 */
export async function fetchHtmlAndParse(url: string): Promise<JsonLdHarvesterResult> {
  try {
    const domain = new URL(url).hostname;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 RubyECommerceBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { hasProductData: false, domain };
    }

    const html = await response.text();
    return {
      ...parseHtmlMetadata(html, url),
      rawHtml: html,
    };
  } catch {
    return { hasProductData: false, domain: "" };
  }
}
