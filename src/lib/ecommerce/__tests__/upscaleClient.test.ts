/**
 * src/lib/ecommerce/__tests__/upscaleClient.test.ts
 *
 * Unit tests for Automated 4K Image Upscaler & Neural Packshot Enhancement Client.
 */

import { describe, it, expect } from "vitest";
import {
  shouldUpscaleAsset,
  upgradeCdnImageUrl,
  buildRealEsrganPrompt,
  batchUpscaleProductPackshots,
} from "../upscaleClient";
import { ProductSpec } from "@/lib/types/ecommerce";

describe("Packshot Upscaler & Image Enhancement Client", () => {
  describe("shouldUpscaleAsset", () => {
    it("flags assets with explicit width or height below 1000px", () => {
      expect(shouldUpscaleAsset({ url: "https://example.com/item.jpg", width: 640, height: 480 })).toBe(true);
      expect(shouldUpscaleAsset({ url: "https://example.com/item.jpg", width: 800 })).toBe(true);
      expect(shouldUpscaleAsset({ url: "https://example.com/item.jpg", width: 1920, height: 1080 })).toBe(false);
    });

    it("flags assets with low-resolution CDN markers in URL", () => {
      expect(shouldUpscaleAsset({ url: "https://cdn.shopify.com/products/shoe_small.jpg" })).toBe(true);
      expect(shouldUpscaleAsset({ url: "https://cdn.shopify.com/products/watch_thumb.png" })).toBe(true);
      expect(shouldUpscaleAsset({ url: "https://images.unsplash.com/photo-123?w=400&h=300" })).toBe(true);
      expect(shouldUpscaleAsset({ url: "https://m.media-amazon.com/images/I/71xyz._AC_SX300_.jpg" })).toBe(true);
    });

    it("does not flag already high-resolution assets", () => {
      expect(shouldUpscaleAsset({ url: "https://cdn.shopify.com/products/shoe_4000x4000.jpg", width: 2400, height: 2400 })).toBe(false);
      expect(shouldUpscaleAsset({ url: "https://m.media-amazon.com/images/I/71xyz.jpg" })).toBe(false);
    });
  });

  describe("upgradeCdnImageUrl", () => {
    it("strips Amazon preview dimension caps to restore master resolution", () => {
      const amazonConstrained = "https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SX679_.jpg";
      const upgraded = upgradeCdnImageUrl(amazonConstrained);
      expect(upgraded).toBe("https://m.media-amazon.com/images/I/71o8Q5XJS5L.jpg");
    });

    it("upgrades Shopify image dimensions from _large to _4000x4000", () => {
      const shopifyLarge = "https://cdn.shopify.com/s/files/1/0001/products/oak_plank_large.jpg?v=123";
      const upgraded = upgradeCdnImageUrl(shopifyLarge);
      expect(upgraded).toContain("_4000x4000.jpg");
    });

    it("upgrades Unsplash query parameters to 2048px high quality", () => {
      const unsplashUrl = "https://images.unsplash.com/photo-1590658268037?w=500&auto=format&fit=crop&q=60";
      const upgraded = upgradeCdnImageUrl(unsplashUrl, 2048);
      expect(upgraded).toContain("w=2048");
      expect(upgraded).toContain("q=95");
    });
  });

  describe("buildRealEsrganPrompt", () => {
    it("builds valid ComfyUI prompt structure with UpscaleModelLoader and ImageUpscaleWithModel", () => {
      const prompt = buildRealEsrganPrompt("https://example.com/lowres.png", "RealESRGAN_x4plus.pth");

      expect(prompt["1"]).toBeDefined();
      expect((prompt["1"] as any).class_type).toBe("UpscaleModelLoader");
      expect((prompt["1"] as any).inputs.model_name).toBe("RealESRGAN_x4plus.pth");

      expect(prompt["2"]).toBeDefined();
      expect((prompt["2"] as any).class_type).toBe("LoadImageFromUrl");
      expect((prompt["2"] as any).inputs.url).toBe("https://example.com/lowres.png");

      expect(prompt["3"]).toBeDefined();
      expect((prompt["3"] as any).class_type).toBe("ImageUpscaleWithModel");

      expect(prompt["4"]).toBeDefined();
      expect((prompt["4"] as any).class_type).toBe("SaveImage");
      expect((prompt["4"] as any).inputs.filename_prefix).toBe("Ruby_Ecom_Packshot_4K");
    });
  });

  describe("batchUpscaleProductPackshots", () => {
    it("automatically upgrades CDN image resolutions across product spec assets", async () => {
      const mockProduct: ProductSpec = {
        id: "prod_test",
        sourceUrl: "https://shop.com/prod",
        title: "Test Headphones",
        vendor: "Sonic",
        description: "Test desc",
        bulletPoints: ["ANC"],
        price: 99,
        currency: "USD",
        inStock: true,
        typology: "discrete_object",
        brand: {
          name: "Sonic",
          domain: "shop.com",
          logoUrl: null,
          faviconUrl: null,
          appleTouchIconUrl: null,
          primaryColor: "#000",
          secondaryColor: "#fff",
          surfaceColor: "#000",
          toneOfVoice: "playful_hype",
          taglines: [],
        },
        variants: [],
        assets: [
          {
            id: "ast_1",
            url: "https://m.media-amazon.com/images/I/71xyz._AC_SX679_.jpg",
            type: "hero_packshot",
            isPrimary: true,
          },
          {
            id: "ast_2",
            url: "https://cdn.shopify.com/products/item_large.jpg",
            type: "lifestyle_context",
          },
        ],
        topReviews: [],
        scrapedAt: new Date().toISOString(),
      };

      const enhancedProduct = await batchUpscaleProductPackshots(mockProduct);

      // Verify asset 1 upgraded to master unconstrained Amazon URL
      expect(enhancedProduct.assets[0].url).toBe("https://m.media-amazon.com/images/I/71xyz.jpg");

      // Verify asset 2 upgraded to 4000x4000 Shopify URL
      expect(enhancedProduct.assets[1].url).toContain("_4000x4000.jpg");
    });
  });
});
