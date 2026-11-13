/**
 * src/components/editor/shared/player/EditorCanvasGizmo.tsx
 *
 * Interactive On-Canvas Bounding Box & Gizmo Transformer Overlay.
 * Allows direct manipulation (drag to reposition, double-click to reset)
 * of presenter avatars, subtitles, headlines, 3D products, CTAs, stickers,
 * ticker tapes, and review badges directly on the player viewport.
 */

import React, { useRef, useState } from "react";
import {
  Move,
  User,
  Type,
  Heading,
  Package,
  Award,
  Tag,
  MousePointerClick,
  Radio,
  Building2,
  ListFilter,
  Star,
} from "lucide-react";
import {
  SelectedGizmoElement,
  DragAction,
  BoundingBox,
  EditorCanvasGizmoProps,
} from "./gizmo/types";
import { useGizmoBounds } from "./gizmo/useGizmoBounds";
import { useGizmoPointerDrag } from "./gizmo/useGizmoPointerDrag";
import { GizmoBoundingBoxOverlay } from "./gizmo/GizmoBoundingBoxOverlay";

export type { SelectedGizmoElement, DragAction, BoundingBox, EditorCanvasGizmoProps };

function EditorCanvasGizmoComponent({
  aspectRatio = "9:16",
  selectedElement: controlledSelectedElement,
  onSelectElement,
  enabled = true,
  presenter,
  avatarVisible = true,
  avatarLocked = false,
  onUpdatePresenter,
  onResetPresenter,
  captionVisible = true,
  captionLocked = false,
  captionOffsetX = 0,
  captionOffsetY = 0,
  captionPlacement = "auto",
  onUpdateCaptionOffsets,
  onResetCaptionOffsets,
  headlineVisible = true,
  headlineLocked = false,
  headlineText: _headlineText = "Headline",
  headlineOffsetX = 0,
  headlineOffsetY = 0,
  onUpdateHeadlineOffsets,
  onResetHeadlineOffsets,
  productVisible = true,
  productLocked = false,
  productTitle = "Product 3D Hero",
  productOffsetX = 0,
  productOffsetY = 0,
  productScale = 1.0,
  onUpdateProductOffsets,
  onResetProductOffsets,
  badgeVisible = false,
  badgeLocked = false,
  badgeOffsetX = 0,
  badgeOffsetY = 0,
  onUpdateBadgeOffsets,
  onResetBadgeOffsets,
  pricePromoVisible = true,
  pricePromoLocked = false,
  pricePromoOffsetX = 0,
  pricePromoOffsetY = 0,
  pricePromoScale = 1.0,
  onUpdatePricePromoOffsets,
  onResetPricePromoOffsets,
  ctaVisible = true,
  ctaLocked = false,
  ctaOffsetX = 0,
  ctaOffsetY = 0,
  ctaScale = 1.0,
  onUpdateCtaOffsets,
  onResetCtaOffsets,
  tickerTapeVisible = true,
  tickerTapeLocked = false,
  tickerTapeOffsetY = 0,
  onUpdateTickerTapeOffsets,
  onResetTickerTapeOffsets,
  qrCodeVisible: _qrCodeVisible = false,
  qrCodeLocked: _qrCodeLocked = false,
  brandLogoVisible = true,
  brandLogoLocked = false,
  brandLogoOffsetX = 0,
  brandLogoOffsetY = 0,
  brandLogoScale = 1.0,
  onUpdateBrandLogoOffsets,
  onResetBrandLogoOffsets,
  featurePillsVisible = true,
  featurePillsLocked = false,
  featurePillsOffsetX = 0,
  featurePillsOffsetY = 0,
  onUpdateFeaturePillsOffsets,
  onResetFeaturePillsOffsets,
  reviewCardVisible = true,
  reviewCardLocked = false,
  reviewCardOffsetX = 0,
  reviewCardOffsetY = 0,
  reviewCardScale = 1.0,
  onUpdateReviewCardOffsets,
  onResetReviewCardOffsets,
  onCommitChanges,
}: EditorCanvasGizmoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalSelectedElement, setInternalSelectedElement] =
    useState<SelectedGizmoElement>("avatar");
  const selectedElement =
    controlledSelectedElement !== undefined
      ? controlledSelectedElement
      : internalSelectedElement;

  const setSelected = (elem: SelectedGizmoElement) => {
    if (onSelectElement) {
      onSelectElement(elem);
    } else {
      setInternalSelectedElement(elem);
    }
  };

  const compWidth =
    aspectRatio === "9:16"
      ? 1080
      : aspectRatio === "16:9"
      ? 1920
      : aspectRatio === "4:5"
      ? 1080
      : 1080;
  const compHeight =
    aspectRatio === "9:16"
      ? 1920
      : aspectRatio === "16:9"
      ? 1080
      : aspectRatio === "4:5"
      ? 1350
      : 1080;

  const currentAvatarOffsetX = presenter?.offsetX ?? 0;
  const currentAvatarOffsetY = presenter?.offsetY ?? 0;
  const currentAvatarScale = presenter?.scale ?? 1.0;

  const bounds = useGizmoBounds({
    aspectRatio,
    compWidth,
    compHeight,
    presenter,
    captionOffsetX,
    captionOffsetY,
    captionPlacement,
    headlineOffsetX,
    headlineOffsetY,
    productOffsetX,
    productOffsetY,
    productScale,
    badgeOffsetX,
    badgeOffsetY,
    pricePromoOffsetX,
    pricePromoOffsetY,
    pricePromoScale,
    ctaOffsetX,
    ctaOffsetY,
    ctaScale,
    tickerTapeOffsetY,
    brandLogoOffsetX,
    brandLogoOffsetY,
    brandLogoScale,
    featurePillsOffsetX,
    featurePillsOffsetY,
    reviewCardOffsetX,
    reviewCardOffsetY,
    reviewCardScale,
  });

  const { handlePointerDown, handlePointerMove, handlePointerUp } =
    useGizmoPointerDrag({
      compWidth,
      compHeight,
      containerRef,
      setSelected,
      onUpdatePresenter,
      onUpdateCaptionOffsets,
      onUpdateHeadlineOffsets,
      onUpdateProductOffsets,
      onUpdateBadgeOffsets,
      onUpdatePricePromoOffsets,
      onUpdateCtaOffsets,
      onUpdateTickerTapeOffsets,
      onUpdateBrandLogoOffsets,
      onUpdateFeaturePillsOffsets,
      onUpdateReviewCardOffsets,
      onCommitChanges,
    });

  if (!enabled) return null;

  const isPresenterActive = avatarVisible !== false && presenter?.enabled !== false;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden"
    >
      {/* 1. Presenter Avatar */}
      {isPresenterActive && (
        <GizmoBoundingBoxOverlay
          box={bounds.avatarBounds}
          elementId="avatar"
          isSelected={selectedElement === "avatar"}
          isLocked={avatarLocked}
          colorTheme="emerald"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetPresenter?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_avatar",
              "avatar",
              currentAvatarOffsetX,
              currentAvatarOffsetY,
              currentAvatarScale,
              avatarLocked
            )
          }
          cursorClass="cursor-grab active:cursor-grabbing"
          badgeIcon={<User className="h-3 w-3" />}
          badgeTitle={presenter?.presenterName || "Avatar"}
          badgeScale={Math.round(currentAvatarScale * 100)}
          badgeCoords={{ x: currentAvatarOffsetX, y: currentAvatarOffsetY }}
          onReset={() => {
            onResetPresenter?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Avatar Framing"
          hoverIcon={<Move className="h-6 w-6 text-emerald-400/70" />}
        />
      )}

      {/* 2. Subtitles / Captions */}
      {captionVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.captionBounds}
          elementId="caption"
          isSelected={selectedElement === "caption"}
          isLocked={captionLocked}
          colorTheme="yellow"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetCaptionOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_caption",
              "caption",
              captionOffsetX,
              captionOffsetY,
              1.0,
              captionLocked
            )
          }
          badgeIcon={<Type className="h-3 w-3" />}
          badgeTitle="Captions"
          badgeCoords={{ x: captionOffsetX, y: captionOffsetY }}
          onReset={() => {
            onResetCaptionOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Caption Position"
        />
      )}

      {/* 3. Headline */}
      {headlineVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.headlineBounds}
          elementId="headline"
          isSelected={selectedElement === "headline"}
          isLocked={headlineLocked}
          colorTheme="blue"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetHeadlineOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_headline",
              "headline",
              headlineOffsetX,
              headlineOffsetY,
              1.0,
              headlineLocked
            )
          }
          badgeIcon={<Heading className="h-3 w-3" />}
          badgeTitle="Headline"
          badgeCoords={{ x: headlineOffsetX, y: headlineOffsetY }}
          onReset={() => {
            onResetHeadlineOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Headline Position"
        />
      )}

      {/* 4. Product 3D Hero */}
      {productVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.productBounds}
          elementId="product"
          isSelected={selectedElement === "product"}
          isLocked={productLocked}
          colorTheme="cyan"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetProductOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_product",
              "product",
              productOffsetX,
              productOffsetY,
              productScale,
              productLocked
            )
          }
          cursorClass="cursor-grab active:cursor-grabbing"
          badgeIcon={<Package className="h-3 w-3" />}
          badgeTitle={productTitle.slice(0, 16)}
          badgeScale={Math.round(productScale * 100)}
          badgeCoords={{ x: productOffsetX, y: productOffsetY }}
          onReset={() => {
            onResetProductOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Product Position"
        />
      )}

      {/* 5. Verified Spec Badge */}
      {badgeVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.badgeBounds}
          elementId="badge"
          isSelected={selectedElement === "badge"}
          isLocked={badgeLocked}
          colorTheme="emerald"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetBadgeOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_badge",
              "badge",
              badgeOffsetX,
              badgeOffsetY,
              1.0,
              badgeLocked
            )
          }
          badgeIcon={<Award className="h-3 w-3" />}
          badgeTitle="Verified Spec Badge"
          badgeCoords={{ x: badgeOffsetX, y: badgeOffsetY }}
          onReset={() => {
            onResetBadgeOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Badge Position"
        />
      )}

      {/* 6. Price & Promo Badge */}
      {pricePromoVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.pricePromoBounds}
          elementId="pricePromo"
          isSelected={selectedElement === "pricePromo"}
          isLocked={pricePromoLocked}
          colorTheme="emerald"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetPricePromoOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_pricePromo",
              "pricePromo",
              pricePromoOffsetX,
              pricePromoOffsetY,
              pricePromoScale,
              pricePromoLocked
            )
          }
          cursorClass="cursor-grab active:cursor-grabbing"
          badgeIcon={<Tag className="h-3 w-3" />}
          badgeTitle="Price & Promo"
          badgeScale={Math.round(pricePromoScale * 100)}
          badgeCoords={{ x: pricePromoOffsetX, y: pricePromoOffsetY }}
          onReset={() => {
            onResetPricePromoOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Price & Promo Position"
        />
      )}

      {/* 7. Call To Action (CTA) Button */}
      {ctaVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.ctaBounds}
          elementId="ctaButton"
          isSelected={selectedElement === "ctaButton"}
          isLocked={ctaLocked}
          colorTheme="violet"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetCtaOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_ctaButton",
              "ctaButton",
              ctaOffsetX,
              ctaOffsetY,
              ctaScale,
              ctaLocked
            )
          }
          cursorClass="cursor-grab active:cursor-grabbing"
          badgeIcon={<MousePointerClick className="h-3 w-3" />}
          badgeTitle="CTA Button"
          badgeScale={Math.round(ctaScale * 100)}
          badgeCoords={{ x: ctaOffsetX, y: ctaOffsetY }}
          onReset={() => {
            onResetCtaOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset CTA Position"
        />
      )}

      {/* 8. Live Ticker Tape */}
      {tickerTapeVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.tickerTapeBounds}
          elementId="tickerTape"
          isSelected={selectedElement === "tickerTape"}
          isLocked={tickerTapeLocked}
          colorTheme="cyan"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetTickerTapeOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_tickerTape",
              "tickerTape",
              0,
              tickerTapeOffsetY,
              1.0,
              tickerTapeLocked
            )
          }
          cursorClass="cursor-ns-resize"
          badgeIcon={<Radio className="h-3 w-3" />}
          badgeTitle="Ticker Tape"
          badgeCoords={{ y: tickerTapeOffsetY }}
          onReset={() => {
            onResetTickerTapeOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Ticker Position"
        />
      )}

      {/* 9. Brand Logo */}
      {brandLogoVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.brandLogoBounds}
          elementId="brandLogo"
          isSelected={selectedElement === "brandLogo"}
          isLocked={brandLogoLocked}
          colorTheme="indigo"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetBrandLogoOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_brandLogo",
              "brandLogo",
              brandLogoOffsetX,
              brandLogoOffsetY,
              brandLogoScale,
              brandLogoLocked
            )
          }
          cursorClass="cursor-grab active:cursor-grabbing"
          badgeIcon={<Building2 className="h-3 w-3" />}
          badgeTitle="Brand Logo"
          badgeScale={Math.round(brandLogoScale * 100)}
          badgeCoords={{ x: brandLogoOffsetX, y: brandLogoOffsetY }}
          badgePosition="left"
          onReset={() => {
            onResetBrandLogoOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Brand Logo Position"
        />
      )}

      {/* 10. Feature Pills */}
      {featurePillsVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.featurePillsBounds}
          elementId="featurePills"
          isSelected={selectedElement === "featurePills"}
          isLocked={featurePillsLocked}
          colorTheme="emerald"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetFeaturePillsOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_featurePills",
              "featurePills",
              featurePillsOffsetX,
              featurePillsOffsetY,
              1.0,
              featurePillsLocked
            )
          }
          badgeIcon={<ListFilter className="h-3 w-3" />}
          badgeTitle="Feature Pills"
          badgeCoords={{ x: featurePillsOffsetX, y: featurePillsOffsetY }}
          onReset={() => {
            onResetFeaturePillsOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Feature Pills Position"
        />
      )}

      {/* 11. Review Social Proof Card */}
      {reviewCardVisible && (
        <GizmoBoundingBoxOverlay
          box={bounds.reviewCardBounds}
          elementId="reviewCard"
          isSelected={selectedElement === "reviewCard"}
          isLocked={reviewCardLocked}
          colorTheme="amber"
          onSelect={setSelected}
          onDoubleClickReset={() => {
            onResetReviewCardOffsets?.();
            onCommitChanges?.();
          }}
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              "move_reviewCard",
              "reviewCard",
              reviewCardOffsetX,
              reviewCardOffsetY,
              reviewCardScale,
              reviewCardLocked
            )
          }
          cursorClass="cursor-grab active:cursor-grabbing"
          badgeIcon={<Star className="h-3 w-3 fill-amber-400" />}
          badgeTitle="Review Card"
          badgeScale={Math.round(reviewCardScale * 100)}
          badgeCoords={{ x: reviewCardOffsetX, y: reviewCardOffsetY }}
          onReset={() => {
            onResetReviewCardOffsets?.();
            onCommitChanges?.();
          }}
          resetTitle="Reset Review Card Position"
        />
      )}
    </div>
  );
}

export const EditorCanvasGizmo = React.memo(EditorCanvasGizmoComponent);
