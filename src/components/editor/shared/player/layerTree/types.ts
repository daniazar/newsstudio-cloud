/**
 * src/components/editor/shared/player/layerTree/types.ts
 *
 * Types and interfaces for the EditorLayerTree component and subcomponents.
 */

import React from "react";

export type EditorLayerId =
  | "introBumper"
  | "brandLogo"
  | "badge"
  | "headline"
  | "caption"
  | "featurePills"
  | "reviewCard"
  | "avatar"
  | "product"
  | "pricePromo"
  | "ctaButton"
  | "tickerTape"
  | "qrCode"
  | "usVsThem"
  | "flashSale"
  | "socialPopup"
  | "outroEndCard"
  | "backdrop";

export interface EditorLayerTreeProps {
  mode?: "ecommerce" | "broadcast";
  selectedLayer: EditorLayerId;
  onSelectLayer: (layerId: EditorLayerId) => void;
  isOpen: boolean;
  onToggleOpen: () => void;

  // Integral Layout & Global Position Controls
  onResetAllPositions?: () => void;
  activeTemplateId?: string;
  onApplyLayoutTemplate?: (templateId: string) => void;

  // Commercial Intro Bumper
  introBumperVisible?: boolean;
  onToggleIntroBumperVisible?: () => void;
  introBumperLocked?: boolean;
  onToggleIntroBumperLocked?: () => void;
  introDurationFrames?: number;

  // Brand Logo (Top-Left)
  brandLogoVisible?: boolean;
  onToggleBrandLogoVisible?: () => void;
  brandLogoLocked?: boolean;
  onToggleBrandLogoLocked?: () => void;
  brandLogoOffsetX?: number;
  brandLogoOffsetY?: number;
  brandLogoScale?: number;
  onUpdateBrandLogoOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetBrandLogo?: () => void;

  // Avatar / Presenter
  avatarVisible: boolean;
  onToggleAvatarVisible: () => void;
  avatarLocked?: boolean;
  onToggleAvatarLocked?: () => void;
  avatarOffsetX: number;
  avatarOffsetY: number;
  avatarScale: number;
  avatarName?: string;
  onUpdateAvatarOffsets: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetAvatar: () => void;

  // Subtitles / Captions
  captionVisible: boolean;
  onToggleCaptionVisible: () => void;
  captionLocked?: boolean;
  onToggleCaptionLocked?: () => void;
  captionOffsetX: number;
  captionOffsetY: number;
  onUpdateCaptionOffsets: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetCaption: () => void;

  // Headline
  headlineVisible: boolean;
  onToggleHeadlineVisible: () => void;
  headlineLocked?: boolean;
  onToggleHeadlineLocked?: () => void;
  headlineOffsetX: number;
  headlineOffsetY: number;
  headlineText?: string;
  onUpdateHeadlineOffsets: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetHeadline: () => void;

  // 3D Product Visual
  productVisible?: boolean;
  onToggleProductVisible?: () => void;
  productLocked?: boolean;
  onToggleProductLocked?: () => void;
  productOffsetX?: number;
  productOffsetY?: number;
  productScale?: number;
  productTitle?: string;
  onUpdateProductOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetProduct?: () => void;

  // Feature Pills Layer
  featurePillsVisible?: boolean;
  onToggleFeaturePillsVisible?: () => void;
  featurePillsLocked?: boolean;
  onToggleFeaturePillsLocked?: () => void;
  featurePillsOffsetX?: number;
  featurePillsOffsetY?: number;
  onUpdateFeaturePillsOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetFeaturePills?: () => void;

  // Customer Review Card
  reviewCardVisible?: boolean;
  onToggleReviewCardVisible?: () => void;
  reviewCardLocked?: boolean;
  onToggleReviewCardLocked?: () => void;
  reviewCardOffsetX?: number;
  reviewCardOffsetY?: number;
  reviewCardScale?: number;
  onUpdateReviewCardOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetReviewCard?: () => void;

  // Verified Spec Badge
  showBadgeLayer?: boolean;
  badgeVisible?: boolean;
  onToggleBadgeVisible?: () => void;
  badgeLocked?: boolean;
  onToggleBadgeLocked?: () => void;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  onUpdateBadgeOffsets?: (patch: { offsetX?: number; offsetY?: number }) => void;
  onResetBadge?: () => void;

  // QR Code
  qrCodeVisible?: boolean;
  onToggleQrCodeVisible?: () => void;
  qrCodeLocked?: boolean;
  onToggleQrCodeLocked?: () => void;

  // Price & Promo Outro Badge
  pricePromoVisible?: boolean;
  onTogglePricePromoVisible?: () => void;
  pricePromoLocked?: boolean;
  onTogglePricePromoLocked?: () => void;
  pricePromoOffsetX?: number;
  pricePromoOffsetY?: number;
  pricePromoScale?: number;
  onUpdatePricePromoOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetPricePromo?: () => void;

  // Call To Action (CTA) Button
  ctaVisible?: boolean;
  onToggleCtaVisible?: () => void;
  ctaLocked?: boolean;
  onToggleCtaLocked?: () => void;
  ctaOffsetX?: number;
  ctaOffsetY?: number;
  ctaScale?: number;
  onUpdateCtaOffsets?: (patch: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onResetCta?: () => void;

  // Bottom Ticker Tape
  tickerTapeVisible?: boolean;
  onToggleTickerTapeVisible?: () => void;
  tickerTapeLocked?: boolean;
  onToggleTickerTapeLocked?: () => void;
  tickerTapeOffsetY?: number;
  onUpdateTickerTapeOffsets?: (patch: { offsetY?: number }) => void;
  onResetTickerTape?: () => void;

  // Us vs Them Battle Card
  usVsThemVisible?: boolean;
  onToggleUsVsThemVisible?: () => void;
  usVsThemLocked?: boolean;
  onToggleUsVsThemLocked?: () => void;

  // Flash Sale Urgency
  flashSaleVisible?: boolean;
  onToggleFlashSaleVisible?: () => void;
  flashSaleLocked?: boolean;
  onToggleFlashSaleLocked?: () => void;

  // Social Proof Popup
  socialPopupVisible?: boolean;
  onToggleSocialPopupVisible?: () => void;
  socialPopupLocked?: boolean;
  onToggleSocialPopupLocked?: () => void;

  // Commercial Outro End-Card
  outroEndCardVisible?: boolean;
  onToggleOutroEndCardVisible?: () => void;
  outroEndCardLocked?: boolean;
  onToggleOutroEndCardLocked?: () => void;
  outroDurationFrames?: number;

  // Backdrop
  backdropVisible?: boolean;
  onToggleBackdropVisible?: () => void;
  backdropLocked?: boolean;
  onToggleBackdropLocked?: () => void;

  // Context-Aware Filtering
  selectedSceneIndex?: number | null;
  currentSceneType?: string;
  hasVoiceoverScript?: boolean;
  isAvatarHiddenOnScene?: boolean;
  hasReviewCard?: boolean;
  hasPricePromo?: boolean;
  hasFeaturePills?: boolean;
}

export interface LayerItemConfig {
  id: EditorLayerId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  visible?: boolean;
  locked?: boolean;
  onToggleVisible: () => void;
  onToggleLocked?: () => void;
  hasDetails: boolean;
  coords?: string;
  onReset?: () => void;
  hasCustomOffsets?: boolean;
  renderControls?: () => React.ReactNode;
}
