/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableSocialProofSection.tsx
 *
 * Dynamic Social Proof & Scarcity HUD Overlays:
 * - 5-star verified rating badge & review counter
 * - Real-time flash scarcity ticker ("⚡ ONLY 7 LEFT IN STOCK")
 * - Verified customer quote card with author attribution
 * - Trust seal guarantees (30-day money back, free shipping, lifetime warranty)
 */

import React, { useState } from "react";
import {
  Star,
  Flame,
  MessageSquareQuote,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Truck,
  RotateCcw,
  Award,
} from "lucide-react";
import { TurntableSocialProofConfig, ProductSpec } from "@/lib/types/ecommerce";

interface TurntableSocialProofSectionProps {
  socialProof?: TurntableSocialProofConfig;
  onChange: (config: TurntableSocialProofConfig) => void;
  productSpec?: ProductSpec;
  accentColor?: string;
}

export function TurntableSocialProofSection({
  socialProof = {},
  onChange,
  productSpec,
  accentColor: _accentColor = "#06b6d4",
}: TurntableSocialProofSectionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const updateConfig = (patch: Partial<TurntableSocialProofConfig>) => {
    onChange({
      ...socialProof,
      ...patch,
    });
  };

  const handleAutoFillFromCatalog = () => {
    const firstReview = productSpec?.topReviews?.[0];
    const rating = productSpec?.rating || 4.9;
    const reviewCount = productSpec?.reviewCount || 1280;

    updateConfig({
      showRatingBadge: true,
      rating,
      reviewCount,
      showBuyerQuote: Boolean(firstReview?.body),
      buyerQuoteText: firstReview?.body || `Exceptional quality and finish. Definitely worth every penny.`,
      buyerAuthor: firstReview?.author ? `${firstReview.author} — Verified Buyer` : "Elena M. — Verified Buyer",
      showScarcityTicker: true,
      scarcityText: "⚡ ONLY 7 LEFT IN STOCK",
      trustSeal: "30_day_guarantee",
    });
  };

  const hasAnySocialProof =
    socialProof.showRatingBadge ||
    socialProof.showBuyerQuote ||
    socialProof.showScarcityTicker ||
    (socialProof.trustSeal && socialProof.trustSeal !== "none");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 overflow-hidden transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3.5 bg-zinc-900/40 hover:bg-zinc-900/60 cursor-pointer select-none transition-colors border-b border-zinc-800/80"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="h-4 w-4 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100">
                Social Proof & Urgency Overlays
              </span>
              {hasAnySocialProof && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              5-star ratings, buyer quotes, urgency tickers & trust seals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {productSpec && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAutoFillFromCatalog();
              }}
              className="text-[10px] font-medium px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Catalog Auto-fill</span>
            </button>
          )}

          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded Controls Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-4">
          {/* Row 1: 5-Star Rating Pill Toggle & Fields */}
          <div className="space-y-2 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/70">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(socialProof.showRatingBadge)}
                  onChange={(e) => updateConfig({ showRatingBadge: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-400/20"
                />
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>5-Star Verified Rating Badge</span>
              </label>
              <span className="text-[9.5px] font-mono text-zinc-500">Top-Left HUD</span>
            </div>

            {socialProof.showRatingBadge && (
              <div className="grid grid-cols-2 gap-2 pt-1 pl-5">
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-1">Rating Score</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={socialProof.rating ?? 4.9}
                    onChange={(e) => updateConfig({ rating: parseFloat(e.target.value) || 4.9 })}
                    className="w-full text-xs font-mono bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-1">Total Reviews</label>
                  <input
                    type="number"
                    min="1"
                    value={socialProof.reviewCount ?? 1420}
                    onChange={(e) => updateConfig({ reviewCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs font-mono bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Scarcity & Urgency Ticker */}
          <div className="space-y-2 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/70">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(socialProof.showScarcityTicker)}
                  onChange={(e) => updateConfig({ showScarcityTicker: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-red-500 focus:ring-red-400/20"
                />
                <Flame className="h-3.5 w-3.5 text-red-400" />
                <span>Scarcity & Urgency Ticker</span>
              </label>
              <span className="text-[9.5px] font-mono text-zinc-500">Top-Right HUD</span>
            </div>

            {socialProof.showScarcityTicker && (
              <div className="space-y-2 pt-1 pl-5">
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-1">Ticker Text</label>
                  <input
                    type="text"
                    value={socialProof.scarcityText ?? "⚡ ONLY 7 LEFT IN STOCK"}
                    onChange={(e) => updateConfig({ scarcityText: e.target.value })}
                    className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:border-red-400 focus:outline-none"
                    placeholder="e.g. ⚡ ONLY 9 LEFT IN WAREHOUSE"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    "⚡ ONLY 7 LEFT IN STOCK",
                    "🔥 92% SOLD OUT — ALMOST GONE",
                    "⏳ FLASH SALE ENDS TONIGHT",
                    "🛒 18 SHOPPERS HAVE THIS IN CART",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateConfig({ scarcityText: preset })}
                      className={`text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        socialProof.scarcityText === preset
                          ? "bg-red-500/30 text-red-300 border border-red-500/50"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700/60"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Verified Buyer Quote Card */}
          <div className="space-y-2 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/70">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(socialProof.showBuyerQuote)}
                  onChange={(e) => updateConfig({ showBuyerQuote: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-400/20"
                />
                <MessageSquareQuote className="h-3.5 w-3.5 text-cyan-400" />
                <span>Verified Buyer Review Card</span>
              </label>
              <span className="text-[9.5px] font-mono text-zinc-500">Bottom-Right HUD</span>
            </div>

            {socialProof.showBuyerQuote && (
              <div className="space-y-2 pt-1 pl-5">
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-1">Quote Snippet</label>
                  <textarea
                    rows={2}
                    value={
                      socialProof.buyerQuoteText ??
                      "Hands down the cleanest finish I have ever experienced. 10/10 recommendation."
                    }
                    onChange={(e) => updateConfig({ buyerQuoteText: e.target.value })}
                    className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:border-cyan-400 focus:outline-none resize-none leading-relaxed"
                    placeholder="Enter short customer review quote..."
                  />
                </div>

                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-1">Buyer Attribution</label>
                  <input
                    type="text"
                    value={socialProof.buyerAuthor ?? "Elena M. — Verified Buyer"}
                    onChange={(e) => updateConfig({ buyerAuthor: e.target.value })}
                    className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:border-cyan-400 focus:outline-none"
                    placeholder="e.g. Sarah K. — Verified Purchase"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Trust Seal Guarantees */}
          <div className="space-y-2 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Commercial Trust Seal</span>
              </div>
              <span className="text-[9.5px] font-mono text-zinc-500">Rating Badge Seal</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {[
                { key: "none", label: "None", icon: null },
                { key: "30_day_guarantee", label: "30-Day Guarantee", icon: RotateCcw },
                { key: "free_shipping", label: "Free Shipping", icon: Truck },
                { key: "official_warranty", label: "Official Warranty", icon: Award },
              ].map((seal) => {
                const isSelected = (socialProof.trustSeal || "none") === seal.key;
                const Icon = seal.icon;
                return (
                  <button
                    key={seal.key}
                    type="button"
                    onClick={() => updateConfig({ trustSeal: seal.key as TurntableSocialProofConfig["trustSeal"] })}
                    className={`p-2 rounded-lg text-left text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                        : "bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 border-zinc-700/60"
                    }`}
                  >
                    {Icon && <Icon className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{seal.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
