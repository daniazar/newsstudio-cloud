"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Clapperboard,
  Clock,
  Tag,
  ShieldCheck,
  Star,
  Check,
  ShoppingBag,
  Gift,
  ExternalLink,
} from "lucide-react";
import { AdIntroConfig, AdOutroConfig } from "@/lib/types/ecommerce";
import { COMMERCIAL_INTRO_SLOGANS } from "@/remotion/layers/ecommerce/CommercialIntroLayer";
import { COMMERCIAL_OUTRO_MESSAGES } from "@/remotion/layers/ecommerce/CommercialOutroLayer";

export interface IntroOutroStudioSectionProps {
  introConfig: AdIntroConfig;
  onChangeIntroConfig: (config: AdIntroConfig) => void;
  outroConfig: AdOutroConfig;
  onChangeOutroConfig: (config: AdOutroConfig) => void;
  isSpanish?: boolean;
  activeSubtab?: "intro" | "outro";
  hideSubtabSwitcher?: boolean;
}

const IntroOutroStudioSectionComponent: React.FC<IntroOutroStudioSectionProps> = ({
  introConfig,
  onChangeIntroConfig,
  outroConfig,
  onChangeOutroConfig,
  isSpanish = false,
  activeSubtab: initialSubtab = "intro",
  hideSubtabSwitcher = false,
}) => {
  const [activeTab, setActiveTab] = useState<"intro" | "outro">(initialSubtab);

  React.useEffect(() => {
    if (initialSubtab) {
      setActiveTab(initialSubtab);
    }
  }, [initialSubtab]);

  const introDurations = [
    { label: "1.5s", frames: 45 },
    { label: "2.0s", frames: 60 },
    { label: "2.5s", frames: 75 },
    { label: "3.0s", frames: 90 },
  ];

  const outroDurations = [
    { label: "2.0s", frames: 60 },
    { label: "2.5s", frames: 75 },
    { label: "3.0s", frames: 90 },
    { label: "4.0s", frames: 120 },
  ];

  const filteredIntroSlogans = COMMERCIAL_INTRO_SLOGANS.filter(
    (s) => (isSpanish ? s.lang === "es" : s.lang === "en")
  );

  const filteredOutroMessages = COMMERCIAL_OUTRO_MESSAGES.filter(
    (o) => (isSpanish ? o.lang === "es" : o.lang === "en")
  );

  return (
    <div className="space-y-4 select-none">
      {/* Subtab Switcher: Intro Bumper vs. Outro End-Card */}
      {!hideSubtabSwitcher && (
        <div className="flex rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("intro")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "intro"
              ? "bg-cyan-500 text-black shadow-md shadow-cyan-950/50"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Clapperboard className="h-3.5 w-3.5" />
          <span>Intro Bumper</span>
          {introConfig.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("outro")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "outro"
              ? "bg-emerald-500 text-black shadow-md shadow-emerald-950/50"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Outro End-Card</span>
          {outroConfig.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>
      )}

      {/* ─── TAB 1: INTRO BUMPER SETTINGS ─── */}
      {activeTab === "intro" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
          {/* Header & Enable Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div>
              <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Brand Hook Bumper</span>
              </h4>
              <p className="text-[10px] text-zinc-400">
                Opening 2-second hook with brand logo & verified trust badge
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={introConfig.enabled}
                onChange={(e) =>
                  onChangeIntroConfig({ ...introConfig, enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {introConfig.enabled ? (
            <div className="space-y-4">
              {/* Duration Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  <span>Intro Duration</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {introDurations.map((d) => (
                    <button
                      key={d.frames}
                      type="button"
                      onClick={() =>
                        onChangeIntroConfig({ ...introConfig, durationFrames: d.frames })
                      }
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                        introConfig.durationFrames === d.frames
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slogan Presets Grid */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-300 block">
                  Intro Slogan Presets
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredIntroSlogans.map((s) => {
                    const isSelected =
                      (introConfig.sloganId || filteredIntroSlogans[0].id) === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          onChangeIntroConfig({
                            ...introConfig,
                            sloganId: s.id,
                            customHeadline: undefined,
                            customSubheadline: undefined,
                          })
                        }
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all border ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                            : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">{s.icon}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">
                              {s.text}
                            </span>
                            <span className="text-[10px] text-zinc-500 block truncate">
                              {s.subtitle}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-cyan-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Headline & Subheadline overrides */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">
                    Custom Headline (Optional Override)
                  </label>
                  <input
                    type="text"
                    value={introConfig.customHeadline || ""}
                    onChange={(e) =>
                      onChangeIntroConfig({ ...introConfig, customHeadline: e.target.value })
                    }
                    placeholder={isSpanish ? "Ej: OFERTA EXCLUSIVA STOREHAUS" : "E.g. OFFICIAL BRAND LAUNCH"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">
                    Custom Subheadline (Optional)
                  </label>
                  <input
                    type="text"
                    value={introConfig.customSubheadline || ""}
                    onChange={(e) =>
                      onChangeIntroConfig({ ...introConfig, customSubheadline: e.target.value })
                    }
                    placeholder={isSpanish ? "Ej: Calidad Premium Garantizada" : "E.g. Premium Handcrafted Quality"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Toggles: Verified Badge & Logo */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Show Official Store Badge</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={introConfig.showVerifiedBadge ?? true}
                    onChange={(e) =>
                      onChangeIntroConfig({
                        ...introConfig,
                        showVerifiedBadge: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-yellow-400" />
                    <span>Show Brand Logo / Icon</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={introConfig.showLogo ?? true}
                    onChange={(e) =>
                      onChangeIntroConfig({
                        ...introConfig,
                        showLogo: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic py-2">
              Intro bumper is disabled. Video will jump straight into Scene 1.
            </p>
          )}
        </div>
      )}

      {/* ─── TAB 2: OUTRO END-CARD SETTINGS ─── */}
      {activeTab === "outro" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
          {/* Header & Enable Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div>
              <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Gift className="h-3.5 w-3.5 text-emerald-400" />
                <span>Conversion End-Card</span>
              </h4>
              <p className="text-[10px] text-zinc-400">
                Call-to-action screen with promo code pill & 5-star ratings
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={outroConfig.enabled}
                onChange={(e) =>
                  onChangeOutroConfig({ ...outroConfig, enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {outroConfig.enabled ? (
            <div className="space-y-4">
              {/* Duration Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-emerald-400" />
                  <span>Outro Duration</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {outroDurations.map((d) => (
                    <button
                      key={d.frames}
                      type="button"
                      onClick={() =>
                        onChangeOutroConfig({ ...outroConfig, durationFrames: d.frames })
                      }
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                        outroConfig.durationFrames === d.frames
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outro CTA Presets Grid */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-300 block">
                  Outro CTA Presets
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredOutroMessages.map((o) => {
                    const isSelected =
                      (outroConfig.outroId || filteredOutroMessages[0].id) === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() =>
                          onChangeOutroConfig({
                            ...outroConfig,
                            outroId: o.id,
                            customHeadline: undefined,
                            customCta: undefined,
                          })
                        }
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all border ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                            : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">{o.icon}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">
                              {o.cta}
                            </span>
                            <span className="text-[10px] text-zinc-500 block truncate">
                              {o.badge}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Promo Code & Discount Percent */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                    <Tag className="h-3 w-3 text-emerald-400" />
                    <span>Promo Code</span>
                  </label>
                  <input
                    type="text"
                    value={outroConfig.promoCode || ""}
                    onChange={(e) =>
                      onChangeOutroConfig({ ...outroConfig, promoCode: e.target.value.toUpperCase() })
                    }
                    placeholder="PROMO10"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">
                    Discount %
                  </label>
                  <select
                    value={outroConfig.discountPercentage || 10}
                    onChange={(e) =>
                      onChangeOutroConfig({
                        ...outroConfig,
                        discountPercentage: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={5}>5% OFF</option>
                    <option value={10}>10% OFF</option>
                    <option value={15}>15% OFF</option>
                    <option value={20}>20% OFF</option>
                    <option value={25}>25% OFF</option>
                  </select>
                </div>
              </div>

              {/* Custom Headline & CTA Overrides */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">
                    Custom Headline (Optional)
                  </label>
                  <input
                    type="text"
                    value={outroConfig.customHeadline || ""}
                    onChange={(e) =>
                      onChangeOutroConfig({ ...outroConfig, customHeadline: e.target.value })
                    }
                    placeholder={isSpanish ? "Ej: ¿Querés renovar tu hogar?" : "E.g. Ready to Upgrade?"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">
                    Custom Button CTA (Optional)
                  </label>
                  <input
                    type="text"
                    value={outroConfig.customCta || ""}
                    onChange={(e) =>
                      onChangeOutroConfig({ ...outroConfig, customCta: e.target.value })
                    }
                    placeholder={isSpanish ? "Ej: Pedí tus Muestras Gratis" : "E.g. Tap Below to Shop Now"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Trust & Verification Toggles */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-yellow-400" />
                    <span>Show 5-Star Reviews Badge</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={outroConfig.showReviewsRating ?? true}
                    onChange={(e) =>
                      onChangeOutroConfig({
                        ...outroConfig,
                        showReviewsRating: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Show Factory Guarantee Badge</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={outroConfig.showGuaranteeBadge ?? true}
                    onChange={(e) =>
                      onChangeOutroConfig({
                        ...outroConfig,
                        showGuaranteeBadge: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Show Store Domain Tag</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={outroConfig.showDomain ?? true}
                    onChange={(e) =>
                      onChangeOutroConfig({
                        ...outroConfig,
                        showDomain: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic py-2">
              Outro end-card is disabled. Video will end on the final scene.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const IntroOutroStudioSection = React.memo(IntroOutroStudioSectionComponent);
