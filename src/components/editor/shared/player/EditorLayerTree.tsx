"use client";

/**
 * src/components/editor/shared/player/EditorLayerTree.tsx
 *
 * Professional Layer Stack & Visibility/Position Manager (Refactored Modular Suite).
 * Allows editors to inspect, toggle visibility, lock, reset, and fine-tune
 * coordinates and scales for all 18 composition layers in Remotion.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  Layers,
  RotateCcw,
  PanelLeftClose,
  Layout,
} from "lucide-react";
import { INTEGRAL_LAYOUT_TEMPLATES } from "@/lib/ecommerce/layoutTemplates";
import { EditorLayerId, EditorLayerTreeProps } from "./layerTree/types";
import { buildLayersList } from "./layerTree/buildLayersList";
import { LayerTreeItem } from "./layerTree/LayerTreeItem";

export type { EditorLayerId, EditorLayerTreeProps };

function EditorLayerTreeComponent(props: EditorLayerTreeProps) {
  const {
    selectedLayer,
    onSelectLayer,
    isOpen,
    onToggleOpen,
    onResetAllPositions,
    activeTemplateId,
    onApplyLayoutTemplate,
    selectedSceneIndex,
    currentSceneType,
    hasReviewCard,
    hasPricePromo,
    hasFeaturePills,
    reviewCardVisible,
    pricePromoVisible,
    ctaVisible,
    featurePillsVisible,
    usVsThemVisible,
    flashSaleVisible,
    socialPopupVisible,
  } = props;

  const [filterMode, setFilterMode] = useState<"active" | "all">("active");
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({
    brandLogo: false,
    pricePromo: false,
    ctaButton: false,
    tickerTape: false,
    badge: false,
    headline: false,
    caption: false,
    featurePills: false,
    reviewCard: false,
    avatar: false,
    product: false,
  });

  const toggleDetails = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- All individual props referenced by buildLayersList are listed explicitly
  const layersList = useMemo(() => buildLayersList(props), [
    props.mode,
    props.introBumperVisible,
    props.introBumperLocked,
    props.introDurationFrames,
    props.brandLogoVisible,
    props.brandLogoLocked,
    props.brandLogoOffsetX,
    props.brandLogoOffsetY,
    props.brandLogoScale,
    props.pricePromoVisible,
    props.pricePromoLocked,
    props.pricePromoOffsetX,
    props.pricePromoOffsetY,
    props.pricePromoScale,
    props.ctaVisible,
    props.ctaLocked,
    props.ctaOffsetX,
    props.ctaOffsetY,
    props.ctaScale,
    props.tickerTapeVisible,
    props.tickerTapeLocked,
    props.tickerTapeOffsetY,
    props.qrCodeVisible,
    props.qrCodeLocked,
    props.showBadgeLayer,
    props.badgeVisible,
    props.badgeLocked,
    props.badgeOffsetX,
    props.badgeOffsetY,
    props.headlineVisible,
    props.headlineLocked,
    props.headlineOffsetX,
    props.headlineOffsetY,
    props.headlineText,
    props.captionVisible,
    props.captionLocked,
    props.captionOffsetX,
    props.captionOffsetY,
    props.featurePillsVisible,
    props.featurePillsLocked,
    props.featurePillsOffsetX,
    props.featurePillsOffsetY,
    props.reviewCardVisible,
    props.reviewCardLocked,
    props.reviewCardOffsetX,
    props.reviewCardOffsetY,
    props.reviewCardScale,
    props.avatarVisible,
    props.avatarLocked,
    props.avatarOffsetX,
    props.avatarOffsetY,
    props.avatarScale,
    props.avatarName,
    props.productVisible,
    props.productLocked,
    props.productOffsetX,
    props.productOffsetY,
    props.productScale,
    props.productTitle,
    props.usVsThemVisible,
    props.usVsThemLocked,
    props.flashSaleVisible,
    props.flashSaleLocked,
    props.socialPopupVisible,
    props.socialPopupLocked,
    props.outroEndCardVisible,
    props.outroEndCardLocked,
    props.outroDurationFrames,
    props.backdropVisible,
    props.backdropLocked,
  ]);

  const isLayerActiveInCurrentContext = useCallback((layerId: EditorLayerId): boolean => {
    // 1. Intro Hook Bumper selected
    if (selectedSceneIndex === -1) {
      return (
        layerId === "introBumper" ||
        layerId === "brandLogo" ||
        layerId === "backdrop"
      );
    }

    // 2. Outro End-Card CTA selected
    if (selectedSceneIndex === 999) {
      if (props.mode === "broadcast") {
        return (
          layerId === "outroEndCard" ||
          layerId === "brandLogo" ||
          layerId === "backdrop"
        );
      }
      return (
        layerId === "outroEndCard" ||
        layerId === "pricePromo" ||
        layerId === "ctaButton" ||
        layerId === "qrCode" ||
        layerId === "brandLogo" ||
        layerId === "backdrop"
      );
    }

    // 3. Normal Scene selected (selectedSceneIndex >= 0)
    if (props.mode === "broadcast") {
      switch (layerId) {
        case "avatar":
        case "caption":
        case "headline":
        case "brandLogo":
        case "tickerTape":
        case "badge":
        case "backdrop":
          return true;
        default:
          return false;
      }
    }

    switch (layerId) {
      case "introBumper":
      case "outroEndCard":
        return false;

      // Core scene layers: Always available in the scene layer stack
      case "avatar":
      case "caption":
      case "headline":
      case "product":
      case "brandLogo":
      case "tickerTape":
      case "badge":
      case "qrCode":
      case "backdrop":
        return true;

      case "featurePills":
        return Boolean(hasFeaturePills || featurePillsVisible);

      case "reviewCard":
        return Boolean(
          currentSceneType === "social_proof_review" ||
          hasReviewCard ||
          reviewCardVisible
        );

      case "pricePromo":
      case "ctaButton":
        return Boolean(
          currentSceneType === "price_promo_outro" ||
          hasPricePromo ||
          pricePromoVisible ||
          ctaVisible
        );

      case "usVsThem":
        return Boolean(currentSceneType === "comparison_battle" || usVsThemVisible);

      case "flashSale":
        return Boolean(currentSceneType === "urgency_flash_sale" || flashSaleVisible);

      case "socialPopup":
        return Boolean(socialPopupVisible);

      default:
        return true;
    }
  }, [
    selectedSceneIndex,
    currentSceneType,
    hasFeaturePills,
    featurePillsVisible,
    hasReviewCard,
    reviewCardVisible,
    hasPricePromo,
    pricePromoVisible,
    ctaVisible,
    usVsThemVisible,
    flashSaleVisible,
    socialPopupVisible,
    props.mode,
  ]);

  const activeCount = useMemo(
    () => layersList.filter((l) => isLayerActiveInCurrentContext(l.id)).length,
    [layersList, isLayerActiveInCurrentContext]
  );

  const displayedLayers = useMemo(
    () =>
      filterMode === "active"
        ? layersList.filter((l) => isLayerActiveInCurrentContext(l.id))
        : layersList,
    [filterMode, layersList, isLayerActiveInCurrentContext]
  );

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        title="Open Layer Tree"
        className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-xl backdrop-blur-md text-xs font-semibold transition-all cursor-pointer"
      >
        <Layers className="h-4 w-4 text-emerald-400" />
        <span>Layers</span>
      </button>
    );
  }

  return (
    <div className="w-64 shrink-0 flex flex-col h-full bg-zinc-950/95 border-r border-zinc-800/90 shadow-2xl backdrop-blur-xl select-none z-30 transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold text-zinc-100">Layers</span>
          <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-400">
            {displayedLayers.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onResetAllPositions && (
            <button
              type="button"
              onClick={onResetAllPositions}
              title="Reset All Element Positions to Default"
              className="p-1 px-1.5 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="h-2.5 w-2.5 text-amber-400" />
              <span className="text-[9px] font-medium">Reset All</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            title="Collapse Layer Tree"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Integral Layout Template Quick Picker */}
      {onApplyLayoutTemplate && (
        <div className="px-2.5 py-2 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
              <Layout className="h-3 w-3 text-blue-400" />
              Layout Template
            </span>
            <span className="text-[8px] font-mono text-blue-400/90 bg-blue-500/10 px-1 py-0.2 rounded">
              Integral
            </span>
          </div>
          <select
            value={activeTemplateId || "tiktok_creator"}
            onChange={(e) => onApplyLayoutTemplate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700/80 hover:border-blue-500/60 rounded px-2 py-1 text-[10px] text-zinc-200 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          >
            {INTEGRAL_LAYOUT_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id} className="bg-zinc-900 text-zinc-200">
                {tpl.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Context-Aware Filter Toggle */}
      <div className="px-2 py-1.5 border-b border-zinc-800/80 bg-zinc-950/70 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setFilterMode("active")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            filterMode === "active"
              ? "bg-emerald-500 text-black shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
          title="Show only layers active on screen in the current selection"
        >
          <span>
            🎯{" "}
            {selectedSceneIndex === -1
              ? "Active in Intro"
              : selectedSceneIndex === 999
              ? "Active in Outro"
              : "Active in Scene"}
          </span>
          <span
            className={`px-1 py-0.2 rounded text-[9px] font-mono ${
              filterMode === "active"
                ? "bg-black/20 text-black font-bold"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            filterMode === "all"
              ? "bg-emerald-500 text-black shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
          title="Show all layers in the composition"
        >
          <span>🌐 All</span>
          <span
            className={`px-1 py-0.2 rounded text-[9px] font-mono ${
              filterMode === "all"
                ? "bg-black/20 text-black font-bold"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {layersList.length}
          </span>
        </button>
      </div>

      {/* Layer Stack (Z-Index descending: topmost elements at top) */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60 p-1.5 space-y-1 custom-scrollbar">
        {displayedLayers.map((layer) => (
          <LayerTreeItem
            key={layer.id}
            layer={layer}
            isSelected={selectedLayer === layer.id}
            isExpanded={Boolean(expandedDetails[layer.id])}
            onSelect={onSelectLayer}
            onToggleDetails={(id, e) => toggleDetails(id, e)}
          />
        ))}
      </div>
    </div>
  );
}

export const EditorLayerTree = React.memo(EditorLayerTreeComponent);
