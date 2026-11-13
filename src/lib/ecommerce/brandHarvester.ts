/**
 * src/lib/ecommerce/brandHarvester.ts
 *
 * Autonomous Brand DNA Harvester.
 * Automatically extracts logos, favicons, hex color palettes, typography,
 * and brand voice characteristics from a customer's storefront HTML.
 * Optionally synchronizes and upserts the profile to Prisma `Brand`.
 */

import { JSDOM } from "jsdom";
import { BrandDNA } from "@/lib/types/ecommerce";
import { prisma } from "@/lib/prisma";

export interface BrandHarvesterOptions {
  domain: string;
  url?: string;
  html?: string;
  companyId?: string; // If provided, upserts to DB
  brandNameFallback?: string;
}

export { getContrastingTextColor } from "./colorUtils";

/**
 * Known marketplace and major platform signature brand colors.
 */
const KNOWN_DOMAIN_COLORS: Record<string, { primary: string; secondary: string }> = {
  "mercadolibre.com": { primary: "#ffe600", secondary: "#3483fa" },
  "mercadolibre.com.ar": { primary: "#ffe600", secondary: "#3483fa" },
  "mercadolibre.cl": { primary: "#ffe600", secondary: "#3483fa" },
  "mercadolibre.com.mx": { primary: "#ffe600", secondary: "#3483fa" },
  "mercadolivre.com.br": { primary: "#ffe600", secondary: "#3483fa" },
  "amazon.com": { primary: "#ff9900", secondary: "#146eb4" },
  "amazon.es": { primary: "#ff9900", secondary: "#146eb4" },
  "amazon.co.uk": { primary: "#ff9900", secondary: "#146eb4" },
  "walmart.com": { primary: "#0071dc", secondary: "#ffc220" },
  "target.com": { primary: "#cc0000", secondary: "#ffffff" },
  "bestbuy.com": { primary: "#ffe000", secondary: "#0046be" },
  "etsy.com": { primary: "#f1641e", secondary: "#222222" },
  "ebay.com": { primary: "#e53238", secondary: "#0064d2" },
  "tiendanube.com": { primary: "#2b30e0", secondary: "#484de7" },
  "mitiendanube.com": { primary: "#2b30e0", secondary: "#484de7" },
  "nuvemshop.com.br": { primary: "#2b30e0", secondary: "#484de7" },
};

/**
 * Normalizes CSS color values (hex, rgb) to standard 6-character hex.
 */
export function normalizeToHex(colorStr: string): string | null {
  if (!colorStr) return null;
  const trimmed = colorStr.trim();

  // #RGB or #RRGGBB
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
    }
    if (trimmed.length >= 7) {
      return trimmed.slice(0, 7).toLowerCase();
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)).toString(16).padStart(2, "0");
    const g = Math.min(255, parseInt(rgbMatch[2], 10)).toString(16).padStart(2, "0");
    const b = Math.min(255, parseInt(rgbMatch[3], 10)).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toLowerCase();
  }

  return null;
}

/**
 * Determines if a hex color is a neutral black, white, or pure gray.
 */
function isNeutralColor(hex: string): boolean {
  const clean = hex.replace("#", "").toLowerCase();
  if (clean.length !== 6) return true;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  // Pure black or white
  if ((r < 25 && g < 25 && b < 25) || (r > 240 && g > 240 && b > 240)) return true;

  // Grayscale check (delta between channels is tiny)
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return maxDiff < 18;
}

/**
 * Extracts brand colors from CSS styles, meta tags, button attributes, and stylesheets.
 */
