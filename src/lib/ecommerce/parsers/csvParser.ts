/**
 * src/lib/ecommerce/parsers/csvParser.ts
 *
 * Tier 2 Direct Harvester: CSV & TSV Product Catalog Parser.
 * Supports native Shopify Product CSV exports, WooCommerce CSV exports,
 * and generic/custom product tabular files.
 */

import {
  ProductSpec,
  ProductVariant,
  ExtractedProductAsset,
  BrandDNA,
} from "@/lib/types/ecommerce";
import { classifyProductTypology } from "../typologyClassifier";

export type DetectedCsvFormat =
  | "shopify"
  | "woocommerce"
  | "generic_csv"
  | "url_list";

export interface ParseCsvResult {
  format: DetectedCsvFormat;
  formatLabel: string;
  totalProducts: number;
  products: ProductSpec[];
  warnings?: string[];
}

/**
 * Robust RFC 4180-compliant CSV/TSV parser.
 * Handles quoted fields, escaped quotes (""), embedded commas and multi-line values.
 */
export function parseCsvRows(rawText: string): string[][] {
  if (!rawText || !rawText.trim()) return [];

  // Auto-detect delimiter from first line (comma, tab, semicolon)
  const firstLine = rawText.split(/\r\n|\n/)[0] || "";
  let delimiter = ",";
  if (firstLine.includes("\t") && !firstLine.includes(",")) {
    delimiter = "\t";
  } else if (firstLine.includes(";") && !firstLine.includes(",")) {
    delimiter = ";";
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < rawText.length) {
    const char = rawText[i];
    const nextChar = rawText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push lingering field / row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/**
 * Strips HTML tags and splits into clean bullet points.
 */
function extractBulletPoints(html: string): { cleanText: string; bullets: string[] } {
  if (!html) return { cleanText: "", bullets: [] };

  const clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  const liMatches = clean.match(/<li[^>]*>(.*?)<\/li>/gi);
  const bullets: string[] = [];

  if (liMatches && liMatches.length > 0) {
    for (const li of liMatches) {
      const text = li.replace(/<[^>]+>/g, "").trim();
      if (text.length > 3 && text.length < 250) {
        bullets.push(text);
      }
    }
  }

  const plainText = clean
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If no <li> tags found, split plain text into sentences
  if (bullets.length === 0) {
    const sentences = plainText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && s.length < 160);
    bullets.push(...sentences.slice(0, 4));
  }

  return { cleanText: plainText, bullets: bullets.slice(0, 6) };
}

/**
 * Auto-detects the catalog CSV format based on header columns.
 */
export function detectCsvFormat(headerRow: string[]): DetectedCsvFormat {
  const lowerHeaders = headerRow.map((h) => h.trim().toLowerCase());

  // Check for Shopify Product CSV
  if (
    lowerHeaders.includes("handle") &&
    (lowerHeaders.includes("title") || lowerHeaders.includes("body (html)"))
  ) {
    return "shopify";
  }

  // Check for WooCommerce Product CSV
  if (
    lowerHeaders.includes("regular price") ||
    (lowerHeaders.includes("name") && lowerHeaders.includes("images")) ||
    (lowerHeaders.includes("short description") && lowerHeaders.includes("sku"))
  ) {
    return "woocommerce";
  }

  // Check if it's primarily a URL list
  const hasOnlyUrls = lowerHeaders.some((h) =>
    ["url", "link", "product_url", "product url"].includes(h)
  );
  if (hasOnlyUrls && lowerHeaders.length <= 3) {
    return "url_list";
  }

  return "generic_csv";
}

/**
 * Builds default BrandDNA from vendor name.
 */
function createDefaultBrand(vendor: string, domain?: string): BrandDNA {
  const brandDomain = domain || `${vendor.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  return {
    name: vendor || "Store Brand",
    domain: brandDomain,
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  };
}

/**
 * Parses Shopify Product CSV format (handles multi-row variant/image grouping by Handle).
 */
function parseShopifyCsv(rows: string[][], headers: string[]): ProductSpec[] {
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
  const handleIdx = lowerHeaders.indexOf("handle");
  const titleIdx = lowerHeaders.indexOf("title");
  const bodyIdx = lowerHeaders.indexOf("body (html)");
  const vendorIdx = lowerHeaders.indexOf("vendor");
  const priceIdx = lowerHeaders.indexOf("variant price");
  const comparePriceIdx = lowerHeaders.indexOf("variant compare at price");
  const imgIdx = lowerHeaders.indexOf("image src");
  const skuIdx = lowerHeaders.indexOf("variant sku");
  const _opt1NameIdx = lowerHeaders.indexOf("option1 name");
  const opt1ValIdx = lowerHeaders.indexOf("option1 value");
  const opt2ValIdx = lowerHeaders.indexOf("option2 value");

  // Group rows by handle
  const productGroups = new Map<string, string[][]>();
  for (const row of rows) {
    const handle = row[handleIdx]?.trim();
    if (!handle) continue;
    if (!productGroups.has(handle)) {
      productGroups.set(handle, []);
    }
    productGroups.get(handle)!.push(row);
  }

  const products: ProductSpec[] = [];

  productGroups.forEach((pRows, handle) => {
    const firstRow = pRows[0];
    const title = firstRow[titleIdx]?.trim() || handle.replace(/-/g, " ");
    const bodyHtml = firstRow[bodyIdx] || "";
    const vendor = firstRow[vendorIdx]?.trim() || "Store Brand";
    const { cleanText, bullets } = extractBulletPoints(bodyHtml);

    // Harvest all variants and unique images across the group's rows
    const variants: ProductVariant[] = [];
    const imageUrls = new Set<string>();

    pRows.forEach((r, rowIdx) => {
      const pStr = r[priceIdx]?.replace(/[^0-9.]/g, "") || "0";
      const cStr = r[comparePriceIdx]?.replace(/[^0-9.]/g, "") || "0";
      const price = parseFloat(pStr) || 0;
      const comparePrice = parseFloat(cStr) || undefined;

      const opt1Val = r[opt1ValIdx]?.trim();
      const opt2Val = r[opt2ValIdx]?.trim();
      const variantTitle =
        opt1Val && opt2Val
          ? `${opt1Val} / ${opt2Val}`
          : opt1Val || `Variant ${rowIdx + 1}`;

      if (price > 0 || rowIdx === 0) {
        variants.push({
          id: `var_${handle}_${rowIdx}`,
          title: variantTitle,
          price: price > 0 ? price : 49.99,
          compareAtPrice: comparePrice && comparePrice > price ? comparePrice : undefined,
          sku: r[skuIdx]?.trim() || undefined,
          available: true,
          option1: opt1Val,
          option2: opt2Val,
        });
      }

      const imgUrl = r[imgIdx]?.trim();
      if (imgUrl && imgUrl.startsWith("http")) {
        imageUrls.add(imgUrl);
      }
    });

    const primaryPrice = variants[0]?.price || 49.99;
    const primaryCompare = variants[0]?.compareAtPrice;

    // Build assets
    const assets: ExtractedProductAsset[] = Array.from(imageUrls).map((url, idx) => ({
      id: `asset_${handle}_${idx}`,
      url,
      type: idx === 0 ? "hero_packshot" : "detail_macro",
      isPrimary: idx === 0,
    }));

    if (assets.length === 0) {
      assets.push({
        id: `asset_${handle}_0`,
        url: "/placeholder_product.png",
        type: "hero_packshot",
        isPrimary: true,
      });
    }

    const inferred = classifyProductTypology({
      title,
      description: cleanText,
      bulletPoints: bullets,
    });

    products.push({
      id: `prod_${handle}`,
      sourceUrl: `https://${vendor.toLowerCase().replace(/[^a-z0-9]/g, "")}.com/products/${handle}`,
      title,
      vendor,
      description: cleanText || `${title} - high performance product.`,
      bulletPoints:
        bullets.length > 0
          ? bullets
          : [
              "Engineered with premium durable materials",
              "Fast doorstep dispatch and easy returns",
              "100% satisfaction guaranteed",
            ],
      price: primaryPrice,
      compareAtPrice: primaryCompare,
      currency: "USD",
      inStock: true,
      rating: 4.8,
      reviewCount: 36,
      typology: inferred.typology,
      brand: createDefaultBrand(vendor),
      variants,
      assets,
      topReviews: [
        {
          id: `rev_${handle}_1`,
          author: "Verified Buyer",
          rating: 5,
          body: "Exceeded all expectations. High quality and arrived fast!",
          verifiedBuyer: true,
        },
      ],
      scrapedAt: new Date().toISOString(),
    });
  });

  return products;
}

