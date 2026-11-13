"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Globe,
  Check,
  CheckCircle2,
  RefreshCw,
  Volume2,
  Play,
  Layers,
} from "lucide-react";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";
import {
  TargetMarketKey,
  MARKET_PROFILES,
  LocalizedCampaignBundle,
  LocalizedAdResult,
  localizeAdCampaign,
} from "@/lib/ecommerce/adLocalizer";

export interface LocalizationMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSpec;
  script: AdScript;
  onApplyToStudio: (
    localizedProduct: ProductSpec,
    localizedScript: AdScript,
    voiceId: string
  ) => void;
  onBatchQueueAll?: (bundle: LocalizedCampaignBundle) => void;
}

export const LocalizationMatrixModal: React.FC<LocalizationMatrixModalProps> = ({
  isOpen,
  onClose,
  product,
  script,
  onApplyToStudio,
  onBatchQueueAll,
}) => {
  const [selectedMarkets, setSelectedMarkets] = useState<TargetMarketKey[]>([
    "en_us",
    "es_latam",
    "de_de",
    "fr_fr",
    "pt_br",
    "ja_jp",
  ]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [bundle, setBundle] = useState<LocalizedCampaignBundle | null>(null);
  const [appliedMarketKey, setAppliedMarketKey] = useState<TargetMarketKey | null>(null);

  // Auto-translate on modal open
  useEffect(() => {
    if (!isOpen) return;

    const runTranslation = async () => {
      setIsTranslating(true);
      try {
        const res = await fetch("/api/ecommerce/localize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productSpec: product,
            script,
            targetMarkets: selectedMarkets,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.bundle) {
            setBundle(data.bundle);
          }
        }
      } catch (err) {
        console.warn("[LocalizationModal] Network error, falling back to local synthesis:", err);
        const localBundle = await localizeAdCampaign(product, script, selectedMarkets);
        setBundle(localBundle);
      } finally {
        setIsTranslating(false);
      }
    };

    runTranslation();
  }, [isOpen, product, script, selectedMarkets]);

  if (!isOpen) return null;

  const toggleMarket = (key: TargetMarketKey) => {
    setSelectedMarkets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleApply = (result: LocalizedAdResult) => {
    onApplyToStudio(result.productSpec, result.script, result.voiceId);
    setAppliedMarketKey(result.marketKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e0e11] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141418]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                1-Click Multilingual Product Ad Matrix
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Global Scale
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Localize currencies, convert prices, adapt hooks, and route native Piper TTS voices across 8 global markets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Market Pills Selector */}
        <div className="px-6 py-3 border-b border-white/5 bg-[#0a0a0d] flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Markets:</span>
            {Object.values(MARKET_PROFILES).map((m) => {
              const isSelected = selectedMarkets.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleMarket(m.key)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  <span>{m.flag}</span>
                  <span>{m.name.split(" ")[0]}</span>
                  {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={async () => {
              setIsTranslating(true);
              const localBundle = await localizeAdCampaign(product, script, selectedMarkets);
              setBundle(localBundle);
              setIsTranslating(false);
            }}
            disabled={isTranslating}
            className="text-xs px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1.5 hover:bg-cyan-500/20 transition-all shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? "animate-spin text-cyan-400" : ""}`} />
            <span>Re-Translate</span>
          </button>
        </div>

        {/* Matrix Grid of Localized Markets */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isTranslating ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-xs font-bold text-white">
                Synthesizing multi-market copywriting and currency conversions...
              </p>
            </div>
          ) : !bundle ? (
            <div className="text-center py-16 text-muted-foreground text-xs">
              No localization data available. Click Re-Translate above.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Object.values(bundle.markets).map((m) => {
                const profile = MARKET_PROFILES[m.marketKey];
                const isApplied = appliedMarketKey === m.marketKey;

                return (
                  <div
                    key={m.marketKey}
                    className={`bg-[#141418] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                      isApplied
                        ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Market Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{profile.flag}</span>
                          <div>
                            <div className="text-xs font-black text-white leading-tight">
                              {profile.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {profile.language} • {profile.currency}
                            </div>
                          </div>
                        </div>

                        {/* Localized Price Badge */}
                        <div className="text-right">
                          <div className="text-xs font-extrabold text-cyan-400 font-mono">
                            {m.formattedPrice}
                          </div>
                          {m.formattedCompareAtPrice && (
                            <div className="text-[10px] text-muted-foreground line-through font-mono">
                              {m.formattedCompareAtPrice}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Translated Hook Headline */}
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-[9px] uppercase font-black tracking-wider text-muted-foreground block">
                          Localized Viral Hook (Scene 1)
                        </span>
                        <p className="text-xs font-bold text-white leading-snug">
                          {m.script.hookHeadline}
                        </p>
                      </div>

                      {/* Voice & CTA Metadata */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>
                            Voice: <span className="text-white font-bold capitalize">{m.voiceId}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">CTA:</span>
                          <span className="text-pink-400 font-bold px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                            {m.ctaText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {m.script.scenes.length} Scenes Translated
                      </span>

                      <button
                        type="button"
                        onClick={() => handleApply(m)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                          isApplied
                            ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                            : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Active in Player</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Apply to Player</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#141418]/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
          >
            Done
          </button>

          <div className="flex items-center gap-3">
            {onBatchQueueAll && bundle && (
              <button
                onClick={() => onBatchQueueAll(bundle)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Batch Render All {Object.keys(bundle.markets).length} Markets</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
