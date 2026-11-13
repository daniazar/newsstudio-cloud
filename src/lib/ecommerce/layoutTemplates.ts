/**
 * src/lib/ecommerce/layoutTemplates.ts
 *
 * Universal Canvas Layout & Multi-Element Integral Templates Engine.
 * Manages cohesive 2D/3D positioning for all video layers (Subtitles, Anchor,
 * Product, Headline, Badges, CTA, Ticker Tape, Brand Logo).
 */

import type { PresenterLayoutMode } from "@/lib/types/ecommerce";

export interface ElementTransform {
  offsetX: number;
  offsetY: number;
  scale?: number;
}

export interface PresenterTransform extends ElementTransform {
  layoutMode: PresenterLayoutMode;
  position: PresenterLayoutMode;
  bubbleFaceZoom?: number;
  bubbleFaceOffsetY?: number;
  bubbleFaceOffsetX?: number;
}

export interface AdCanvasLayoutConfig {
  templateId?: string;
  caption: ElementTransform & { placement?: "top" | "center" | "bottom" };
  headline: ElementTransform;
  product: ElementTransform & { scale: number };
  presenter: PresenterTransform;
  badge: ElementTransform;
  pricePromo: ElementTransform & { scale: number };
  ctaButton: ElementTransform & { scale: number };
  tickerTape: { offsetY: number };
  brandLogo: ElementTransform & { scale: number };
  featurePills: ElementTransform;
  reviewCard: ElementTransform & { scale: number };
  updatedAt?: string;
}

export interface IntegralLayoutTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: string;
  layout: AdCanvasLayoutConfig;
}

export const DEFAULT_CANVAS_LAYOUT: AdCanvasLayoutConfig = {
  templateId: "tiktok_creator",
  caption: { offsetX: 0, offsetY: 0, placement: "bottom" },
  headline: { offsetX: 0, offsetY: 0 },
  product: { offsetX: 0, offsetY: 0, scale: 1.0 },
  presenter: { offsetX: 0, offsetY: 0, scale: 1.0, layoutMode: "bottom_right", position: "bottom_right" },
  badge: { offsetX: 0, offsetY: 0 },
  pricePromo: { offsetX: 0, offsetY: 0, scale: 1.0 },
  ctaButton: { offsetX: 0, offsetY: 0, scale: 1.0 },
  tickerTape: { offsetY: 0 },
  brandLogo: { offsetX: 0, offsetY: 0, scale: 1.0 },
  featurePills: { offsetX: 0, offsetY: 0 },
  reviewCard: { offsetX: 0, offsetY: 0, scale: 1.0 },
};

