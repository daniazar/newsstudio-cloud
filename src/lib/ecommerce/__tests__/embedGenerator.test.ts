/**
 * src/lib/ecommerce/__tests__/embedGenerator.test.ts
 *
 * Unit tests for On-Site Shoppable Video Embed Generator.
 */

import { describe, it, expect } from "vitest";
import { generateShoppableEmbed } from "../embedGenerator";
import { ProductSpec } from "@/lib/types/ecommerce";

const MOCK_PRODUCT: ProductSpec = {
  id: "prod_1",
  sourceUrl: "https://myshop.com/products/test-item",
  title: "AeroBuds Pro ANC Headphones",
  vendor: "SonicTech",
  description: "High performance audio.",
  bulletPoints: ["Active Noise Cancelling", "36-hr battery"],
  price: 49.99,
  compareAtPrice: 99.99,
  currency: "USD",
  inStock: true,
  typology: "discrete_object",
  brand: {
    name: "SonicTech",
    domain: "myshop.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f43f5e",
    surfaceColor: "#09090b",
    toneOfVoice: "playful_hype",
    taglines: [],
  },
  variants: [{ id: "var_12345", title: "Matte Black", price: 49.99, available: true }],
  assets: [{ id: "a1", url: "https://myshop.com/hero.png", type: "hero_packshot", isPrimary: true }],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

describe("On-Site Shoppable Embed Generator", () => {
  it("generates zero-CLS container with 9:16 aspect-ratio and video player", () => {
    const embed = generateShoppableEmbed(MOCK_PRODUCT, {
      videoUrl: "https://cdn.myshop.com/commercial.mp4",
      aspectRatio: "9:16",
    });

    expect(embed).toContain("ruby-shoppable-container");
    expect(embed).toContain("aspect-ratio: 9 / 16");
    expect(embed).toContain("https://cdn.myshop.com/commercial.mp4");
    expect(embed).toContain("AeroBuds Pro ANC Headphones");
    expect(embed).toContain("$49.99");
    expect(embed).toContain("$99.99");
    expect(embed).toContain("ADD TO CART • $49.99");
  });

  it("includes Shopify AJAX Cart API hook and data-variant-id", () => {
    const embed = generateShoppableEmbed(MOCK_PRODUCT, {
      videoUrl: "https://cdn.myshop.com/commercial.mp4",
      shopifyVariantId: "var_12345",
    });

    expect(embed).toContain('data-variant-id="var_12345"');
    expect(embed).toContain('/cart/add.js');
    expect(embed).toContain('IntersectionObserver');
  });

  it("supports 16:9 aspect ratio with wider max-width", () => {
    const embed = generateShoppableEmbed(MOCK_PRODUCT, {
      videoUrl: "https://cdn.myshop.com/commercial.mp4",
      aspectRatio: "16:9",
    });

    expect(embed).toContain("aspect-ratio: 16 / 9");
    expect(embed).toContain("max-width: 640px");
  });
});
