/**
 * src/lib/ecommerce/__tests__/productMediaPresets.test.ts
 *
 * Unit tests for Product Media Presets, Typology Detection, and Prompt Interpolation.
 */

import { describe, it, expect } from "vitest";
import {
  PRODUCT_MEDIA_CATEGORIES,
  PRODUCT_MEDIA_CATEGORIES_LIST,
  LIGHTING_MODIFIERS,
  detectCategoryFromProduct,
  buildInterpolatedPrompt,
  type ProductMediaCategoryKey,
} from "../productMediaPresets";

describe("Product Media Presets & Prompt Interpolation Suite", () => {
  it("contains all 8 product media categories with required presets", () => {
    const expectedCategories: ProductMediaCategoryKey[] = [
      "surface_material",
      "discrete_object",
      "sensory_consumable",
      "apparel_wearable",
      "food_beverage",
      "bulky_furniture",
      "sports_fitness",
      "luxury_studio",
    ];

    expect(PRODUCT_MEDIA_CATEGORIES_LIST.length).toBe(8);

    expectedCategories.forEach((catKey) => {
      const cat = PRODUCT_MEDIA_CATEGORIES[catKey];
      expect(cat, `Category ${catKey} should exist`).toBeDefined();
      expect(cat?.photoPresets.length).toBeGreaterThanOrEqual(4);
      expect(cat?.videoPresets.length).toBeGreaterThanOrEqual(4);
      expect(cat?.icon).toBeDefined();
      expect(cat?.label).toBeDefined();
    });
  });

  it("provides rich lighting modifiers", () => {
    expect(LIGHTING_MODIFIERS.length).toBeGreaterThanOrEqual(6);
    LIGHTING_MODIFIERS.forEach((mod) => {
      expect(mod.id).toBeDefined();
      expect(mod.label).toBeDefined();
      expect(mod.phrase).toBeDefined();
      expect(mod.phrase.length).toBeGreaterThan(5);
    });
  });

  describe("detectCategoryFromProduct", () => {
    it("detects surface_material from keywords in title or spec", () => {
      expect(detectCategoryFromProduct(undefined, "Porcelanato Simil Madera 20x120")).toBe(
        "surface_material"
      );
      expect(
        detectCategoryFromProduct({ typology: "surface_material" } as any, "Piso Flotante")
      ).toBe("surface_material");
      expect(detectCategoryFromProduct(undefined, "Cerámica Esmaltada Baño")).toBe(
        "surface_material"
      );
    });

    it("detects discrete_object for tech gadgets and headphones", () => {
      expect(detectCategoryFromProduct(undefined, "Wireless Noise Cancelling Earbuds Pro")).toBe(
        "discrete_object"
      );
      expect(detectCategoryFromProduct(undefined, "Mechanical Gaming Keyboard RGB")).toBe(
        "discrete_object"
      );
      expect(detectCategoryFromProduct(undefined, "4K Drone with Gimbal Camera")).toBe(
        "discrete_object"
      );
    });

    it("detects sensory_consumable for skincare and beauty", () => {
      expect(detectCategoryFromProduct(undefined, "Hyaluronic Acid Serum Anti-Age")).toBe(
        "sensory_consumable"
      );
      expect(detectCategoryFromProduct(undefined, "Eau de Parfum Spray 100ml")).toBe(
        "sensory_consumable"
      );
    });

    it("detects apparel_wearable for fashion and footwear", () => {
      expect(detectCategoryFromProduct(undefined, "Leather Chelsea Boots Brown")).toBe(
        "apparel_wearable"
      );
      expect(detectCategoryFromProduct(undefined, "Oversized Cotton Hoodie")).toBe(
        "apparel_wearable"
      );
      expect(detectCategoryFromProduct(undefined, "Running Shoes Air Cushion")).toBe(
        "apparel_wearable"
      );
    });

    it("detects food_beverage for gourmet products and coffee", () => {
      expect(detectCategoryFromProduct(undefined, "Specialty Whole Bean Coffee Colombia")).toBe(
        "food_beverage"
      );
      expect(detectCategoryFromProduct(undefined, "Malbec Reserva Wine 750ml")).toBe(
        "food_beverage"
      );
    });

    it("detects bulky_furniture for home furniture", () => {
      expect(detectCategoryFromProduct(undefined, "Velvet 3-Seater Sofa Grey")).toBe(
        "bulky_furniture"
      );
      expect(detectCategoryFromProduct(undefined, "Electric Standing Desk Dual Motor")).toBe(
        "bulky_furniture"
      );
    });

    it("detects sports_fitness for gym gear", () => {
      expect(detectCategoryFromProduct(undefined, "Adjustable Dumbbell Set 24kg")).toBe(
        "sports_fitness"
      );
      expect(detectCategoryFromProduct(undefined, "Non-Slip Yoga Mat 6mm")).toBe(
        "sports_fitness"
      );
    });

    it("falls back to luxury_studio when no specific keywords match", () => {
      expect(detectCategoryFromProduct(undefined, "Generic Mystery Item")).toBe(
        "luxury_studio"
      );
    });
  });

  describe("buildInterpolatedPrompt", () => {
    it("interpolates productName into template accurately", () => {
      const template = "Commercial hero packshot of ${productName} on a marble pedestal.";
      const result = buildInterpolatedPrompt(template, "Aura Glow Perfume");
      expect(result).toBe("Commercial hero packshot of Aura Glow Perfume on a marble pedestal.");
    });

    it("appends lighting suffix when provided", () => {
      const template = "A premium shot of ${productName}.";
      const lighting = ", bathed in warm golden hour afternoon rays.";
      const result = buildInterpolatedPrompt(template, "Luxe Watch", lighting);
      expect(result).toBe(
        "A premium shot of Luxe Watch, bathed in warm golden hour afternoon rays."
      );
    });

    it("handles empty product name by substituting default fallback", () => {
      const template = "Close-up of ${productName}.";
      const result = buildInterpolatedPrompt(template, "");
      expect(result).toBe("Close-up of this product.");
    });
  });
});