/**
 * Parses WooCommerce Product CSV format.
 */
function parseWooCommerceCsv(rows: string[][], headers: string[]): ProductSpec[] {
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
  const idIdx = lowerHeaders.findIndex((h) => h === "id" || h === "sku");
  const nameIdx = lowerHeaders.findIndex((h) => h === "name" || h === "title");
  const descIdx = lowerHeaders.findIndex(
    (h) => h === "description" || h === "short description"
  );
  const regPriceIdx = lowerHeaders.findIndex((h) => h === "regular price");
  const salePriceIdx = lowerHeaders.findIndex((h) => h === "sale price");
  const imgIdx = lowerHeaders.findIndex((h) => h === "images" || h === "image");
  const vendorIdx = lowerHeaders.findIndex(
    (h) => h === "vendor" || h === "brand" || h === "categories"
  );

  const products: ProductSpec[] = [];

  rows.forEach((row, idx) => {
    const title = row[nameIdx]?.trim();
    if (!title) return;

    const rawId = row[idIdx]?.trim() || `woo_${idx + 1}`;
    const desc = row[descIdx] || "";
    const { cleanText, bullets } = extractBulletPoints(desc);
    const vendor = row[vendorIdx]?.trim() || "Woo Store";

    const regPriceStr = row[regPriceIdx]?.replace(/[^0-9.]/g, "") || "0";
    const salePriceStr = row[salePriceIdx]?.replace(/[^0-9.]/g, "") || "0";
    const regPrice = parseFloat(regPriceStr) || 0;
    const salePrice = parseFloat(salePriceStr) || 0;

    let price = regPrice;
    let compareAtPrice: number | undefined;

    if (salePrice > 0 && salePrice < regPrice) {
      price = salePrice;
      compareAtPrice = regPrice;
    } else if (price <= 0) {
      price = 49.99;
    }

    // Images in WooCommerce CSV are often comma-separated
    const rawImages = row[imgIdx]?.split(",").map((s) => s.trim()).filter((s) => s.startsWith("http")) || [];
    const assets: ExtractedProductAsset[] = rawImages.map((url, iIdx) => ({
      id: `asset_${rawId}_${iIdx}`,
      url,
      type: iIdx === 0 ? "hero_packshot" : "detail_macro",
      isPrimary: iIdx === 0,
    }));

    if (assets.length === 0) {
      assets.push({
        id: `asset_${rawId}_0`,
        url: "/placeholder_product.png",
        type: "hero_packshot",
        isPrimary: true,
      });
    }

    const inferred = classifyProductTypology({
      title,
      description: cleanText,
      bulletPoints: bullets,
    });

    products.push({
      id: `prod_${rawId}`,
      sourceUrl: `https://store.example.com/product/${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      title,
      vendor,
      description: cleanText || `${title} - official product.`,
      bulletPoints:
        bullets.length > 0
          ? bullets
          : [
              "Crafted with professional grade materials",
              "Fast shipping with secure tracking",
              "Full manufacturer warranty included",
            ],
      price,
      compareAtPrice,
      currency: "USD",
      inStock: true,
      rating: 4.8,
      reviewCount: 24,
      typology: inferred.typology,
      brand: createDefaultBrand(vendor),
      variants: [
        {
          id: `var_${rawId}_1`,
          title: "Standard",
          price,
          compareAtPrice,
          available: true,
        },
      ],
      assets,
      topReviews: [
        {
          id: `rev_${rawId}_1`,
          author: "Verified Customer",
          rating: 5,
          body: "Really impressed with the quality and delivery time!",
          verifiedBuyer: true,
        },
      ],
      scrapedAt: new Date().toISOString(),
    });
  });

  return products;
}

/**
 * Parses generic / custom product CSV files.
 */
function parseGenericCsv(rows: string[][], headers: string[]): ProductSpec[] {
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
  const titleIdx = lowerHeaders.findIndex((h) =>
    ["title", "name", "product_name", "product name", "item"].includes(h)
  );
  const priceIdx = lowerHeaders.findIndex((h) =>
    ["price", "unit_price", "variant price", "cost", "amount"].includes(h)
  );
  const compareIdx = lowerHeaders.findIndex((h) =>
    ["compare_price", "compare at price", "original_price", "msrp", "retail_price"].includes(h)
  );
  const descIdx = lowerHeaders.findIndex((h) =>
    ["description", "body", "details", "summary", "text"].includes(h)
  );
  const vendorIdx = lowerHeaders.findIndex((h) =>
    ["vendor", "brand", "manufacturer", "seller"].includes(h)
  );
  const imgIdx = lowerHeaders.findIndex((h) =>
    ["image", "image_url", "image url", "img", "photo", "image src"].includes(h)
  );
  const urlIdx = lowerHeaders.findIndex((h) =>
    ["url", "link", "product_url", "product url"].includes(h)
  );

  const products: ProductSpec[] = [];

  rows.forEach((row, idx) => {
    const title = (titleIdx >= 0 ? row[titleIdx] : row[0])?.trim();
    if (!title || title.length < 2) return;

    const vendor = (vendorIdx >= 0 ? row[vendorIdx] : "")?.trim() || "Brand";
    const desc = (descIdx >= 0 ? row[descIdx] : "") || "";
    const { cleanText, bullets } = extractBulletPoints(desc);

    const priceStr = (priceIdx >= 0 ? row[priceIdx] : "")?.replace(/[^0-9.]/g, "") || "49.99";
    const price = parseFloat(priceStr) || 49.99;

    const compStr = (compareIdx >= 0 ? row[compareIdx] : "")?.replace(/[^0-9.]/g, "");
    const compareAtPrice = compStr ? parseFloat(compStr) : undefined;

    const imgUrl = (imgIdx >= 0 ? row[imgIdx] : "")?.trim();
    const sourceUrl = (urlIdx >= 0 ? row[urlIdx] : "")?.trim() || `https://store.example.com/products/item-${idx + 1}`;

    const assets: ExtractedProductAsset[] = [];
    if (imgUrl && imgUrl.startsWith("http")) {
      assets.push({
        id: `asset_gen_${idx}_0`,
        url: imgUrl,
        type: "hero_packshot",
        isPrimary: true,
      });
    } else {
      assets.push({
        id: `asset_gen_${idx}_0`,
        url: "/placeholder_product.png",
        type: "hero_packshot",
        isPrimary: true,
      });
    }

    const inferred = classifyProductTypology({
      title,
      description: cleanText,
      bulletPoints: bullets,
    });

    products.push({
      id: `prod_csv_${idx + 1}`,
      sourceUrl,
      title,
      vendor,
      description: cleanText || `${title} premium quality.`,
      bulletPoints:
        bullets.length > 0
          ? bullets
          : [
              "Designed for top performance and durability",
              "Fast doorstep dispatch with live tracking",
              "100% Satisfaction guaranteed",
            ],
      price,
      compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
      currency: "USD",
      inStock: true,
      rating: 4.8,
      reviewCount: 30,
      typology: inferred.typology,
      brand: createDefaultBrand(vendor),
      variants: [
        {
          id: `var_gen_${idx}_0`,
          title: "Standard",
          price,
          compareAtPrice,
          available: true,
        },
      ],
      assets,
      topReviews: [
        {
          id: `rev_gen_${idx}_1`,
          author: "Verified Buyer",
          rating: 5,
          body: "Top notch quality, exactly as described!",
          verifiedBuyer: true,
        },
      ],
      scrapedAt: new Date().toISOString(),
    });
  });

  return products;
}

/**
 * Main entry point: Parses any product CSV / TSV text content.
 */
export function parseProductCsv(csvText: string): ParseCsvResult {
  const allRows = parseCsvRows(csvText);

  if (allRows.length < 2) {
    return {
      format: "generic_csv",
      formatLabel: "Empty / Invalid CSV",
      totalProducts: 0,
      products: [],
      warnings: ["CSV contains fewer than 2 rows (header + data required)."],
    };
  }

  const headers = allRows[0];
  const dataRows = allRows.slice(1);
  const detectedFormat = detectCsvFormat(headers);

  let products: ProductSpec[] = [];
  let formatLabel = "Custom Product CSV";

  switch (detectedFormat) {
    case "shopify":
      formatLabel = "Shopify Product CSV Export";
      products = parseShopifyCsv(dataRows, headers);
      break;
    case "woocommerce":
      formatLabel = "WooCommerce Product CSV Export";
      products = parseWooCommerceCsv(dataRows, headers);
      break;
    case "url_list":
      formatLabel = "Product URL Catalog List";
      products = parseGenericCsv(dataRows, headers);
      break;
    case "generic_csv":
    default:
      formatLabel = "Generic / Custom Product CSV";
      products = parseGenericCsv(dataRows, headers);
      break;
  }

  return {
    format: detectedFormat,
    formatLabel,
    totalProducts: products.length,
    products,
  };
}