export function extractColorsFromHtml(doc: Document, domain?: string): { primary: string; secondary: string; surface: string } {
  let primary: string | null = null;
  let secondary: string | null = null;

  // 1. Check known domain signatures first
  if (domain) {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, "");
    for (const [knownKey, colors] of Object.entries(KNOWN_DOMAIN_COLORS)) {
      if (cleanDomain === knownKey || cleanDomain.endsWith(`.${knownKey}`)) {
        return {
          primary: colors.primary,
          secondary: colors.secondary,
          surface: "#09090b",
        };
      }
    }
  }

  // 2. Check meta tags: theme-color, msapplication-TileColor, etc.
  const metaSelectors = [
    'meta[name="theme-color"]',
    'meta[name="msapplication-TileColor"]',
    'meta[name="msapplication-navbutton-color"]',
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  ];
  for (const selector of metaSelectors) {
    const content = doc.querySelector(selector)?.getAttribute("content");
    if (content) {
      const hex = normalizeToHex(content);
      if (hex && !isNeutralColor(hex)) {
        primary = hex;
        break;
      }
    }
  }

  // 3. Scan real Buy / Add-To-Cart / CTA buttons in the DOM
  const buttonSelectors = [
    'button[name="add"]',
    '.product-form__submit',
    '.btn-add-to-cart',
    '.add-to-cart',
    '.single_add_to_cart_button',
    'button[type="submit"][class*="cart" i]',
    'button[type="submit"][class*="buy" i]',
    'a[class*="buy-now" i]',
    '.btn-buy',
    '.comprar',
    '.btn-comprar',
    '.agregar-al-carrito',
    '.button--primary',
    '.btn-primary',
  ];

  for (const sel of buttonSelectors) {
    const btn = doc.querySelector(sel);
    if (btn) {
      // Check inline style
      const styleAttr = btn.getAttribute("style") || "";
      const bgMatch = styleAttr.match(/background(?:-color)?\s*:\s*([^;!]+)/i);
      if (bgMatch) {
        const hex = normalizeToHex(bgMatch[1]);
        if (hex && !isNeutralColor(hex)) {
          if (!primary) primary = hex;
          else if (!secondary && hex !== primary) secondary = hex;
        }
      }
    }
  }

  // 4. Scan <style> tags and stylesheets for CSS custom properties & button rules
  const styleTags = doc.querySelectorAll("style");
  const colorFrequency: Record<string, number> = {};

  for (const style of Array.from(styleTags)) {
    const cssText = style.textContent || "";
    if (!cssText) continue;

    // A. Direct high-priority brand variable patterns
    const varMatches = cssText.matchAll(
      /--(?:color-)?(?:btn-primary|button|button-background|primary|brand|main|accent-1|accent|brand-primary)\s*:\s*([^;\}]+)/gi
    );
    for (const match of varMatches) {
      const hex = normalizeToHex(match[1]);
      if (hex && !isNeutralColor(hex)) {
        if (!primary) primary = hex;
        else if (!secondary && hex !== primary) secondary = hex;
      }
    }

    // B. Secondary variable patterns
    if (!secondary) {
      const secMatches = cssText.matchAll(
        /--(?:color-)?(?:secondary|highlight|accent-2)\s*:\s*([^;\}]+)/gi
      );
      for (const match of secMatches) {
        const hex = normalizeToHex(match[1]);
        if (hex && !isNeutralColor(hex) && hex !== primary) {
          secondary = hex;
          break;
        }
      }
    }

    // C. Inspect rules for .btn-primary, .button--primary, button[type="submit"]
    const btnRuleMatch = cssText.match(
      /(?:\.btn-primary|\.button--primary|\.product-form__submit|button\[name="add"\])[^\{]*\{[^\}]*background(?:-color)?\s*:\s*([^;\}!]+)/i
    );
    if (btnRuleMatch) {
      const hex = normalizeToHex(btnRuleMatch[1]);
      if (hex && !isNeutralColor(hex)) {
        if (!primary) primary = hex;
      }
    }

    // D. Collect non-neutral hex colors to find dominant theme accent
    const allHexes = cssText.match(/#[0-9a-fA-F]{6}\b/g) || [];
    for (const h of allHexes) {
      const norm = h.toLowerCase();
      if (!isNeutralColor(norm)) {
        colorFrequency[norm] = (colorFrequency[norm] || 0) + 1;
      }
    }
  }

  // If no primary color was found from variables or buttons, pick the most frequent non-neutral hex
  if (!primary) {
    const sorted = Object.entries(colorFrequency).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      primary = sorted[0][0];
      if (sorted.length > 1 && !secondary) {
        secondary = sorted[1][0];
      }
    }
  }

  return {
    primary: primary || "#f97316",     // Default Energetic Commercial Orange if no specific brand color found
    secondary: secondary || "#3b82f6", // Default Royal Blue
    surface: "#09090b",                // Default Deep Carbon
  };
}

/**
 * Parses JSON-LD scripts to find Organization or WebSite logo image URLs and brand name.
 */
