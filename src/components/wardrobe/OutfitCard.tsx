"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { LazyThumbnail } from "./LazyThumbnail";

export interface OutfitCardItem {
  id: string;
  name: string;
  category: string;
  prompt: string;
  imageUrl?: string;
  gender?: string;
  samPrompt?: string;
  description?: string;
}

export interface OutfitCardProps {
  outfit: OutfitCardItem;
  isSelected?: boolean;
  isGenerating?: boolean;
  priority?: boolean;
  variant?: "lookbook" | "compact";
  onSelect: (outfit: OutfitCardItem) => void;
  onGenerate?: (outfit: OutfitCardItem) => void;
  onInpaintSelect?: (outfit: OutfitCardItem) => void;
}

export const OutfitCard = React.memo(function OutfitCard({
  outfit,
  isSelected = false,
  isGenerating = false,
  priority = false,
  variant = "lookbook",
  onSelect,
  onGenerate,
  onInpaintSelect,
}: OutfitCardProps) {
  const genderIcon =
    outfit.gender === "female" ? "🎙️" : outfit.gender === "male" ? "👔" : "🧥";

  if (variant === "compact") {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select outfit: ${outfit.name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(outfit);
          }
        }}
        onClick={() => onSelect(outfit)}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative ${
          isSelected
            ? "border-purple-500 bg-purple-500/10 shadow-md ring-1 ring-purple-500/50"
            : "border-border/80 bg-surface hover:border-border"
        }`}
      >
        <div className="relative">
          <LazyThumbnail
            src={outfit.imageUrl}
            alt={outfit.name}
            aspectRatio="aspect-[9/13]"
            priority={priority}
            category={outfit.category}
            fallbackIcon={genderIcon}
          />
          <div className="absolute top-1 left-1 flex items-center gap-1 pointer-events-none z-10">
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-black/80 text-white">
              {genderIcon} {outfit.category}
            </span>
          </div>
        </div>
        <p className="text-[11px] font-bold text-foreground truncate">{outfit.name}</p>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select outfit: ${outfit.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(outfit);
        }
      }}
      onClick={() => onSelect(outfit)}
      className={`glass-panel-raised p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
        isSelected
          ? "border-purple-500/80 bg-purple-500/10 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40"
          : "border-border/80 hover:border-border"
      }`}
    >
      <div className="relative">
        <LazyThumbnail
          src={outfit.imageUrl}
          alt={outfit.name}
          aspectRatio="aspect-[16/10]"
          priority={priority}
          category={outfit.category}
          fallbackIcon={genderIcon}
        />

        <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white border border-white/10 flex items-center gap-1">
            <span>{genderIcon}</span>
            <span>{outfit.category}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <p className="text-xs font-bold text-foreground truncate">{outfit.name}</p>
        <p className="text-[10px] text-muted line-clamp-1 mt-0.5">{outfit.prompt}</p>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        {onGenerate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate(outfit);
            }}
            disabled={isGenerating}
            aria-label={isGenerating ? `Synthesizing ${outfit.name}` : `Generate look: ${outfit.name}`}
            className="flex-1 py-1.5 px-2 rounded-lg bg-surface border border-border hover:bg-accent hover:text-white text-[10px] font-bold text-foreground transition-colors text-center"
          >
            {isGenerating ? "Synthesizing..." : "⚡ Generate Look"}
          </button>
        )}
        {onInpaintSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInpaintSelect(outfit);
            }}
            className="p-1.5 rounded-lg bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600 hover:text-white text-purple-300 text-[10px] font-bold transition-colors"
            title="Inpaint onto Video"
            aria-label="Inpaint onto Video"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});
