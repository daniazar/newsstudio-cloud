"use client";

import React from "react";
import { Search, X, Shirt, Sparkles } from "lucide-react";
import { VirtualGrid } from "./VirtualOutfitGrid";
import { OutfitCard } from "./OutfitCard";
import { AttireBlueprintInspector } from "./AttireBlueprintInspector";
import {
  PersonaItem,
  OutfitItem,
  SamAnalysisResult,
  GENDER_FILTERS,
  CATEGORIES,
  LOOKBOOK_GRID_RESPONSIVE_COLS,
} from "./types";

export interface AttireLookbookTabProps {
  personas: PersonaItem[];
  currentPersona: PersonaItem;
  selectedPersonaId: string;
  onPersonaChange: (id: string) => void;
  filteredOutfits: OutfitItem[];
  activeOutfit: OutfitItem;
  onSelectOutfit: (outfit: OutfitItem) => void;
  generatingOutfitId: string | null;
  onGenerateSingle: (outfit: OutfitItem) => void;
  onInpaintSelect: (outfit: OutfitItem) => void;
  selectedGender: string;
  onSelectGender: (gender: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  outfitSearch: string;
  onSearchChange: (search: string) => void;
  // Right side inspector props
  samAnalysisData: Record<string, SamAnalysisResult>;
  analyzingOutfitId: string | null;
  onAnalyzeSamVision: (outfit: OutfitItem) => void;
  storyId?: string | null;
  onApplyToTrackPrompt?: (samPrompt?: string) => void;
  onOpenAiBlueprintModal?: (options?: { initialType?: "attire" | "hair" }) => void;
}

export const AttireLookbookTab = React.memo(function AttireLookbookTab({
  personas,
  currentPersona,
  selectedPersonaId,
  onPersonaChange,
  filteredOutfits,
  activeOutfit,
  onSelectOutfit,
  generatingOutfitId,
  onGenerateSingle,
  onInpaintSelect,
  selectedGender,
  onSelectGender,
  selectedCategory,
  onSelectCategory,
  outfitSearch,
  onSearchChange,
  samAnalysisData,
  analyzingOutfitId,
  onAnalyzeSamVision,
  storyId,
  onApplyToTrackPrompt,
  onOpenAiBlueprintModal,
}: AttireLookbookTabProps) {
  return (
    <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
      {/* Left Side: Persona Selector & 60-Outfit Grid */}
      <div className="w-full xl:w-3/5 p-6 md:p-8 border-b xl:border-b-0 xl:border-r border-border/80 flex flex-col gap-6 overflow-y-visible xl:overflow-y-auto shrink-0 xl:shrink">
        {/* Persona Switcher Bar */}
        <div className="glass-panel-raised flex items-center justify-between p-5 rounded-3xl border border-border/80 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-black/40 border border-purple-500/40 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentPersona.avatarUrl}
                alt={currentPersona.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{currentPersona.name}</h3>
              <p className="text-[10px] text-muted font-mono font-semibold">
                {currentPersona.title}
              </p>
            </div>
          </div>

          <select
            value={selectedPersonaId}
            onChange={(e) => onPersonaChange(e.target.value)}
            aria-label="Select anchor persona"
            className="bg-surface-raised border border-border/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-purple-500/60 transition-all cursor-pointer"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.title})
              </option>
            ))}
          </select>
        </div>

        {/* Gender & Category Filter Pills */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {GENDER_FILTERS.map((gf) => (
              <button
                key={gf.id}
                onClick={() => onSelectGender(gf.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGender === gf.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-surface-raised border border-border/80 text-muted hover:text-white"
                }`}
              >
                {gf.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/80 shadow-md shadow-purple-500/10"
                      : "bg-surface-raised border border-border/80 text-subtle hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* AI Generate Attire Action & Search Input */}
            <div className="flex items-center gap-2 shrink-0">
              {onOpenAiBlueprintModal && (
                <button
                  type="button"
                  onClick={() => onOpenAiBlueprintModal({ initialType: "attire" })}
                  aria-label="Generate AI Attire Blueprint"
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>+ AI Generate Attire</span>
                </button>
              )}

              <div className="relative shrink-0 w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter looks..."
                  value={outfitSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  aria-label="Filter looks"
                  className="w-full bg-surface-raised border border-border/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500/60 font-mono transition-all"
                />
                {outfitSearch && (
                  <button
                    onClick={() => onSearchChange("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 60-Outfit Virtual DOM Windowed Grid */}
        <VirtualGrid
          items={filteredOutfits}
          columns={3}
          responsiveColumns={LOOKBOOK_GRID_RESPONSIVE_COLS}
          rowHeight={335}
          overscanRows={3}
          gapClassName="gap-3.5"
          scrollable={false}
          emptyState={
            <div className="p-12 text-center rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-3">
              <Shirt className="w-8 h-8 text-muted/60" />
              <p className="text-xs font-mono text-muted">
                No outfits found matching &ldquo;{outfitSearch}&rdquo;
              </p>
              <button
                onClick={() => {
                  onSearchChange("");
                  onSelectCategory("all");
                }}
                aria-label="Reset filters"
                className="text-xs font-mono text-purple-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          }
          renderItem={(outfit, idx) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              variant="lookbook"
              isSelected={activeOutfit.id === outfit.id}
              isGenerating={generatingOutfitId === outfit.id}
              priority={idx < 6}
              onSelect={onSelectOutfit}
              onGenerate={onGenerateSingle}
              onInpaintSelect={onInpaintSelect}
            />
          )}
        />
      </div>

      {/* Right Side: Active Lookbook Editorial Viewer */}
      <AttireBlueprintInspector
        activeOutfit={activeOutfit}
        samAnalysisData={samAnalysisData}
        analyzingOutfitId={analyzingOutfitId}
        onAnalyzeSamVision={onAnalyzeSamVision}
        onSelectForInpaint={onInpaintSelect}
        selectedPersonaId={selectedPersonaId}
        storyId={storyId}
        onApplyToTrackPrompt={onApplyToTrackPrompt}
      />
    </div>
  );
});
