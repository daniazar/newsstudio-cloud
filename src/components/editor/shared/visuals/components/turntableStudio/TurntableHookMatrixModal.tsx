/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableHookMatrixModal.tsx
 *
 * Paid Social A/B Hook Variation Matrix for Neural Product Turntable Studio:
 * Generates a high-performing 3-Hook Ad Pack (Macro Craftsmanship, Social Proof, Radar Blitz)
 * from a single turntable master video, perfectly mapped to Meta Ads / TikTok Ads testing.
 */

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Zap,
  Eye,
  Check,
  Flame,
  MessageSquareQuote,
  LucideIcon,
} from "lucide-react";
import { AdScene, ProductSpec } from "@/lib/types/ecommerce";

interface TurntableHookMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScene: AdScene;
  activeTurntableUrl: string;
  productSpec?: ProductSpec;
  accentColor?: string;
  onApplyHookVariants: (variants: AdScene[]) => void;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
}

interface HookVariationDraft {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: LucideIcon;
  hookScript: string;
  headline: string;
  socialProofType: "rating" | "buyer_quote" | "scarcity_radar";
  scarcityText?: string;
}

export function TurntableHookMatrixModal({
  isOpen,
  onClose,
  currentScene,
  activeTurntableUrl,
  productSpec,
  accentColor = "#06b6d4",
  onApplyHookVariants,
  toast,
}: TurntableHookMatrixModalProps) {
  const prodTitle = productSpec?.title || "Premium Product";
  const firstReview = productSpec?.topReviews?.[0];

  const [variations, setVariations] = useState<HookVariationDraft[]>([
    {
      id: "hook_macro",
      title: "Angle A: Micro-Craftsmanship",
      subtitle: "Target high-intent shoppers scrutinizing materials & build quality",
      badge: "Quality Focus",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      icon: Eye,
      hookScript: `Take a closer look at the precision engineering of the ${prodTitle}. Notice how every single contour and finish is crafted with zero compromise.`,
      headline: "PRECISION CRAFTSMANSHIP",
      socialProofType: "rating",
    },
    {
      id: "hook_social_proof",
      title: "Angle B: Social Proof & Validation",
      subtitle: "Convert skeptical shoppers with authentic reviews & peer trust",
      badge: "High Conversion",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: MessageSquareQuote,
      hookScript: `There's a reason the ${prodTitle} has hundreds of verified 5-star ratings. Watch what happens when you inspect the real build quality.`,
      headline: "RATED 5 STARS BY BUYERS",
      socialProofType: "buyer_quote",
    },
    {
      id: "hook_radar_blitz",
      title: "Angle C: High-Urgency Feature Blitz",
      subtitle: "Stop feed scrollers instantly with fast radar pins & stock scarcity",
      badge: "Viral Hook",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
      icon: Flame,
      hookScript: `⚡ Stop scrolling. Here are the 3 breakthrough features that make the ${prodTitle} sell out every single restock.`,
      headline: "⚡ LIMITED RESTOCK LIVE",
      socialProofType: "scarcity_radar",
      scarcityText: "⚡ ONLY 7 LEFT IN STOCK",
    },
  ]);

  if (!isOpen) return null;

  const handleUpdateScript = (id: string, text: string) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, hookScript: text } : v))
    );
  };

  const handleGeneratePack = () => {
    const baseIndex = currentScene.sceneIndex ?? 0;

    const newScenes: AdScene[] = variations.map((variant, idx) => {
      const sceneClone: AdScene = {
        ...currentScene,
        id: `scene_hook_${variant.id}_${Date.now()}`,
        sceneIndex: baseIndex + idx,
        sceneType: "product_turntable",
        headline: variant.headline,
        spokenVoiceoverScript: variant.hookScript,
        customTurntableVideoUrl: activeTurntableUrl,
        primaryMediaUrl: activeTurntableUrl,
        turntableAudioAmbient: true,
        turntableAudioFoley: true,
        turntableAudioChimes: true,
        enableSpecularSheen: true,
      };

      if (variant.socialProofType === "rating") {
        sceneClone.turntableSocialProof = {
          showRatingBadge: true,
          rating: productSpec?.rating || 4.9,
          reviewCount: productSpec?.reviewCount || 1420,
          trustSeal: "30_day_guarantee",
        };
      } else if (variant.socialProofType === "buyer_quote") {
        sceneClone.turntableSocialProof = {
          showRatingBadge: true,
          rating: productSpec?.rating || 4.9,
          reviewCount: productSpec?.reviewCount || 1420,
          showBuyerQuote: true,
          buyerQuoteText:
            firstReview?.body || "Exceptional finish and precision. Definitely worth every penny.",
          buyerAuthor: firstReview?.author ? `${firstReview.author} — Verified Buyer` : "Elena M. — Verified Buyer",
          trustSeal: "30_day_guarantee",
        };
      } else if (variant.socialProofType === "scarcity_radar") {
        sceneClone.turntableSocialProof = {
          showScarcityTicker: true,
          scarcityText: variant.scarcityText || "⚡ ONLY 7 LEFT IN STOCK",
        };
        sceneClone.turntableEnableRadarPins = true;
        sceneClone.turntableRadarPins = currentScene.turntableRadarPins?.length
          ? currentScene.turntableRadarPins
          : [
              {
                id: `pin_cnc_${Date.now()}`,
                x: 28,
                y: 36,
                label: "Precision CNC Aluminum",
                startFrame: 12,
                durationFrames: 120,
                pulseColor: accentColor,
              },
              {
                id: `pin_haptic_${Date.now()}`,
                x: 72,
                y: 52,
                label: "Haptic Feedback Dials",
                startFrame: 24,
                durationFrames: 120,
                pulseColor: accentColor,
              },
            ];
      }

      return sceneClone;
    });

    onApplyHookVariants(newScenes);
    toast("3-Hook Pack Created", "Created 3 paid social hook variations ready for A/B testing!", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  Paid Social 1-Click 3-Hook Variation Matrix
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Meta & TikTok Ready
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Generate 3 high-converting ad angles from this turntable video for split testing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body: 3 Variation Cards */}
        <div className="p-4 overflow-y-auto space-y-3.5 custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {variations.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-1 rounded bg-zinc-800 text-zinc-300">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${v.badgeColor}`}>
                        {v.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{v.title}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">{v.subtitle}</p>
                    </div>

                    <div>
                      <label className="text-[9.5px] text-zinc-400 font-semibold block mb-1">
                        Hook Script (Voiceover)
                      </label>
                      <textarea
                        rows={3}
                        value={v.hookScript}
                        onChange={(e) => handleUpdateScript(v.id, e.target.value)}
                        className="w-full text-[11px] bg-zinc-800/80 border border-zinc-700 rounded-lg p-2 text-zinc-200 focus:border-cyan-400 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-cyan-400" />
                      <span>Headline: <strong className="text-zinc-200">{v.headline}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-cyan-400" />
                      <span>
                        Overlay:{" "}
                        <strong className="text-zinc-200">
                          {v.socialProofType === "rating"
                            ? "5-Star Rating + Sheen"
                            : v.socialProofType === "buyer_quote"
                            ? "Buyer Quote Card"
                            : "Scarcity Ticker + Radar"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Generates 3 ad scenes with pre-configured audio ducking & HUD overlays
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGeneratePack}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create 3-Hook Ad Pack</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
