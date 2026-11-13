"use client";

import React from "react";
import {
  QrCode,
  Layers,
  Tag,
  Building2,
} from "lucide-react";

export interface OverlaysStudioSectionProps {
  showBrandLogo?: boolean;
  onChangeShowBrandLogo?: (show: boolean) => void;

  showQrCode?: boolean;
  onChangeShowQrCode?: (show: boolean) => void;
  qrCodeUrl?: string;
  onChangeQrCodeUrl?: (url: string) => void;
  qrCodeLabel?: string;
  onChangeQrCodeLabel?: (label: string) => void;

  featureBadgeText?: string;
  onChangeFeatureBadgeText?: (text: string) => void;

  showComparisonBattleCard?: boolean;
  onChangeShowComparisonBattleCard?: (show: boolean) => void;

  disabled?: boolean;
  className?: string;
}

function OverlaysStudioSectionComponent({
  showBrandLogo = true,
  onChangeShowBrandLogo,

  showQrCode = false,
  onChangeShowQrCode,
  qrCodeUrl = "",
  onChangeQrCodeUrl,
  qrCodeLabel = "Scan to Buy",
  onChangeQrCodeLabel,

  featureBadgeText = "",
  onChangeFeatureBadgeText,

  showComparisonBattleCard = false,
  onChangeShowComparisonBattleCard,

  disabled = false,
  className = "",
}: OverlaysStudioSectionProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-md space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-100">Broadcast Overlays & Graphics</h4>
          <p className="text-[11px] text-zinc-400">
            Watermarks, interactive QR codes, feature badges, and conversion cards
          </p>
        </div>
      </div>

      {/* 1. Feature Badge / Product Spec Pill */}
      {onChangeFeatureBadgeText && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-emerald-400" />
            <span>Feature Specs & Lower-Third Badge</span>
          </label>
          <input
            type="text"
            value={featureBadgeText}
            disabled={disabled}
            onChange={(e) => onChangeFeatureBadgeText(e.target.value)}
            placeholder="e.g. 10 mm • 100% Waterproof • Heavy Duty"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-medium"
          />
        </div>
      )}

      {/* 2. Shoppable QR Code Settings */}
      {onChangeShowQrCode && (
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <QrCode className="h-3.5 w-3.5 text-amber-400" />
              <span>Shoppable QR Code Call-to-Action</span>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showQrCode}
                disabled={disabled}
                onChange={(e) => onChangeShowQrCode(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span className="text-zinc-300 font-medium">Enable</span>
            </label>
          </div>

          {showQrCode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {onChangeQrCodeUrl && (
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Target URL</label>
                  <input
                    type="url"
                    value={qrCodeUrl}
                    disabled={disabled}
                    onChange={(e) => onChangeQrCodeUrl(e.target.value)}
                    placeholder="https://storehaus.com.ar/product-link"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {onChangeQrCodeLabel && (
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Badge CTA Text</label>
                  <input
                    type="text"
                    value={qrCodeLabel}
                    disabled={disabled}
                    onChange={(e) => onChangeQrCodeLabel(e.target.value)}
                    placeholder="Scan to Buy"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2b. Brand Logo (Top-Left) */}
      {onChangeShowBrandLogo && (
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Brand Logo (Top-Left)</span>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showBrandLogo}
              disabled={disabled}
              onChange={(e) => onChangeShowBrandLogo(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
            />
            <span className="text-zinc-300 font-medium">Visible</span>
          </label>
        </div>
      )}


      {/* 4. Comparison Battle Card */}
      {onChangeShowComparisonBattleCard && (
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-300">
              Us vs. Competitors Battle Card
            </span>
            <p className="text-[10px] text-zinc-400">
              High-converting side-by-side feature comparison infographic
            </p>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showComparisonBattleCard}
              disabled={disabled}
              onChange={(e) => onChangeShowComparisonBattleCard(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
            />
            <span className="text-zinc-300 font-medium">Show</span>
          </label>
        </div>
      )}
    </div>
  );
}

export const OverlaysStudioSection = React.memo(OverlaysStudioSectionComponent);