export const INTEGRAL_LAYOUT_TEMPLATES: IntegralLayoutTemplate[] = [
  {
    id: "tiktok_creator",
    name: "📱 TikTok & Reels Classic",
    badge: "Most Popular",
    description: "Standard vertical commercial layout. Subtitles center-bottom, Anchor corner right, Product hero center.",
    icon: "Smartphone",
    layout: {
      templateId: "tiktok_creator",
      caption: { offsetX: 0, offsetY: 30, placement: "bottom" },
      headline: { offsetX: 0, offsetY: 0 },
      product: { offsetX: 0, offsetY: -30, scale: 1.0 },
      presenter: { offsetX: 0, offsetY: 0, scale: 1.0, layoutMode: "bottom_right", position: "bottom_right" },
      badge: { offsetX: 0, offsetY: 0 },
      pricePromo: { offsetX: 0, offsetY: 0, scale: 1.0 },
      ctaButton: { offsetX: 0, offsetY: 0, scale: 1.0 },
      tickerTape: { offsetY: 0 },
      brandLogo: { offsetX: 0, offsetY: 0, scale: 1.0 },
      featurePills: { offsetX: 0, offsetY: 0 },
      reviewCard: { offsetX: 0, offsetY: 0, scale: 1.0 },
    },
  },
  {
    id: "top_subtitles",
    name: "⬆️ Top Subtitles (Reels Safe Zone)",
    badge: "High Conversion",
    description: "Elevates subtitles to upper-third to avoid TikTok/Instagram Reels bottom captions, username & audio disc.",
    icon: "ArrowUpCircle",
    layout: {
      templateId: "top_subtitles",
      caption: { offsetX: 0, offsetY: -450, placement: "top" },
      headline: { offsetX: 0, offsetY: -70 },
      product: { offsetX: 0, offsetY: 30, scale: 1.05 },
      presenter: { offsetX: 10, offsetY: 15, scale: 0.95, layoutMode: "bottom_right", position: "bottom_right" },
      badge: { offsetX: 0, offsetY: 10 },
      pricePromo: { offsetX: 0, offsetY: 10, scale: 1.0 },
      ctaButton: { offsetX: 0, offsetY: 10, scale: 1.0 },
      tickerTape: { offsetY: 0 },
      brandLogo: { offsetX: 0, offsetY: -20, scale: 0.9 },
      featurePills: { offsetX: 0, offsetY: 0 },
      reviewCard: { offsetX: 0, offsetY: 10, scale: 1.0 },
    },
  },
  {
    id: "anchor_left",
    name: "👤 Anchor Left & Split Stage",
    badge: "Storytelling",
    description: "Places Anchor on bottom-left, offsetting Product and Badges to the right for clear narrative separation.",
    icon: "User",
    layout: {
      templateId: "anchor_left",
      caption: { offsetX: 30, offsetY: 30, placement: "bottom" },
      headline: { offsetX: 0, offsetY: 0 },
      product: { offsetX: 60, offsetY: -20, scale: 1.0 },
      presenter: { offsetX: 0, offsetY: 0, scale: 1.0, layoutMode: "bottom_left", position: "bottom_left" },
      badge: { offsetX: 60, offsetY: 0 },
      pricePromo: { offsetX: 50, offsetY: 0, scale: 1.0 },
      ctaButton: { offsetX: 50, offsetY: 0, scale: 1.0 },
      tickerTape: { offsetY: 0 },
      brandLogo: { offsetX: 0, offsetY: 0, scale: 1.0 },
      featurePills: { offsetX: 40, offsetY: 0 },
      reviewCard: { offsetX: 40, offsetY: 0, scale: 1.0 },
    },
  },
  {
    id: "product_dominant",
    name: "💎 Product Hero (Max Impact)",
    badge: "E-Commerce",
    description: "Scales product to 1.2x bleed center-stage with compact corner anchor PiP and lower-third captions.",
    icon: "Package",
    layout: {
      templateId: "product_dominant",
      caption: { offsetX: 0, offsetY: 90, placement: "bottom" },
      headline: { offsetX: 0, offsetY: -20 },
      product: { offsetX: 0, offsetY: -10, scale: 1.2 },
      presenter: { offsetX: 15, offsetY: 25, scale: 0.75, layoutMode: "bottom_right", position: "bottom_right" },
      badge: { offsetX: -10, offsetY: 10 },
      pricePromo: { offsetX: 0, offsetY: 0, scale: 1.05 },
      ctaButton: { offsetX: 0, offsetY: -10, scale: 1.05 },
      tickerTape: { offsetY: 0 },
      brandLogo: { offsetX: 0, offsetY: -10, scale: 1.0 },
      featurePills: { offsetX: 0, offsetY: 10 },
      reviewCard: { offsetX: 0, offsetY: 0, scale: 1.0 },
    },
  },
  {
    id: "broadcast_newsroom",
    name: "📺 Broadcast Newsroom Ticker",
    badge: "Authority",
    description: "Broadcast TV feel. Anchor anchored above bottom live wire ticker, subtitles centered directly above ticker tape.",
    icon: "Radio",
    layout: {
      templateId: "broadcast_newsroom",
      caption: { offsetX: 0, offsetY: -30, placement: "bottom" },
      headline: { offsetX: 0, offsetY: -40 },
      product: { offsetX: -50, offsetY: -30, scale: 0.95 },
      presenter: { offsetX: 0, offsetY: -50, scale: 1.0, layoutMode: "bottom_right", position: "bottom_right" },
      badge: { offsetX: -40, offsetY: -30 },
      pricePromo: { offsetX: 0, offsetY: -30, scale: 1.0 },
      ctaButton: { offsetX: 0, offsetY: -30, scale: 1.0 },
      tickerTape: { offsetY: 0 },
      brandLogo: { offsetX: 0, offsetY: -20, scale: 1.0 },
      featurePills: { offsetX: 0, offsetY: -20 },
      reviewCard: { offsetX: 0, offsetY: -20, scale: 1.0 },
    },
  },
  {
    id: "minimal_clean",
    name: "✨ Minimalist Luxury",
    badge: "Editorial",
    description: "Quiet luxury aesthetic. Dead-center product, low-profile subtle subtitles bar, discreet corner anchor.",
    icon: "Sparkles",
    layout: {
      templateId: "minimal_clean",
      caption: { offsetX: 0, offsetY: 60, placement: "bottom" },
      headline: { offsetX: 0, offsetY: 10 },
      product: { offsetX: 0, offsetY: 0, scale: 1.05 },
      presenter: { offsetX: 15, offsetY: 15, scale: 0.8, layoutMode: "bottom_right", position: "bottom_right" },
      badge: { offsetX: 0, offsetY: 0 },
      pricePromo: { offsetX: 0, offsetY: 0, scale: 1.0 },
      ctaButton: { offsetX: 0, offsetY: 0, scale: 1.0 },
      tickerTape: { offsetY: 0 },
      brandLogo: { offsetX: 0, offsetY: 0, scale: 0.9 },
      featurePills: { offsetX: 0, offsetY: 0 },
      reviewCard: { offsetX: 0, offsetY: 0, scale: 0.95 },
    },
  },
];

/**
 * Returns the layout configuration for a given template id.
 */
export function applyIntegralLayout(templateId: string): AdCanvasLayoutConfig {
  const found = INTEGRAL_LAYOUT_TEMPLATES.find((t) => t.id === templateId);
  return found ? JSON.parse(JSON.stringify(found.layout)) : JSON.parse(JSON.stringify(DEFAULT_CANVAS_LAYOUT));
}

/**
 * Checks whether a specific layer currently has non-zero offsets or custom scale.
 */
export function isLayerCustomized(
  layerId: string,
  offsets: {
    offsetX?: number;
    offsetY?: number;
    scale?: number;
  }
): boolean {
  const x = offsets.offsetX ?? 0;
  const y = offsets.offsetY ?? 0;
  const s = offsets.scale ?? 1.0;
  return Math.abs(x) > 1 || Math.abs(y) > 1 || Math.abs(s - 1.0) > 0.02;
}

/**
 * Checks whether any element in the layout has non-default positions.
 */
export function isLayoutCustomized(layout: AdCanvasLayoutConfig): boolean {
  if (!layout) return false;
  const keys: Array<keyof AdCanvasLayoutConfig> = [
    "caption",
    "headline",
    "product",
    "presenter",
    "badge",
    "pricePromo",
    "ctaButton",
    "brandLogo",
    "featurePills",
    "reviewCard",
  ];

  for (const k of keys) {
    const el = layout[k] as ElementTransform | undefined;
    if (el) {
      if (isLayerCustomized(k, el)) return true;
    }
  }

  if (layout.tickerTape && Math.abs(layout.tickerTape.offsetY ?? 0) > 1) {
    return true;
  }

  return false;
}
