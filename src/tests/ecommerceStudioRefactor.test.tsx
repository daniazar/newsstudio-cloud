import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  calculateProductReadiness,
  getCommercialReadinessScore,
} from "@/lib/ecommerce/readinessMatrix";
import {
  isValidProductUrl,
  normalizeAssetType,
  normalizeProductSpec,
} from "@/lib/ecommerce/assetNormalization";
import {
  SAMPLE_FLOORING,
  SAMPLE_PRODUCTS,
} from "@/lib/ecommerce/sampleProducts";
import { StudioHeaderToolbar } from "@/app/ecommerce-studio/components/StudioHeaderToolbar";
import { StudioProductScraperPanel } from "@/app/ecommerce-studio/components/StudioProductScraperPanel";
import { StudioSwarmViralHooksPanel } from "@/app/ecommerce-studio/components/StudioSwarmViralHooksPanel";
import { StudioScriptEditorPanel } from "@/app/ecommerce-studio/components/StudioScriptEditorPanel";
import { StudioConversionOverlaysPanel } from "@/app/ecommerce-studio/components/StudioConversionOverlaysPanel";
import { compileAdScript } from "@/lib/ecommerce/adCopywriter";

describe("E-Commerce Studio Refactor — Pure Business Logic & Modular Sub-Components", () => {
  describe("readinessMatrix", () => {
    it("returns 0 score when product is null or undefined", () => {
      const report = calculateProductReadiness(null);
      expect(report.score).toBe(0);
      expect(report.isReady).toBe(false);
      expect(report.passedCount).toBe(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("evaluates SAMPLE_FLOORING as commercially ready with high score", () => {
      const report = calculateProductReadiness(SAMPLE_FLOORING);
      expect(report.score).toBeGreaterThanOrEqual(80);
      expect(report.isReady).toBe(true);
      expect(report.passedCount).toBeGreaterThanOrEqual(5);
      expect(getCommercialReadinessScore(SAMPLE_FLOORING)).toBe(report.score);
    });

    it("flags missing reviews and brand identity in partial products", () => {
      const partial = normalizeProductSpec({
        title: "Minimal Widget",
        description: "Short",
        price: 0,
      });
      const report = calculateProductReadiness(partial);
      expect(report.score).toBeLessThan(60);
      expect(report.isReady).toBe(false);
      expect(report.recommendations).toContain("Missing valid price.");
    });
  });

  describe("assetNormalization", () => {
    it("validates HTTP/HTTPS product URLs accurately", () => {
      expect(isValidProductUrl("https://store.example.com/products/item")).toBe(true);
      expect(isValidProductUrl("http://shop.domain.io/item")).toBe(true);
      expect(isValidProductUrl("ftp://invalid.com")).toBe(false);
      expect(isValidProductUrl("not-a-url")).toBe(false);
      expect(isValidProductUrl("")).toBe(false);
    });

    it("normalizes asset types based on filename/URL semantics", () => {
      expect(normalizeAssetType("https://cdn.com/clip.mp4")).toBe("video_loop");
      expect(normalizeAssetType("https://cdn.com/macro_zoom.jpg")).toBe("detail_macro");
      expect(normalizeAssetType("https://cdn.com/lifestyle_room.png")).toBe("lifestyle_context");
      expect(normalizeAssetType("https://cdn.com/size_chart_specs.png")).toBe("infographic");
      expect(normalizeAssetType("https://cdn.com/main.jpg")).toBe("hero_packshot");
    });

    it("normalizes partial ProductSpec with safe defaults and primary asset flag", () => {
      const spec = normalizeProductSpec({
        title: "Test Camera",
        price: 299.99,
        assets: [
          { id: "", url: "https://cdn.com/cam.jpg", type: "hero_packshot", isPrimary: false },
        ],
      });
      expect(spec.title).toBe("Test Camera");
      expect(spec.price).toBe(299.99);
      expect(spec.assets[0].isPrimary).toBe(true);
      expect(spec.brand.primaryColor).toBeDefined();
    });
  });

  describe("sampleProducts catalog", () => {
    it("exports non-empty sample products array containing SAMPLE_FLOORING", () => {
      expect(SAMPLE_PRODUCTS.length).toBeGreaterThanOrEqual(2);
      expect(SAMPLE_PRODUCTS[0].id).toBe(SAMPLE_FLOORING.id);
    });
  });

  describe("Extracted Presentational Sub-Components", () => {
    it("renders StudioHeaderToolbar with navigation levels and engine tabs", () => {
      const html = renderToString(
        <StudioHeaderToolbar
          activeLevel="studio"
          setActiveLevel={() => {}}
          activeStudioEngine="remotion"
          setActiveStudioEngine={() => {}}
          onOpenPreProduction={() => {}}
        />
      );
      expect(html).toContain("E-Commerce Studio Hub");
      expect(html).toContain("Stores");
      expect(html).toContain("Catalog");
      expect(html).toContain("Ad Studio");
      expect(html).toContain("Remotion 2D/3D");
    });

    it("renders StudioProductScraperPanel with sample product buttons and URL input", () => {
      const html = renderToString(
        <StudioProductScraperPanel
          productUrl="https://luminafloors.example.com"
          setProductUrl={() => {}}
          isHarvesting={false}
          harvestError={null}
          onHarvest={() => {}}
          selectedProduct={SAMPLE_FLOORING}
          onSelectSampleProduct={() => {}}
        />
      );
      expect(html).toContain("Lumina");
      expect(html).toContain("https://luminafloors.example.com");
    });

    it("renders StudioScriptEditorPanel with compiled ad script scenes", () => {
      const script = compileAdScript({
        productSpec: SAMPLE_FLOORING,
        archetype: "viral_ugc",
        targetChannel: "tiktok_shop",
      });
      const html = renderToString(
        <StudioScriptEditorPanel
          script={script}
          selectedSceneIndex={0}
          onSelectScene={() => {}}
          onUpdateScene={() => {}}
          onSelectArchetype={() => {}}
          onSelectChannel={() => {}}
        />
      );
      expect(html).toContain(script.scenes[0].headline);
    });

    it("renders StudioSwarmViralHooksPanel and StudioConversionOverlaysPanel cleanly", () => {
      const hooksHtml = renderToString(
        <StudioSwarmViralHooksPanel onSelectHook={() => {}} />
      );
      expect(hooksHtml).toContain("Viral Hook");

      const overlaysHtml = renderToString(<StudioConversionOverlaysPanel />);
      expect(overlaysHtml.length).toBeGreaterThan(50);
    });
  });
});