function extractLogoFromJsonLd(
  doc: Document,
  domain: string
): { logoUrl: string | null; brandName: string | null } {
  let logoUrl: string | null = null;
  let brandName: string | null = null;

  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of Array.from(jsonLdScripts)) {
    try {
      const text = script.textContent?.trim();
      if (!text) continue;
      const parsed = JSON.parse(text);
      const candidates: Record<string, unknown>[] = [];

      if (Array.isArray(parsed)) {
        candidates.push(...(parsed as Record<string, unknown>[]));
      } else if (parsed && typeof parsed === "object") {
        const graph = (parsed as Record<string, unknown>)["@graph"];
        if (Array.isArray(graph)) {
          candidates.push(...(graph as Record<string, unknown>[]));
        } else {
          candidates.push(parsed as Record<string, unknown>);
        }
      }

      for (const item of candidates) {
        if (!item || typeof item !== "object") continue;
        const rawType = item["@type"];
        const types = Array.isArray(rawType) ? rawType : [rawType];
        const isOrgOrSite = types.some((t: string) =>
          ["Organization", "WebSite", "Store", "LocalBusiness", "OnlineStore"].includes(t)
        );

        if (isOrgOrSite) {
          if (item.name && typeof item.name === "string" && item.name.trim() && !brandName) {
            brandName = item.name.trim();
          }

          if (item.logo && !logoUrl) {
            let candidateUrl: string | null = null;
            if (typeof item.logo === "string" && item.logo.trim()) {
              candidateUrl = item.logo.trim();
            } else if (typeof item.logo === "object" && item.logo !== null) {
              const logoObj = item.logo as { url?: string; contentUrl?: string };
              candidateUrl = logoObj.url || logoObj.contentUrl || null;
            }

            if (candidateUrl && typeof candidateUrl === "string" && candidateUrl.trim().length > 3) {
              let normalized = candidateUrl.trim();
              if (normalized.startsWith("//")) normalized = `https:${normalized}`;
              else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;
              logoUrl = normalized;
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }
  return { logoUrl, brandName };
}

/**
 * Extracts first/best image URL from an HTML element looking at src, data-src, srcset, etc.
 */
function extractImgSource(img: Element, domain: string): string | null {
  const attrs = ["src", "data-src", "data-srcset", "srcset", "data-original", "data-lazy"];
  for (const attr of attrs) {
    const val = img.getAttribute(attr);
    if (val && val.trim()) {
      let candidate = val.trim();
      // Handle srcset (e.g., "url 480w, url2 1024w" or "url, url2 2x")
      if (attr.includes("srcset") && candidate.includes(",")) {
        const parts = candidate.split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
        // Take the last or largest part
        candidate = parts[parts.length - 1] || parts[0];
      } else if (candidate.includes(" ")) {
        candidate = candidate.split(/\s+/)[0];
      }

      if (candidate && candidate.length > 3 && !candidate.startsWith("data:image/svg+xml;base64,PHN2Zy")) {
        let normalized = candidate;
        if (normalized.startsWith("//")) normalized = `https:${normalized}`;
        else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;

        // Upgrade Tiendanube logo to high quality if downscaled
        if (normalized.includes("mitiendanube.com") && /-\d+-\d+\.(webp|jpg|png)/i.test(normalized)) {
          normalized = normalized.replace(/-\d+-\d+\.(webp|jpg|png)/i, ".$1");
        }
        return normalized;
      }
    }
  }
  return null;
}

/**
 * Discovers the store logo from JSON-LD, header, OpenGraph, or apple-touch-icon.
 */
function extractLogosFromHtml(
  doc: Document,
  domain: string
): { logoUrl: string | null; faviconUrl: string | null; appleTouchIconUrl: string | null; brandName?: string | null } {
  // Favicon
  const faviconEl =
    doc.querySelector('link[rel="icon"]') ||
    doc.querySelector('link[rel="shortcut icon"]');
  let faviconUrl = faviconEl?.getAttribute("href") || `https://${domain}/favicon.ico`;
  if (faviconUrl.startsWith("//")) faviconUrl = `https:${faviconUrl}`;
  else if (faviconUrl.startsWith("/")) faviconUrl = `https://${domain}${faviconUrl}`;

  // Apple touch icon
  const appleEl = doc.querySelector('link[rel="apple-touch-icon"]');
  let appleTouchIconUrl = appleEl?.getAttribute("href") || `https://${domain}/apple-touch-icon.png`;
  if (appleTouchIconUrl.startsWith("//")) appleTouchIconUrl = `https:${appleTouchIconUrl}`;
  else if (appleTouchIconUrl.startsWith("/")) appleTouchIconUrl = `https://${domain}${appleTouchIconUrl}`;

  // 1. Check JSON-LD Organization / WebSite logo
  const jsonLdOrg = extractLogoFromJsonLd(doc, domain);
  let logoUrl: string | null = jsonLdOrg.logoUrl;

  // 2. Check OpenGraph logo or schema logo
  if (!logoUrl) {
    const ogLogo =
      doc.querySelector('meta[property="og:logo"]')?.getAttribute("content") ||
      doc.querySelector('meta[name="og:logo"]')?.getAttribute("content") ||
      doc.querySelector('meta[itemprop="logo"]')?.getAttribute("content");
    if (ogLogo && ogLogo.trim()) {
      let normalized = ogLogo.trim();
      if (normalized.startsWith("//")) normalized = `https:${normalized}`;
      else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;
      logoUrl = normalized;
    }
  }

  // 3. Scan header / nav / brand elements with prioritized selectors
  if (!logoUrl) {
    const logoSelectors = [
      // Direct logo class elements
      'img[class*="logo-img" i]',
      'img[class*="logo" i]',
      'a[class*="logo" i] img',
      'a[id*="logo" i] img',
      '.logo-img',
      '.logo img',
      '.header-logo img',
      '.site-logo img',
      '.brand-logo img',
      // Alt or src attributes containing logo
      'header img[alt*="logo" i]',
      'nav img[alt*="logo" i]',
      'img[alt*="logo" i]',
      'header img[src*="logo" i]',
      'nav img[src*="logo" i]',
      'img[src*="logo" i]',
      // First link to homepage in header
      'header a[href="/"] img',
      'nav a[href="/"] img',
      'header a[href^="http"] img',
      'header img',
      'nav img',
    ];

    for (const selector of logoSelectors) {
      const matchedImgs = doc.querySelectorAll(selector);
      for (const img of Array.from(matchedImgs)) {
        const discovered = extractImgSource(img, domain);
        if (discovered) {
          logoUrl = discovered;
          break;
        }
      }
      if (logoUrl) break;
    }
  }

  // 4. Check OpenGraph image if it looks like a brand logo or theme ogimage
  if (!logoUrl) {
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (ogImage && (ogImage.toLowerCase().includes("logo") || ogImage.toLowerCase().includes("brand") || ogImage.toLowerCase().includes("themes/common/ogimage"))) {
      let normalized = ogImage.trim();
      if (normalized.startsWith("//")) normalized = `https:${normalized}`;
      else if (normalized.startsWith("/")) normalized = `https://${domain}${normalized}`;
      logoUrl = normalized;
    }
  }

  // 5. If no header logo found, fallback to appleTouchIcon
  if (!logoUrl && appleTouchIconUrl && !appleTouchIconUrl.endsWith("/apple-touch-icon.png")) {
    logoUrl = appleTouchIconUrl;
  }

  return { logoUrl, faviconUrl, appleTouchIconUrl, brandName: jsonLdOrg.brandName };
}

/**
 * Classifies brand tone of voice based on brand keywords.
 */
function inferBrandTone(
  domain: string,
  text: string
): "playful_hype" | "minimalist_luxury" | "authoritative_clinical" | "rugged_outdoor" | "approachable_friendly" {
  const combined = `${domain} ${text}`.toLowerCase();

  if (combined.includes("clinic") || combined.includes("derma") || combined.includes("science") || combined.includes("medical") || combined.includes("dr.")) {
    return "authoritative_clinical";
  }
  if (combined.includes("luxury") || combined.includes("couture") || combined.includes("atelier") || combined.includes("bespoke") || combined.includes("studio")) {
    return "minimalist_luxury";
  }
  if (combined.includes("outdoor") || combined.includes("tactical") || combined.includes("trail") || combined.includes("rugged") || combined.includes("gear")) {
    return "rugged_outdoor";
  }
  if (combined.includes("hype") || combined.includes("drop") || combined.includes("street") || combined.includes("viral") || combined.includes("club")) {
    return "playful_hype";
  }
  return "approachable_friendly";
}

/**
 * Harvests Brand DNA from raw HTML or domain heuristics.
 * If HTML is missing or lacks a logo, automatically fetches the store homepage root.
 */
export async function harvestBrandDNA(options: BrandHarvesterOptions): Promise<BrandDNA> {
  const { domain, brandNameFallback } = options;
  let html = options.html;

  let brandName = brandNameFallback || domain.split(".")[0];
  brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);

  // If no HTML provided, fetch the product URL or store homepage directly
  if (!html) {
    try {
      const targetFetchUrl = options.url || `https://${domain}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const rootRes = await fetch(targetFetchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 RubyBrandHarvester/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timeout);
      if (rootRes.ok) {
        html = await rootRes.text();
      }
    } catch {
      // Fall through to default heuristics if unreachable
    }
  }

  if (!html) {
    const knownColors = KNOWN_DOMAIN_COLORS[domain.toLowerCase().replace(/^www\./, "")] || {
      primary: "#f97316",
      secondary: "#3b82f6",
    };
    return {
      name: brandName,
      domain,
      logoUrl: null,
      faviconUrl: `https://${domain}/favicon.ico`,
      appleTouchIconUrl: `https://${domain}/apple-touch-icon.png`,
      primaryColor: knownColors.primary,
      secondaryColor: knownColors.secondary,
      surfaceColor: "#09090b",
      toneOfVoice: "playful_hype",
      taglines: [],
    };
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const siteTitle = doc.querySelector("title")?.textContent || "";
  if (!brandNameFallback && siteTitle) {
    const titleParts = siteTitle.split(/[-–|]/);
    if (titleParts.length > 1) {
      brandName = titleParts[titleParts.length - 1].trim();
    }
  }

  const colors = extractColorsFromHtml(doc, domain);
  const logos = extractLogosFromHtml(doc, domain);

  if (!brandNameFallback && logos.brandName) {
    brandName = logos.brandName;
  }

  // If the provided HTML was from a deep product page and no header logo was found,
  // query the homepage directly to find the official header logo (skipped in test mode).
  if (!logos.logoUrl && domain && process.env.NODE_ENV !== "test" && !options.html) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const rootRes = await fetch(`https://${domain}`, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 RubyBrandHarvester/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timeout);
      if (rootRes.ok) {
        const rootHtml = await rootRes.text();
        const rootDoc = new JSDOM(rootHtml).window.document;
        const rootLogos = extractLogosFromHtml(rootDoc, domain);
        if (rootLogos.logoUrl) {
          logos.logoUrl = rootLogos.logoUrl;
        }
        if (rootLogos.faviconUrl && (!logos.faviconUrl || logos.faviconUrl.endsWith("/favicon.ico"))) {
          logos.faviconUrl = rootLogos.faviconUrl;
        }
      }
    } catch {
      // Ignore root fetch error
    }
  }

  // Meta description & taglines
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const toneOfVoice = inferBrandTone(domain, `${siteTitle} ${metaDesc}`);

  const taglines: string[] = [];
  if (metaDesc && metaDesc.length < 120) {
    taglines.push(metaDesc);
  }

  const brandDNA: BrandDNA = {
    name: brandName,
    domain,
    logoUrl: logos.logoUrl,
    faviconUrl: logos.faviconUrl,
    appleTouchIconUrl: logos.appleTouchIconUrl,
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    surfaceColor: colors.surface,
    toneOfVoice,
    taglines,
    missionStatement: metaDesc || undefined,
  };

  // Optional: If companyId provided, upsert to database Brand
  if (options.companyId) {
    try {
      const handle = domain.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      await prisma.brand.upsert({
        where: {
          id: `brand_${handle}`,
        },
        create: {
          id: `brand_${handle}`,
          companyId: options.companyId,
          name: brandName,
          handle,
          profileImageUrl: logos.logoUrl || logos.appleTouchIconUrl,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          toneOfVoice,
          descriptionTemplate: metaDesc || undefined,
        },
        update: {
          name: brandName,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          toneOfVoice,
        },
      });
    } catch {
      // Non-blocking if DB is in read-only or test mode
    }
  }

  return brandDNA;
}
