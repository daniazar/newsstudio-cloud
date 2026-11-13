/**
 * src/components/editor/shared/player/gizmo/useGizmoBounds.ts
 *
 * Geometric bounding box calculation hook for all movable/scalable canvas layers
 * in EditorCanvasGizmo (avatar, caption, headline, product, badge, promo, cta, ticker, logo, pills, review).
 */

import { useCallback, useMemo } from "react";
import { EditorCanvasGizmoProps } from "./types";

export interface UseGizmoBoundsProps {
  aspectRatio: string;
  compWidth: number;
  compHeight: number;
  presenter?: EditorCanvasGizmoProps["presenter"];
  captionOffsetX?: number;
  captionOffsetY?: number;
  captionPlacement?: "top" | "center" | "bottom" | "auto";
  headlineVisible?: boolean;
  headlineOffsetX?: number;
  headlineOffsetY?: number;
  productScale?: number;
  productOffsetX?: number;
  productOffsetY?: number;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  pricePromoScale?: number;
  pricePromoOffsetX?: number;
  pricePromoOffsetY?: number;
  ctaScale?: number;
  ctaOffsetX?: number;
  ctaOffsetY?: number;
  tickerTapeOffsetY?: number;
  brandLogoScale?: number;
  brandLogoOffsetX?: number;
  brandLogoOffsetY?: number;
  featurePillsOffsetX?: number;
  featurePillsOffsetY?: number;
  reviewCardScale?: number;
  reviewCardOffsetX?: number;
  reviewCardOffsetY?: number;
}

