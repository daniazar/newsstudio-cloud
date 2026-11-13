/**
 * src/components/editor/shared/player/layerTree/buildLayersList.tsx
 *
 * Factory function that constructs the 18 layer configuration items for EditorLayerTree,
 * wiring up custom offset calculations and fine-tuning slider controls via OffsetScaleSliders.
 */

import React from "react";
import {
  Clapperboard,
  Image as ImageIcon,
  Tag,
  MousePointerClick,
  Radio,
  QrCode,
  ShieldCheck,
  Heading,
  Type,
  MessageSquare,
  User,
  Package,
  SlidersHorizontal,
  Flame,
  ShoppingBag,
  Layers,
  Film,
} from "lucide-react";
import { isLayerCustomized } from "@/lib/ecommerce/layoutTemplates";
import { EditorLayerTreeProps, LayerItemConfig } from "./types";
import { OffsetScaleSliders } from "./OffsetScaleSliders";

export function buildLayersList(props: EditorLayerTreeProps): LayerItemConfig[] {
  const {
    introBumperVisible,
    introBumperLocked,
    onToggleIntroBumperVisible,
    onToggleIntroBumperLocked,
    introDurationFrames = 90,

    brandLogoVisible,
    brandLogoLocked,
    onToggleBrandLogoVisible,
    onToggleBrandLogoLocked,
    brandLogoOffsetX,
    brandLogoOffsetY,
    brandLogoScale,
    onUpdateBrandLogoOffsets,
    onResetBrandLogo,

    pricePromoVisible,
    pricePromoLocked,
    onTogglePricePromoVisible,
    onTogglePricePromoLocked,
    pricePromoOffsetX,
    pricePromoOffsetY,
    pricePromoScale,
    onUpdatePricePromoOffsets,
    onResetPricePromo,

    ctaVisible,
    ctaLocked,
    onToggleCtaVisible,
    onToggleCtaLocked,
    ctaOffsetX,
    ctaOffsetY,
    ctaScale,
    onUpdateCtaOffsets,
    onResetCta,

    tickerTapeVisible,
    tickerTapeLocked,
    onToggleTickerTapeVisible,
    onToggleTickerTapeLocked,
    tickerTapeOffsetY,
    onUpdateTickerTapeOffsets,
    onResetTickerTape,

    qrCodeVisible,
    qrCodeLocked,
    onToggleQrCodeVisible,
    onToggleQrCodeLocked,

    showBadgeLayer,
    badgeVisible,
    badgeLocked,
    onToggleBadgeVisible,
    onToggleBadgeLocked,
    badgeOffsetX,
    badgeOffsetY,
    onUpdateBadgeOffsets,
    onResetBadge,

    headlineVisible,
    headlineLocked,
    onToggleHeadlineVisible,
    onToggleHeadlineLocked,
    headlineOffsetX,
    headlineOffsetY,
    headlineText = "Headline",
    onUpdateHeadlineOffsets,
    onResetHeadline,

    captionVisible,
    captionLocked,
    onToggleCaptionVisible,
    onToggleCaptionLocked,
    captionOffsetX,
    captionOffsetY,
    onUpdateCaptionOffsets,
    onResetCaption,

    featurePillsVisible,
    featurePillsLocked,
    onToggleFeaturePillsVisible,
    onToggleFeaturePillsLocked,
    featurePillsOffsetX,
    featurePillsOffsetY,
    onUpdateFeaturePillsOffsets,
    onResetFeaturePills,

    reviewCardVisible,
    reviewCardLocked,
    onToggleReviewCardVisible,
    onToggleReviewCardLocked,
    reviewCardOffsetX,
    reviewCardOffsetY,
    reviewCardScale,
    onUpdateReviewCardOffsets,
    onResetReviewCard,

    avatarVisible,
    avatarLocked,
    onToggleAvatarVisible,
    onToggleAvatarLocked,
    avatarOffsetX,
    avatarOffsetY,
    avatarScale,
    avatarName = "Avatar",
    onUpdateAvatarOffsets,
    onResetAvatar,

    productVisible,
    productLocked,
    onToggleProductVisible,
    onToggleProductLocked,
    productOffsetX = 0,
    productOffsetY = 0,
    productScale = 1.0,
    productTitle = "Product",
    onUpdateProductOffsets,
    onResetProduct,

    usVsThemVisible,
    usVsThemLocked,
    onToggleUsVsThemVisible,
    onToggleUsVsThemLocked,

    flashSaleVisible,
    flashSaleLocked,
    onToggleFlashSaleVisible,
    onToggleFlashSaleLocked,

    socialPopupVisible,
    socialPopupLocked,
    onToggleSocialPopupVisible,
    onToggleSocialPopupLocked,

    outroEndCardVisible,
    outroEndCardLocked,
    onToggleOutroEndCardVisible,
    onToggleOutroEndCardLocked,
    outroDurationFrames = 90,

    backdropVisible,
    backdropLocked,
    onToggleBackdropVisible,
    onToggleBackdropLocked,
  } = props;

  if (props.mode === "broadcast") {
    return [
      {
        id: "introBumper",
        name: "Intro Hook Bumper",
        icon: Clapperboard,
        color: "text-cyan-400",
        visible: introBumperVisible,
        locked: introBumperLocked,
        onToggleVisible: onToggleIntroBumperVisible || (() => {}),
        onToggleLocked: onToggleIntroBumperLocked,
        hasDetails: false,
        coords: `${(introDurationFrames / 30).toFixed(1)}s Hook`,
      },
      {
        id: "brandLogo",
        name: "Brand Logo (Top-Left)",
        icon: ImageIcon,
        color: "text-blue-400",
        visible: brandLogoVisible,
        locked: brandLogoLocked,
        onToggleVisible: onToggleBrandLogoVisible || (() => {}),
        onToggleLocked: onToggleBrandLogoLocked,
        hasDetails: true,
        coords: `X:${brandLogoOffsetX ?? 0} Y:${brandLogoOffsetY ?? 0} • ${Math.round(
          (brandLogoScale ?? 1.0) * 100
        )}%`,
        onReset: onResetBrandLogo,
        hasCustomOffsets: isLayerCustomized("brandLogo", {
          offsetX: brandLogoOffsetX,
          offsetY: brandLogoOffsetY,
          scale: brandLogoScale,
        }),
        renderControls: () => (
          <OffsetScaleSliders
            offsetX={brandLogoOffsetX}
            onUpdateOffsetX={(x) => onUpdateBrandLogoOffsets?.({ offsetX: x })}
            offsetY={brandLogoOffsetY}
            onUpdateOffsetY={(y) => onUpdateBrandLogoOffsets?.({ offsetY: y })}
            scale={brandLogoScale}
            onUpdateScale={(s) => onUpdateBrandLogoOffsets?.({ scale: s })}
            accentColor="accent-blue-400"
          />
        ),
      },
      {
        id: "badge",
        name: "Verified Trust Badge",
        icon: ShieldCheck,
        color: "text-emerald-400",
        visible: badgeVisible,
        locked: badgeLocked,
        onToggleVisible: onToggleBadgeVisible || (() => {}),
        onToggleLocked: onToggleBadgeLocked,
        hasDetails: true,
        coords: `X:${badgeOffsetX ?? 0} Y:${badgeOffsetY ?? 0}`,
        onReset: onResetBadge || (() => {}),
        hasCustomOffsets: isLayerCustomized("badge", {
          offsetX: badgeOffsetX,
          offsetY: badgeOffsetY,
        }),
        renderControls: () => (
          <OffsetScaleSliders
            offsetX={badgeOffsetX}
            onUpdateOffsetX={(x) => onUpdateBadgeOffsets?.({ offsetX: x })}
            offsetY={badgeOffsetY}
            onUpdateOffsetY={(y) => onUpdateBadgeOffsets?.({ offsetY: y })}
            accentColor="accent-emerald-400"
          />
        ),
      },
      {
        id: "headline",
        name: `Headline: "${headlineText.slice(0, 16)}${headlineText.length > 16 ? "..." : ""}"`,
        icon: Heading,
        color: "text-blue-400",
        visible: headlineVisible,
        locked: headlineLocked,
        onToggleVisible: onToggleHeadlineVisible,
        onToggleLocked: onToggleHeadlineLocked,
        hasDetails: true,
        coords: `X:${headlineOffsetX} Y:${headlineOffsetY}`,
        onReset: onResetHeadline,
        hasCustomOffsets: isLayerCustomized("headline", {
          offsetX: headlineOffsetX,
          offsetY: headlineOffsetY,
        }),
        renderControls: () => (
          <OffsetScaleSliders
            offsetX={headlineOffsetX}
            onUpdateOffsetX={(x) => onUpdateHeadlineOffsets?.({ offsetX: x })}
            offsetY={headlineOffsetY}
            onUpdateOffsetY={(y) => onUpdateHeadlineOffsets?.({ offsetY: y })}
            accentColor="accent-blue-400"
          />
        ),
      },
      {
        id: "caption",
        name: "Spoken Subtitles",
        icon: Type,
        color: "text-yellow-400",
        visible: captionVisible,
        locked: captionLocked,
        onToggleVisible: onToggleCaptionVisible,
        onToggleLocked: onToggleCaptionLocked,
        hasDetails: true,
        coords: `X:${captionOffsetX} Y:${captionOffsetY}`,
        onReset: onResetCaption,
        hasCustomOffsets: isLayerCustomized("caption", {
          offsetX: captionOffsetX,
          offsetY: captionOffsetY,
        }),
        renderControls: () => (
          <OffsetScaleSliders
            offsetX={captionOffsetX}
            onUpdateOffsetX={(x) => onUpdateCaptionOffsets?.({ offsetX: x })}
            offsetY={captionOffsetY}
            onUpdateOffsetY={(y) => onUpdateCaptionOffsets?.({ offsetY: y })}
            accentColor="accent-yellow-400"
          />
        ),
      },
      {
        id: "tickerTape",
        name: "Live Ticker Tape",
        icon: Radio,
        color: "text-cyan-400",
        visible: tickerTapeVisible,
        locked: tickerTapeLocked,
        onToggleVisible: onToggleTickerTapeVisible || (() => {}),
        onToggleLocked: onToggleTickerTapeLocked,
        hasDetails: true,
        coords: `Y:${tickerTapeOffsetY ?? 0}`,
        onReset: onResetTickerTape,
        hasCustomOffsets: isLayerCustomized("tickerTape", {
          offsetY: tickerTapeOffsetY,
        }),
        renderControls: () => (
          <OffsetScaleSliders
            offsetY={tickerTapeOffsetY}
            onUpdateOffsetY={(y) => onUpdateTickerTapeOffsets?.({ offsetY: y })}
            minY={-200}
            maxY={200}
            stepY={2}
            accentColor="accent-cyan-400"
          />
        ),
      },
      {
        id: "avatar",
        name: avatarName,
        icon: User,
        color: "text-emerald-400",
        visible: avatarVisible,
        locked: avatarLocked,
        onToggleVisible: onToggleAvatarVisible,
        onToggleLocked: onToggleAvatarLocked,
        hasDetails: true,
        coords: `X:${avatarOffsetX} Y:${avatarOffsetY} • ${Math.round(avatarScale * 100)}%`,
        onReset: onResetAvatar,
        hasCustomOffsets: isLayerCustomized("avatar", {
          offsetX: avatarOffsetX,
          offsetY: avatarOffsetY,
          scale: avatarScale,
        }),
        renderControls: () => (
          <OffsetScaleSliders
            offsetX={avatarOffsetX}
            onUpdateOffsetX={(x) => onUpdateAvatarOffsets({ offsetX: x })}
            offsetY={avatarOffsetY}
            onUpdateOffsetY={(y) => onUpdateAvatarOffsets({ offsetY: y })}
            scale={avatarScale}
            onUpdateScale={(s) => onUpdateAvatarOffsets({ scale: s })}
            minScale={0.4}
            maxScale={3.0}
            accentColor="accent-emerald-400"
          />
        ),
      },
      {
        id: "backdrop",
        name: "Background & Set / B-Roll",
        icon: Layers,
        color: "text-zinc-400",
        visible: backdropVisible,
        locked: backdropLocked,
        onToggleVisible: onToggleBackdropVisible || (() => {}),
        onToggleLocked: onToggleBackdropLocked,
        hasDetails: false,
        coords: "Full-Bleed Stage",
      },
      {
        id: "outroEndCard",
        name: "Broadcast Outro & Sign-Off",
        icon: Film,
        color: "text-purple-400",
        visible: outroEndCardVisible,
        locked: outroEndCardLocked,
        onToggleVisible: onToggleOutroEndCardVisible || (() => {}),
        onToggleLocked: onToggleOutroEndCardLocked,
        hasDetails: false,
        coords: `${(outroDurationFrames / 30).toFixed(1)}s Sign-Off`,
      },
    ];
  }

  const list: LayerItemConfig[] = [
    {
      id: "introBumper",
      name: "Intro Hook Bumper",
      icon: Clapperboard,
      color: "text-cyan-400",
      visible: introBumperVisible,
      locked: introBumperLocked,
      onToggleVisible: onToggleIntroBumperVisible || (() => {}),
      onToggleLocked: onToggleIntroBumperLocked,
      hasDetails: false,
      coords: `${(introDurationFrames / 30).toFixed(1)}s Hook`,
    },
    {
      id: "brandLogo",
      name: "Brand Logo (Top-Left)",
      icon: ImageIcon,
      color: "text-blue-400",
      visible: brandLogoVisible,
      locked: brandLogoLocked,
      onToggleVisible: onToggleBrandLogoVisible || (() => {}),
      onToggleLocked: onToggleBrandLogoLocked,
      hasDetails: true,
      coords: `X:${brandLogoOffsetX ?? 0} Y:${brandLogoOffsetY ?? 0} • ${Math.round(
        (brandLogoScale ?? 1.0) * 100
      )}%`,
      onReset: onResetBrandLogo,
      hasCustomOffsets: isLayerCustomized("brandLogo", {
        offsetX: brandLogoOffsetX,
        offsetY: brandLogoOffsetY,
        scale: brandLogoScale,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={brandLogoOffsetX}
          onUpdateOffsetX={(x) => onUpdateBrandLogoOffsets?.({ offsetX: x })}
          offsetY={brandLogoOffsetY}
          onUpdateOffsetY={(y) => onUpdateBrandLogoOffsets?.({ offsetY: y })}
          scale={brandLogoScale}
          onUpdateScale={(s) => onUpdateBrandLogoOffsets?.({ scale: s })}
          accentColor="accent-blue-400"
        />
      ),
    },
    {
      id: "pricePromo",
      name: "Price & Promo Outro",
      icon: Tag,
      color: "text-amber-400",
      visible: pricePromoVisible,
      locked: pricePromoLocked,
      onToggleVisible: onTogglePricePromoVisible || (() => {}),
      onToggleLocked: onTogglePricePromoLocked,
      hasDetails: true,
      coords: `X:${pricePromoOffsetX ?? 0} Y:${pricePromoOffsetY ?? 0} • ${Math.round(
        (pricePromoScale ?? 1.0) * 100
      )}%`,
      onReset: onResetPricePromo,
      hasCustomOffsets: isLayerCustomized("pricePromo", {
        offsetX: pricePromoOffsetX,
        offsetY: pricePromoOffsetY,
        scale: pricePromoScale,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={pricePromoOffsetX}
          onUpdateOffsetX={(x) => onUpdatePricePromoOffsets?.({ offsetX: x })}
          offsetY={pricePromoOffsetY}
          onUpdateOffsetY={(y) => onUpdatePricePromoOffsets?.({ offsetY: y })}
          scale={pricePromoScale}
          onUpdateScale={(s) => onUpdatePricePromoOffsets?.({ scale: s })}
          accentColor="accent-rose-400"
        />
      ),
    },
    {
      id: "ctaButton",
      name: "Call To Action (CTA)",
      icon: MousePointerClick,
      color: "text-amber-400",
      visible: ctaVisible,
      locked: ctaLocked,
      onToggleVisible: onToggleCtaVisible || (() => {}),
      onToggleLocked: onToggleCtaLocked,
      hasDetails: true,
      coords: `X:${ctaOffsetX ?? 0} Y:${ctaOffsetY ?? 0} • ${Math.round(
        (ctaScale ?? 1.0) * 100
      )}%`,
      onReset: onResetCta,
      hasCustomOffsets: isLayerCustomized("ctaButton", {
        offsetX: ctaOffsetX,
        offsetY: ctaOffsetY,
        scale: ctaScale,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={ctaOffsetX}
          onUpdateOffsetX={(x) => onUpdateCtaOffsets?.({ offsetX: x })}
          offsetY={ctaOffsetY}
          onUpdateOffsetY={(y) => onUpdateCtaOffsets?.({ offsetY: y })}
          scale={ctaScale}
          onUpdateScale={(s) => onUpdateCtaOffsets?.({ scale: s })}
          accentColor="accent-amber-400"
        />
      ),
    },
    {
      id: "tickerTape",
      name: "Live Ticker Tape",
      icon: Radio,
      color: "text-cyan-400",
      visible: tickerTapeVisible,
      locked: tickerTapeLocked,
      onToggleVisible: onToggleTickerTapeVisible || (() => {}),
      onToggleLocked: onToggleTickerTapeLocked,
      hasDetails: true,
      coords: `Y:${tickerTapeOffsetY ?? 0}`,
      onReset: onResetTickerTape,
      hasCustomOffsets: isLayerCustomized("tickerTape", {
        offsetY: tickerTapeOffsetY,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetY={tickerTapeOffsetY}
          onUpdateOffsetY={(y) => onUpdateTickerTapeOffsets?.({ offsetY: y })}
          minY={-200}
          maxY={200}
          stepY={2}
          accentColor="accent-cyan-400"
        />
      ),
    },
    {
      id: "qrCode",
      name: "QR Code Bug",
      icon: QrCode,
      color: "text-amber-400",
      visible: qrCodeVisible,
      locked: qrCodeLocked,
      onToggleVisible: onToggleQrCodeVisible || (() => {}),
      onToggleLocked: onToggleQrCodeLocked,
      hasDetails: false,
    },
  ];

  if (showBadgeLayer) {
    list.push({
      id: "badge",
      name: "Verified Trust Badge",
      icon: ShieldCheck,
      color: "text-emerald-400",
      visible: badgeVisible,
      locked: badgeLocked,
      onToggleVisible: onToggleBadgeVisible || (() => {}),
      onToggleLocked: onToggleBadgeLocked,
      hasDetails: true,
      coords: `X:${badgeOffsetX ?? 0} Y:${badgeOffsetY ?? 0}`,
      onReset: onResetBadge || (() => {}),
      hasCustomOffsets: isLayerCustomized("badge", {
        offsetX: badgeOffsetX,
        offsetY: badgeOffsetY,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={badgeOffsetX}
          onUpdateOffsetX={(x) => onUpdateBadgeOffsets?.({ offsetX: x })}
          offsetY={badgeOffsetY}
          onUpdateOffsetY={(y) => onUpdateBadgeOffsets?.({ offsetY: y })}
          accentColor="accent-emerald-400"
        />
      ),
    });
  }

  list.push(
    {
      id: "headline",
      name: `Headline: "${headlineText.slice(0, 16)}${headlineText.length > 16 ? "..." : ""}"`,
      icon: Heading,
      color: "text-blue-400",
      visible: headlineVisible,
      locked: headlineLocked,
      onToggleVisible: onToggleHeadlineVisible,
      onToggleLocked: onToggleHeadlineLocked,
      hasDetails: true,
      coords: `X:${headlineOffsetX} Y:${headlineOffsetY}`,
      onReset: onResetHeadline,
      hasCustomOffsets: isLayerCustomized("headline", {
        offsetX: headlineOffsetX,
        offsetY: headlineOffsetY,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={headlineOffsetX}
          onUpdateOffsetX={(x) => onUpdateHeadlineOffsets?.({ offsetX: x })}
          offsetY={headlineOffsetY}
          onUpdateOffsetY={(y) => onUpdateHeadlineOffsets?.({ offsetY: y })}
          accentColor="accent-blue-400"
        />
      ),
    },
    {
      id: "caption",
      name: "Spoken Subtitles",
      icon: Type,
      color: "text-yellow-400",
      visible: captionVisible,
      locked: captionLocked,
      onToggleVisible: onToggleCaptionVisible,
      onToggleLocked: onToggleCaptionLocked,
      hasDetails: true,
      coords: `X:${captionOffsetX} Y:${captionOffsetY}`,
      onReset: onResetCaption,
      hasCustomOffsets: isLayerCustomized("caption", {
        offsetX: captionOffsetX,
        offsetY: captionOffsetY,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={captionOffsetX}
          onUpdateOffsetX={(x) => onUpdateCaptionOffsets?.({ offsetX: x })}
          offsetY={captionOffsetY}
          onUpdateOffsetY={(y) => onUpdateCaptionOffsets?.({ offsetY: y })}
          accentColor="accent-yellow-400"
        />
      ),
    },
    {
      id: "featurePills",
      name: "Feature Specs & Pills",
      icon: Tag,
      color: "text-emerald-400",
      visible: featurePillsVisible,
      locked: featurePillsLocked,
      onToggleVisible: onToggleFeaturePillsVisible || (() => {}),
      onToggleLocked: onToggleFeaturePillsLocked,
      hasDetails: true,
      coords: `X:${featurePillsOffsetX ?? 0} Y:${featurePillsOffsetY ?? 0}`,
      onReset: onResetFeaturePills,
      hasCustomOffsets: isLayerCustomized("featurePills", {
        offsetX: featurePillsOffsetX,
        offsetY: featurePillsOffsetY,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={featurePillsOffsetX}
          onUpdateOffsetX={(x) => onUpdateFeaturePillsOffsets?.({ offsetX: x })}
          offsetY={featurePillsOffsetY}
          onUpdateOffsetY={(y) => onUpdateFeaturePillsOffsets?.({ offsetY: y })}
          accentColor="accent-emerald-400"
        />
      ),
    },
    {
      id: "reviewCard",
      name: "Customer Review Card",
      icon: MessageSquare,
      color: "text-amber-400",
      visible: reviewCardVisible,
      locked: reviewCardLocked,
      onToggleVisible: onToggleReviewCardVisible || (() => {}),
      onToggleLocked: onToggleReviewCardLocked,
      hasDetails: true,
      coords: `X:${reviewCardOffsetX ?? 0} Y:${reviewCardOffsetY ?? 0} • ${Math.round(
        (reviewCardScale ?? 1.0) * 100
      )}%`,
      onReset: onResetReviewCard,
      hasCustomOffsets: isLayerCustomized("reviewCard", {
        offsetX: reviewCardOffsetX,
        offsetY: reviewCardOffsetY,
        scale: reviewCardScale,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={reviewCardOffsetX}
          onUpdateOffsetX={(x) => onUpdateReviewCardOffsets?.({ offsetX: x })}
          offsetY={reviewCardOffsetY}
          onUpdateOffsetY={(y) => onUpdateReviewCardOffsets?.({ offsetY: y })}
          scale={reviewCardScale}
          onUpdateScale={(s) => onUpdateReviewCardOffsets?.({ scale: s })}
          accentColor="accent-amber-400"
        />
      ),
    },
    {
      id: "avatar",
      name: avatarName,
      icon: User,
      color: "text-emerald-400",
      visible: avatarVisible,
      locked: avatarLocked,
      onToggleVisible: onToggleAvatarVisible,
      onToggleLocked: onToggleAvatarLocked,
      hasDetails: true,
      coords: `X:${avatarOffsetX} Y:${avatarOffsetY} • ${Math.round(avatarScale * 100)}%`,
      onReset: onResetAvatar,
      hasCustomOffsets: isLayerCustomized("avatar", {
        offsetX: avatarOffsetX,
        offsetY: avatarOffsetY,
        scale: avatarScale,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={avatarOffsetX}
          onUpdateOffsetX={(x) => onUpdateAvatarOffsets({ offsetX: x })}
          offsetY={avatarOffsetY}
          onUpdateOffsetY={(y) => onUpdateAvatarOffsets({ offsetY: y })}
          scale={avatarScale}
          onUpdateScale={(s) => onUpdateAvatarOffsets({ scale: s })}
          minScale={0.4}
          maxScale={3.0}
          accentColor="accent-emerald-400"
        />
      ),
    },
    {
      id: "product",
      name: `3D Hero: "${productTitle.slice(0, 14)}${productTitle.length > 14 ? "..." : ""}"`,
      icon: Package,
      color: "text-cyan-400",
      visible: productVisible,
      locked: productLocked,
      onToggleVisible: onToggleProductVisible || (() => {}),
      onToggleLocked: onToggleProductLocked,
      hasDetails: true,
      coords: `X:${productOffsetX} Y:${productOffsetY} • ${Math.round(productScale * 100)}%`,
      onReset: onResetProduct,
      hasCustomOffsets: isLayerCustomized("product", {
        offsetX: productOffsetX,
        offsetY: productOffsetY,
        scale: productScale,
      }),
      renderControls: () => (
        <OffsetScaleSliders
          offsetX={productOffsetX}
          onUpdateOffsetX={(x) => onUpdateProductOffsets?.({ offsetX: x })}
          offsetY={productOffsetY}
          onUpdateOffsetY={(y) => onUpdateProductOffsets?.({ offsetY: y })}
          scale={productScale}
          onUpdateScale={(s) => onUpdateProductOffsets?.({ scale: s })}
          minScale={0.4}
          maxScale={3.0}
          accentColor="accent-cyan-400"
        />
      ),
    },
    {
      id: "usVsThem",
      name: "Us vs. Them Comparison",
      icon: SlidersHorizontal,
      color: "text-indigo-400",
      visible: usVsThemVisible,
      locked: usVsThemLocked,
      onToggleVisible: onToggleUsVsThemVisible || (() => {}),
      onToggleLocked: onToggleUsVsThemLocked,
      hasDetails: false,
      coords: "Battle Grid 50/50",
    },
    {
      id: "flashSale",
      name: "Flash Sale Urgency",
      icon: Flame,
      color: "text-orange-400",
      visible: flashSaleVisible,
      locked: flashSaleLocked,
      onToggleVisible: onToggleFlashSaleVisible || (() => {}),
      onToggleLocked: onToggleFlashSaleLocked,
      hasDetails: false,
      coords: "Countdown Urgency",
    },
    {
      id: "socialPopup",
      name: "Social Proof Popup",
      icon: MessageSquare,
      color: "text-pink-400",
      visible: socialPopupVisible,
      locked: socialPopupLocked,
      onToggleVisible: onToggleSocialPopupVisible || (() => {}),
      onToggleLocked: onToggleSocialPopupLocked,
      hasDetails: false,
      coords: "Toast Stagger",
    },
    {
      id: "outroEndCard",
      name: "Commercial Outro End-Card",
      icon: ShoppingBag,
      color: "text-emerald-400",
      visible: outroEndCardVisible,
      locked: outroEndCardLocked,
      onToggleVisible: onToggleOutroEndCardVisible || (() => {}),
      onToggleLocked: onToggleOutroEndCardLocked,
      hasDetails: false,
      coords: `${(outroDurationFrames / 30).toFixed(1)}s CTA`,
    },
    {
      id: "backdrop",
      name: "Background & Set / Veo",
      icon: Layers,
      color: "text-zinc-400",
      visible: backdropVisible,
      locked: backdropLocked,
      onToggleVisible: onToggleBackdropVisible || (() => {}),
      onToggleLocked: onToggleBackdropLocked,
      hasDetails: false,
      coords: "Full-Bleed Stage",
    }
  );

  return list;
}
