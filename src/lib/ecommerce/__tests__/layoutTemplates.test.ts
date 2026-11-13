import { describe, it, expect } from "vitest";
import {
  DEFAULT_CANVAS_LAYOUT,
  INTEGRAL_LAYOUT_TEMPLATES,
  applyIntegralLayout,
  isLayerCustomized,
  isLayoutCustomized,
  AdCanvasLayoutConfig,
} from "@/lib/ecommerce/layoutTemplates";

describe("Integral Layout Templates and Customization Helpers", () => {
  it("provides a valid DEFAULT_CANVAS_LAYOUT with all zero offsets and scale 1.0", () => {
    expect(DEFAULT_CANVAS_LAYOUT.templateId).toBe("tiktok_creator");
    expect(DEFAULT_CANVAS_LAYOUT.caption.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.caption.offsetY).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.caption.placement).toBe("bottom");

    expect(DEFAULT_CANVAS_LAYOUT.presenter.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.presenter.offsetY).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.presenter.scale).toBe(1.0);
    expect(DEFAULT_CANVAS_LAYOUT.presenter.position).toBe("bottom_right");

    expect(DEFAULT_CANVAS_LAYOUT.product.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.product.offsetY).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.product.scale).toBe(1.0);

    expect(DEFAULT_CANVAS_LAYOUT.headline.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.headline.offsetY).toBe(0);

    expect(DEFAULT_CANVAS_LAYOUT.badge.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.badge.offsetY).toBe(0);

    expect(DEFAULT_CANVAS_LAYOUT.pricePromo.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.pricePromo.offsetY).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.pricePromo.scale).toBe(1.0);

    expect(DEFAULT_CANVAS_LAYOUT.ctaButton.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.ctaButton.offsetY).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.ctaButton.scale).toBe(1.0);

    expect(DEFAULT_CANVAS_LAYOUT.tickerTape.offsetY).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.brandLogo.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.featurePills.offsetX).toBe(0);
    expect(DEFAULT_CANVAS_LAYOUT.reviewCard.offsetX).toBe(0);
  });

  it("contains 6 diverse integral layout templates covering top/mid/bottom subtitles and left/right anchor", () => {
    expect(INTEGRAL_LAYOUT_TEMPLATES).toHaveLength(6);
    const ids = INTEGRAL_LAYOUT_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("tiktok_creator");
    expect(ids).toContain("top_subtitles");
    expect(ids).toContain("anchor_left");
    expect(ids).toContain("product_dominant");
    expect(ids).toContain("broadcast_newsroom");
    expect(ids).toContain("minimal_clean");

    // Check top subtitles template
    const topSub = INTEGRAL_LAYOUT_TEMPLATES.find((t) => t.id === "top_subtitles");
    expect(topSub?.layout.caption.placement).toBe("top");

    // Check anchor left template
    const anchorLeft = INTEGRAL_LAYOUT_TEMPLATES.find((t) => t.id === "anchor_left");
    expect(anchorLeft?.layout.presenter.position).toBe("bottom_left");

    // Check broadcast newsroom template
    const broadcast = INTEGRAL_LAYOUT_TEMPLATES.find((t) => t.id === "broadcast_newsroom");
    expect(broadcast?.layout.caption.placement).toBe("bottom");
    expect(broadcast?.layout.presenter.position).toBe("bottom_right");
    expect(broadcast?.layout.presenter.offsetY).toBe(-50);
  });

  it("applies integral layout cleanly without mutating defaults", () => {
    const applied = applyIntegralLayout("anchor_left");
    expect(applied.presenter.position).toBe("bottom_left");
    expect(applied.caption.placement).toBe("bottom");
    // Ensure DEFAULT_CANVAS_LAYOUT was not mutated
    expect(DEFAULT_CANVAS_LAYOUT.presenter.position).toBe("bottom_right");
  });

  it("falls back to default layout if template id is unknown", () => {
    const applied = applyIntegralLayout("non_existent_id");
    expect(applied.presenter.position).toBe("bottom_right");
  });

  it("accurately detects customized layers via isLayerCustomized", () => {
    expect(isLayerCustomized("caption", { offsetX: 0, offsetY: 0 })).toBe(false);
    expect(isLayerCustomized("caption", { offsetX: 10, offsetY: 0 })).toBe(true);
    expect(isLayerCustomized("caption", { offsetX: 0, offsetY: -5 })).toBe(true);

    expect(isLayerCustomized("product", { offsetX: 0, offsetY: 0, scale: 1.0 })).toBe(false);
    expect(isLayerCustomized("product", { offsetX: 0, offsetY: 0, scale: 1.2 })).toBe(true);
    expect(isLayerCustomized("product", { offsetX: -20, offsetY: 0, scale: 1.0 })).toBe(true);

    expect(isLayerCustomized("tickerTape", { offsetY: 0 })).toBe(false);
    expect(isLayerCustomized("tickerTape", { offsetY: 15 })).toBe(true);
  });

  it("accurately detects whole layout customization via isLayoutCustomized", () => {
    expect(isLayoutCustomized(DEFAULT_CANVAS_LAYOUT)).toBe(false);

    const modifiedLayout: AdCanvasLayoutConfig = {
      ...DEFAULT_CANVAS_LAYOUT,
      headline: { offsetX: 15, offsetY: 0 },
    };
    expect(isLayoutCustomized(modifiedLayout)).toBe(true);
  });
});
