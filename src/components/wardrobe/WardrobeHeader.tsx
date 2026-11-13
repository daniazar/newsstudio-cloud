"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Shirt, Scissors, Plus, Clock, Eye, Zap, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TransformationType } from "./types";

export interface WardrobeHeaderProps {
  activeTab: "lookbook" | "inpainter" | "hairstyles";
  setActiveTab: (tab: "lookbook" | "inpainter" | "hairstyles") => void;
  onOpenCustomModal: () => void;
  onOpenAiBlueprintModal?: (options?: { initialType?: "attire" | "hair" }) => void;
  transformationType?: TransformationType;
  targetPersonaName?: string;
  // Inpainter mode actions
  recentJobsCount?: number;
  onOpenHistoryModal?: () => void;
  onLoadVerifiedDemo?: () => void;
  onTriggerInpaint?: () => void;
  isInpainting?: boolean;
  // Lookbook mode actions
  isBatchGenerating?: boolean;
  onBatchGenerate?: () => void;
  // Saved persona looks
  onOpenSavedLooks?: () => void;
  savedLooksCount?: number;
}

export const WardrobeHeader = React.memo(function WardrobeHeader({
  activeTab,
  setActiveTab,
  onOpenCustomModal,
  onOpenAiBlueprintModal,
  transformationType = "attire",
  targetPersonaName,
  recentJobsCount = 0,
  onOpenHistoryModal,
  onLoadVerifiedDemo,
  onTriggerInpaint,
  isInpainting = false,
  isBatchGenerating = false,
  onBatchGenerate,
  onOpenSavedLooks,
  savedLooksCount = 0,
}: WardrobeHeaderProps) {
  return (
    <header className="min-h-16 h-auto py-2.5 sm:py-0 sm:h-16 px-4 sm:px-6 border-b border-border/80 glass-panel flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 z-20">
      <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
        <Link
          href="/newsroom"
          aria-label="Back to Control Center"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-border/80 text-subtle hover:text-white hover:border-white/20 transition-all text-xs font-mono font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Control Center</span>
        </Link>
        <div className="h-4 w-px bg-border/80 hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
          <h1 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground hidden md:block">
            Wardrobe Studio & Inpainter
          </h1>
        </div>

        {/* Mode Switcher Tabs */}
        <div role="tablist" aria-label="Studio mode selection" className="flex items-center p-1 rounded-xl bg-black/40 border border-border/80">
          <button
            role="tab"
            aria-selected={activeTab === "inpainter"}
            aria-label="Video Inpainter mode"
            onClick={() => setActiveTab("inpainter")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === "inpainter"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-muted hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Video Inpainter</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-400/20 text-purple-200 border border-purple-400/30 hidden lg:inline">
              MiniMax H3
            </span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "lookbook"}
            aria-label="60-Attire Lookbook mode"
            onClick={() => setActiveTab("lookbook")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === "lookbook"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-muted hover:text-white"
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>60-Attire Lookbook</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "hairstyles"}
            aria-label="18-Hairstyle Catalog mode"
            onClick={() => setActiveTab("hairstyles")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === "hairstyles"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-muted hover:text-white"
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>18-Hairstyle Catalog</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {onOpenAiBlueprintModal && (
          <Button
            size="sm"
            variant="emerald-glow"
            onClick={() => onOpenAiBlueprintModal({ initialType: activeTab === "hairstyles" ? "hair" : "attire" })}
            aria-label="AI Generate Style Blueprint"
            className="font-mono text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/15"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">+ AI Generate Style</span>
            <span className="sm:hidden">+ AI Style</span>
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          onClick={onOpenCustomModal}
          aria-label="Create custom attire"
          className="font-mono text-xs flex items-center gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/10 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">+ Custom Attire</span>
          <span className="sm:hidden">+ Custom</span>
        </Button>

        {onOpenSavedLooks && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenSavedLooks}
            aria-label="View saved persona looks"
            className="font-mono text-xs flex items-center gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 shadow-sm"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
            <span className="hidden sm:inline">Saved Looks</span>
            <span className="sm:hidden">Looks</span>
            {savedLooksCount !== undefined && savedLooksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-mono">
                {savedLooksCount}
              </span>
            )}
          </Button>
        )}

        {activeTab === "inpainter" ? (
          <div className="flex items-center gap-2">
            {onOpenHistoryModal && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onOpenHistoryModal}
                aria-label="View recent wardrobe inpaint jobs"
                className="font-mono text-xs flex items-center gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
              >
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Job History</span>
                <span className="sm:hidden">History</span>
                {recentJobsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-200 text-[10px] font-mono">
                    {recentJobsCount}
                  </span>
                )}
              </Button>
            )}
            {onLoadVerifiedDemo && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onLoadVerifiedDemo}
                aria-label="Load verified demo video"
                className="font-mono text-xs flex items-center gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
              >
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Load Verified Demo</span>
                <span className="sm:hidden">Demo</span>
              </Button>
            )}
            {onTriggerInpaint && (
              <Button
                size="sm"
                variant="emerald-glow"
                isLoading={isInpainting}
                onClick={onTriggerInpaint}
                aria-label={
                  transformationType === "persona"
                    ? `Transfer Identity: ${targetPersonaName || "Target Persona"} (Preserve Outfit & Motion)`
                    : transformationType === "compound"
                    ? "Execute Complete Makeover"
                    : transformationType === "hair"
                    ? "Transform Hairstyle"
                    : "Transform video outfit"
                }
                className="font-mono text-xs flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {isInpainting
                    ? "Inpainting..."
                    : transformationType === "persona"
                    ? `Transfer Identity: ${targetPersonaName || "Target Persona"} (Preserve Outfit & Motion)`
                    : transformationType === "compound"
                    ? "Execute Complete Makeover"
                    : transformationType === "hair"
                    ? "Transform Hairstyle"
                    : "Transform Video Outfit"}
                </span>
              </Button>
            )}
          </div>
        ) : activeTab === "lookbook" && onBatchGenerate ? (
          <Button
            size="sm"
            variant="emerald-glow"
            isLoading={isBatchGenerating}
            onClick={onBatchGenerate}
            aria-label="Batch render attires"
            className="font-mono text-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Batch Render Attires</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
});
