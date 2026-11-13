/**
 * src/components/editor/shared/player/gizmo/types.ts
 *
 * Shared types, interfaces, and drag actions for EditorCanvasGizmo.
 */

import { EditorLayerId } from "../layerTree/types";

export type SelectedGizmoElement = EditorLayerId | "none";

export type DragAction =
  | "none"
  | "move_avatar"
  | "scale_avatar_nw"
  | "scale_avatar_ne"
  | "scale_avatar_se"
  | "scale_avatar_sw"
  | "move_caption"
  | "move_headline"
  | "move_product"
  | "scale_product_nw"
  | "scale_product_ne"
  | "scale_product_se"
  | "scale_product_sw"
  | "move_badge"
  | "move_pricePromo"
  | "scale_pricePromo_nw"
  | "scale_pricePromo_se"
  | "move_ctaButton"
  | "scale_ctaButton_nw"
  | "scale_ctaButton_se"
  | "move_tickerTape"
  | "move_brandLogo"
  | "scale_brandLogo_nw"
  | "scale_brandLogo_se"
  | "move_featurePills"
  | "move_reviewCard"
  | "scale_reviewCard_nw"
  | "scale_reviewCard_se";

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EditorCanvasGizmoProps {
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5" | string;
  selectedElement?: SelectedGizmoElement;
  onSelectElement?: (element: SelectedGizmoElement) => void;
  enabled?: boolean;

  // Presenter / Avatar
  presenter?: {
    enabled?: boolean;
    personaId?: string;
    presenterName?: string;
    position?: string;
    layoutMode?: string;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  } | null;
  avatarVisible?: boolean;
  avatarLocked?: boolean;
  onUpdatePresenter?: (patch: {
    offsetX?: number;
    offsetY?: number;
    scale?: number;
  }) => void;
  onResetPresenter?: () => void;

  // Subtitles / Captions
  captionVisible?: boolean;
  captionLocked?: boolean;
  captionText?: string;
  captionOffsetX?: number;
  captionOffsetY?: number;
  captionPlacement?: "top" | "center" | "bottom" | "auto";
  onUpdateCaptionOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetCaptionOffsets?: () => void;

  // Headline
  headlineVisible?: boolean;
  headlineLocked?: boolean;
  headlineText?: string;
  headlineOffsetX?: number;
  headlineOffsetY?: number;
  onUpdateHeadlineOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetHeadlineOffsets?: () => void;

  // 3D Product Visual
  productVisible?: boolean;
  productLocked?: boolean;
  productTitle?: string;
  productOffsetX?: number;
  productOffsetY?: number;
  productScale?: number;
  onUpdateProductOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetProductOffsets?: () => void;

  // Verified Spec Badge
  badgeVisible?: boolean;
  badgeLocked?: boolean;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  onUpdateBadgeOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetBadgeOffsets?: () => void;

  // Price & Promo Badge
  pricePromoVisible?: boolean;
  pricePromoLocked?: boolean;
  pricePromoOffsetX?: number;
  pricePromoOffsetY?: number;
  pricePromoScale?: number;
  onUpdatePricePromoOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetPricePromoOffsets?: () => void;

  // Call To Action (CTA) Button
  ctaVisible?: boolean;
  ctaLocked?: boolean;
  ctaOffsetX?: number;
  ctaOffsetY?: number;
  ctaScale?: number;
  onUpdateCtaOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetCtaOffsets?: () => void;

  // Bottom Ticker Tape
  tickerTapeVisible?: boolean;
  tickerTapeLocked?: boolean;
  tickerTapeOffsetY?: number;
  onUpdateTickerTapeOffsets?: (patch: { offsetY?: number }) => void;
  onResetTickerTapeOffsets?: () => void;

  // QR Code
  qrCodeVisible?: boolean;
  qrCodeLocked?: boolean;

  // Brand Logo
  brandLogoVisible?: boolean;
  brandLogoLocked?: boolean;
  brandLogoOffsetX?: number;
  brandLogoOffsetY?: number;
  brandLogoScale?: number;
  onUpdateBrandLogoOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetBrandLogoOffsets?: () => void;

  // Feature Pills
  featurePillsVisible?: boolean;
  featurePillsLocked?: boolean;
  featurePillsOffsetX?: number;
  featurePillsOffsetY?: number;
  onUpdateFeaturePillsOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetFeaturePillsOffsets?: () => void;

  // Review Social Proof Card
  reviewCardVisible?: boolean;
  reviewCardLocked?: boolean;
  reviewCardOffsetX?: number;
  reviewCardOffsetY?: number;
  reviewCardScale?: number;
  onUpdateReviewCardOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetReviewCardOffsets?: () => void;

  // Commit on mouse release
  onCommitChanges?: () => void;
}