export function useGizmoBounds({
  aspectRatio,
  compWidth,
  compHeight,
  presenter,
  captionOffsetX = 0,
  captionOffsetY = 0,
  captionPlacement = "auto",
  headlineVisible: _headlineVisible = true,
  headlineOffsetX = 0,
  headlineOffsetY = 0,
  productScale = 1.0,
  productOffsetX = 0,
  productOffsetY = 0,
  badgeOffsetX = 0,
  badgeOffsetY = 0,
  pricePromoScale = 1.0,
  pricePromoOffsetX = 0,
  pricePromoOffsetY = 0,
  ctaScale = 1.0,
  ctaOffsetX = 0,
  ctaOffsetY = 0,
  tickerTapeOffsetY = 0,
  brandLogoScale = 1.0,
  brandLogoOffsetX = 0,
  brandLogoOffsetY = 0,
  featurePillsOffsetX = 0,
  featurePillsOffsetY = 0,
  reviewCardScale = 1.0,
  reviewCardOffsetX = 0,
  reviewCardOffsetY = 0,
}: UseGizmoBoundsProps) {
  const currentAvatarScale = presenter?.scale ?? 1.0;
  const currentAvatarOffsetX = presenter?.offsetX ?? 0;
  const currentAvatarOffsetY = presenter?.offsetY ?? 0;
  const layoutMode = presenter?.layoutMode || presenter?.position || "bottom_right";

  // 1. Avatar Bounding Box
  const avatarBounds = useMemo(() => {
    let w = Math.round(compHeight * 0.44 * currentAvatarScale * 0.82);
    let h = Math.round(compHeight * 0.44 * currentAvatarScale);
    let x = compWidth - Math.round(compWidth * 0.02) - w + currentAvatarOffsetX;
    let y = compHeight - h + currentAvatarOffsetY;

    if (layoutMode === "bottom_left") {
      x = Math.round(compWidth * 0.02) + currentAvatarOffsetX;
      y = compHeight - h + currentAvatarOffsetY;
    } else if (layoutMode === "full_screen") {
      w = Math.round(compWidth * currentAvatarScale);
      h = Math.round(compHeight * currentAvatarScale);
      x = Math.round((compWidth - w) / 2) + currentAvatarOffsetX;
      y = compHeight - h + currentAvatarOffsetY;
    } else if (layoutMode === "circle_pip" || layoutMode === "top_right") {
      const size = Math.round(compWidth * 0.28 * currentAvatarScale);
      w = size;
      h = size;
      x = compWidth - size - 24 + currentAvatarOffsetX;
      y = 40 + currentAvatarOffsetY;
    } else if (layoutMode === "top_left") {
      const size = Math.round(compWidth * 0.28 * currentAvatarScale);
      w = size;
      h = size;
      x = 24 + currentAvatarOffsetX;
      y = 40 + currentAvatarOffsetY;
    } else if (layoutMode === "side_full_left") {
      w = Math.round(compWidth * 0.48 * currentAvatarScale);
      h = compHeight;
      x = currentAvatarOffsetX;
      y = currentAvatarOffsetY;
    } else if (layoutMode === "side_full_right" || layoutMode === "split_side") {
      w = Math.round(compWidth * 0.48 * currentAvatarScale);
      h = compHeight;
      x = compWidth - w + currentAvatarOffsetX;
      y = currentAvatarOffsetY;
    }

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, currentAvatarScale, currentAvatarOffsetX, currentAvatarOffsetY, layoutMode]);
  const getAvatarBounds = useCallback(() => avatarBounds, [avatarBounds]);

  // 2. Subtitles Bounding Box
  const captionBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.88);
    const h = Math.round(aspectRatio === "9:16" ? 75 : 55);
    const x = (compWidth - w) / 2 + captionOffsetX;

    let baseY: number;
    if (captionPlacement === "bottom") {
      baseY = aspectRatio === "9:16"
        ? Math.round(compHeight * 0.58)
        : aspectRatio === "1:1"
        ? Math.round(compHeight - 140 - h)
        : Math.round(compHeight - 340 - h);
    } else if (captionPlacement === "center") {
      baseY = Math.round((compHeight - h) / 2);
    } else {
      baseY = aspectRatio === "9:16" ? 155 : 75;
    }
    const y = baseY + captionOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, captionOffsetX, captionOffsetY, aspectRatio, captionPlacement]);
  const getCaptionBounds = useCallback(() => captionBounds, [captionBounds]);

  // 3. Headline Bounding Box
  const headlineBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.90);
    const h = Math.round(aspectRatio === "9:16" ? 58 : 44);
    const x = (compWidth - w) / 2 + headlineOffsetX;
    const baseY = aspectRatio === "9:16" ? 95 : 40;
    const y = baseY + headlineOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, headlineOffsetX, headlineOffsetY, aspectRatio]);
  const getHeadlineBounds = useCallback(() => headlineBounds, [headlineBounds]);

  // 4. Product 3D Hero Bounding Box
  const productBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.65 * productScale);
    const h = Math.round(compHeight * 0.44 * productScale);
    const x = Math.round((compWidth - w) / 2) + productOffsetX;
    const y = Math.round((compHeight - h) / 2) + productOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, productOffsetX, productOffsetY, productScale]);
  const getProductBounds = useCallback(() => productBounds, [productBounds]);

  // 5. Verified Spec Badge Bounding Box
  const badgeBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.45);
    const h = 50;
    const x = 28 + badgeOffsetX;
    const y = (aspectRatio === "9:16" ? 44 : 24) + badgeOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, badgeOffsetX, badgeOffsetY, aspectRatio]);
  const getBadgeBounds = useCallback(() => badgeBounds, [badgeBounds]);

  // 7. Price & Promo Badge Bounding Box
  const pricePromoBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.70 * pricePromoScale);
    const h = Math.round(180 * pricePromoScale);
    const x = Math.round((compWidth - w) / 2) + pricePromoOffsetX;
    const y = Math.round(compHeight * 0.48) + pricePromoOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, pricePromoOffsetX, pricePromoOffsetY, pricePromoScale]);
  const getPricePromoBounds = useCallback(() => pricePromoBounds, [pricePromoBounds]);

  // 8. Call To Action (CTA) Button Bounding Box
  const ctaBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.75 * ctaScale);
    const h = Math.round(68 * ctaScale);
    const x = Math.round((compWidth - w) / 2) + ctaOffsetX;
    const y = Math.round(compHeight * 0.70) + ctaOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, ctaOffsetX, ctaOffsetY, ctaScale]);
  const getCtaBounds = useCallback(() => ctaBounds, [ctaBounds]);

  // 9. Live Ticker Tape Bounding Box
  const tickerTapeBounds = useMemo(() => {
    const h = aspectRatio === "9:16" ? 50 : 34;
    const y = compHeight - h + tickerTapeOffsetY;

    return {
      left: "0%",
      top: `${(y / compHeight) * 100}%`,
      width: "100%",
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compHeight, tickerTapeOffsetY, aspectRatio]);
  const getTickerTapeBounds = useCallback(() => tickerTapeBounds, [tickerTapeBounds]);

  // 10. Brand Logo Bounding Box
  const brandLogoBounds = useMemo(() => {
    const w = Math.round(140 * brandLogoScale);
    const h = Math.round(44 * brandLogoScale);
    const x = 36 + brandLogoOffsetX;
    const y = 40 + brandLogoOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, brandLogoOffsetX, brandLogoOffsetY, brandLogoScale]);
  const getBrandLogoBounds = useCallback(() => brandLogoBounds, [brandLogoBounds]);

  // 11. Feature Pills Bounding Box
  const featurePillsBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.76);
    const h = Math.round(130);
    const x = Math.round((compWidth - w) / 2) + featurePillsOffsetX;
    const y = Math.round(compHeight * 0.44) + featurePillsOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, featurePillsOffsetX, featurePillsOffsetY]);
  const getFeaturePillsBounds = useCallback(() => featurePillsBounds, [featurePillsBounds]);

  // 12. Review Social Proof Card Bounding Box
  const reviewCardBounds = useMemo(() => {
    const w = Math.round(compWidth * 0.82 * reviewCardScale);
    const h = Math.round(240 * reviewCardScale);
    const x = Math.round((compWidth - w) / 2) + reviewCardOffsetX;
    const y = Math.round(compHeight * 0.40) + reviewCardOffsetY;

    return {
      left: `${(x / compWidth) * 100}%`,
      top: `${(y / compHeight) * 100}%`,
      width: `${(w / compWidth) * 100}%`,
      height: `${(h / compHeight) * 100}%`,
    };
  }, [compWidth, compHeight, reviewCardOffsetX, reviewCardOffsetY, reviewCardScale]);
  const getReviewCardBounds = useCallback(() => reviewCardBounds, [reviewCardBounds]);

  return {
    avatarBounds,
    captionBounds,
    headlineBounds,
    productBounds,
    badgeBounds,
    pricePromoBounds,
    ctaBounds,
    tickerTapeBounds,
    brandLogoBounds,
    featurePillsBounds,
    reviewCardBounds,
    getAvatarBounds,
    getCaptionBounds,
    getHeadlineBounds,
    getProductBounds,
    getBadgeBounds,
    getPricePromoBounds,
    getCtaBounds,
    getTickerTapeBounds,
    getBrandLogoBounds,
    getFeaturePillsBounds,
    getReviewCardBounds,
  };
}
