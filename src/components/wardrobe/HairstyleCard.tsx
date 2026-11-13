"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { LazyThumbnail } from "./LazyThumbnail";
import { HairStyleItem, HairColorSwatch, getSwatchCssBackground } from "@/lib/wardrobe/hairCatalog";
import { getColorFamilyHex } from "./types";

export interface HairstyleCardProps {
  hair: HairStyleItem;
  isSelected?: boolean;
  variant?: "catalog" | "compact";
  activeSwatch?: HairColorSwatch | null;
  onSelect: (hair: HairStyleItem) => void;
  onInpaintSelect?: (hair: HairStyleItem) => void;
}

export const HairstyleCard = React.memo(function HairstyleCard({
  hair,
  isSelected = false,
  variant = "catalog",
  activeSwatch,
  onSelect,
  onInpaintSelect,
}: HairstyleCardProps) {
  const genderIcon =
    hair.gender === "female" ? "🎙️ FEMALE" : hair.gender === "male" ? "👔 MALE" : "🧥 UNISEX";

  if (variant === "compact") {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select hairstyle: ${hair.name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(hair);
          }
        }}
        onClick={() => onSelect(hair)}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative ${
          isSelected
            ? "border-purple-500 bg-purple-500/10 shadow-md ring-1 ring-purple-500/50"
            : "border-border/80 bg-surface hover:border-border"
        }`}
      >
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/10">
          <LazyThumbnail
            src={hair.imageUrl}
            alt={hair.name}
            aspectRatio="aspect-video"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1 left-1 flex items-center gap-1">
            <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/80 text-purple-300 border border-purple-500/30">
              {hair.hairLength.toUpperCase()}
            </span>
            {isSelected && activeSwatch?.isDualTone && (
              <span className="text-[7px] font-mono px-1 py-0.2 rounded bg-purple-950/90 text-purple-300 border border-purple-500/50 uppercase">
                {activeSwatch.technique}
              </span>
            )}
          </div>
          <div className="absolute bottom-1 right-1">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block shadow-sm"
              style={{
                background: isSelected && activeSwatch ? getSwatchCssBackground(activeSwatch) : getColorFamilyHex(hair.colorFamily),
              }}
              title={isSelected && activeSwatch ? activeSwatch.name : hair.hairColor}
            />
          </div>
        </div>
        <div className="min-w-0">
          <h5 className="text-[11px] font-bold text-foreground truncate">{hair.name}</h5>
          <span className="text-[9px] font-mono text-muted truncate block">
            {isSelected && activeSwatch ? activeSwatch.name : hair.hairColor}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(hair)}
      className={`group relative rounded-2xl p-3 flex flex-col justify-between transition-all cursor-pointer border ${
        isSelected
          ? "bg-purple-950/20 border-purple-500 ring-2 ring-purple-500/50 shadow-xl shadow-purple-500/10"
          : "bg-surface-raised border-border/80 hover:border-purple-500/50 hover:bg-surface-raised/80"
      }`}
    >
      <div className="flex flex-col gap-2.5">
        {/* 4-Panel Thumbnail Preview */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner">
          <LazyThumbnail
            src={hair.imageUrl}
            alt={hair.name}
            aspectRatio="aspect-video"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Badges on preview */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-purple-300 border border-purple-500/30">
              {hair.hairLength.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-emerald-300 border border-emerald-500/30">
              {hair.hairTexture.toUpperCase()}
            </span>
            {isSelected && activeSwatch?.isDualTone && (
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-950/90 backdrop-blur-sm text-purple-300 border border-purple-500/50 uppercase">
                {activeSwatch.technique}
              </span>
            )}
          </div>
          <div className="absolute bottom-2 right-2">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-foreground">
              {genderIcon}
            </span>
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400 font-bold">
              {hair.category.replace(/_/g, " ")}
            </span>
          </div>
          <h4 className="text-xs font-bold text-foreground group-hover:text-purple-300 transition-colors line-clamp-1">
            {hair.name}
          </h4>
          <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-relaxed">
            {hair.description}
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted truncate max-w-[140px]">
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0 shadow-inner"
            style={{
              background: isSelected && activeSwatch ? getSwatchCssBackground(activeSwatch) : getColorFamilyHex(hair.colorFamily),
            }}
            title={isSelected && activeSwatch ? activeSwatch.name : hair.hairColor}
          />
          <span className="truncate">{isSelected && activeSwatch ? activeSwatch.name : hair.hairColor}</span>
        </div>
        {onInpaintSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInpaintSelect(hair);
            }}
            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Sparkles className="w-3 h-3" />
            <span>Inpaint on Loop →</span>
          </button>
        )}
      </div>
    </div>
  );
});
