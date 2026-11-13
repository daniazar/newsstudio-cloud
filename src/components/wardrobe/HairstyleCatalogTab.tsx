"use client";

import React from "react";
import { Search, X, Scissors, Sparkles } from "lucide-react";
import { HairstyleCard } from "./HairstyleCard";
import { HairstyleBlueprintInspector } from "./HairstyleBlueprintInspector";
import { SalonColorSelector } from "./SalonColorSelector";
import {
  PersonaItem,
  HAIR_GENDER_FILTERS,
  HAIR_CATEGORIES,
  HAIR_LENGTHS,
  HAIR_COLOR_FILTERS,
} from "./types";
import { HairStyleItem, HairColorSwatch } from "@/lib/wardrobe/hairCatalog";

export interface HairstyleCatalogTabProps {
  personas: PersonaItem[];
  currentPersona: PersonaItem;
  selectedPersonaId: string;
  onPersonaChange: (id: string) => void;
  filteredHairstyles: HairStyleItem[];
  activeHairstyle: HairStyleItem;
  onSelectHairstyle: (hair: HairStyleItem) => void;
  onInpaintSelect: (hair: HairStyleItem) => void;
  // Filters
  selectedHairGender: string;
  onSelectHairGender: (gender: string) => void;
  selectedHairCategory: string;
  onSelectHairCategory: (category: string) => void;
  selectedHairLength: string;
  onSelectHairLength: (length: string) => void;
  selectedHairColorFamily: string;
  onSelectHairColorFamily: (color: string) => void;
  hairSearch: string;
  onSearchChange: (search: string) => void;
  onResetFilters: () => void;
  // Dynamic Swatch
  selectedSwatch: HairColorSwatch | null;
  onSwatchSelect: (swatch: HairColorSwatch) => void;
  onResetSwatch: () => void;
  onOpenAiBlueprintModal?: (options?: { initialType?: "attire" | "hair" }) => void;
}

export const HairstyleCatalogTab = React.memo(function HairstyleCatalogTab({
  personas,
  currentPersona,
  selectedPersonaId,
  onPersonaChange,
  filteredHairstyles,
  activeHairstyle,
  onSelectHairstyle,
  onInpaintSelect,
  selectedHairGender,
  onSelectHairGender,
  selectedHairCategory,
  onSelectHairCategory,
  selectedHairLength,
  onSelectHairLength,
  selectedHairColorFamily,
  onSelectHairColorFamily,
  hairSearch,
  onSearchChange,
  onResetFilters,
  selectedSwatch,
  onSwatchSelect,
  onResetSwatch,
  onOpenAiBlueprintModal,
}: HairstyleCatalogTabProps) {
  return (
    <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
      {/* Left Side: Persona Switcher & 18-Hairstyle Grid */}
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

        {/* Filter Pills */}
        <div className="flex flex-col gap-2.5">
          {/* Gender Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {HAIR_GENDER_FILTERS.map((gf) => (
              <button
                key={gf.id}
                onClick={() => onSelectHairGender(gf.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedHairGender === gf.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-surface-raised border border-border/80 text-muted hover:text-white"
                }`}
              >
                {gf.label}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
              {HAIR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectHairCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedHairCategory === cat.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/80 shadow-md shadow-purple-500/10"
                      : "bg-surface-raised border border-border/80 text-subtle hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* AI Generate Hairstyle Action & Search Input */}
            <div className="flex items-center gap-2 shrink-0">
              {onOpenAiBlueprintModal && (
                <button
                  type="button"
                  onClick={() => onOpenAiBlueprintModal({ initialType: "hair" })}
                  aria-label="Generate AI Hairstyle Blueprint"
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>+ AI Generate Hairstyle</span>
                </button>
              )}

              <div className="relative shrink-0 w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter hairstyles..."
                  value={hairSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  aria-label="Filter hairstyles"
                  className="w-full bg-surface-raised border border-border/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500/60 font-mono transition-all"
                />
                {hairSearch && (
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

          {/* Hair Length Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-mono uppercase text-muted font-bold mr-1">
              Length:
            </span>
            {HAIR_LENGTHS.map((hl) => (
              <button
                key={hl.id}
                onClick={() => onSelectHairLength(hl.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedHairLength === hl.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-surface-raised/60 border border-border/60 text-muted hover:text-white"
                }`}
              >
                {hl.label}
              </button>
            ))}
          </div>

          {/* Hair Color Family Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-mono uppercase text-muted font-bold mr-1">
              Color:
            </span>
            {HAIR_COLOR_FILTERS.map((cf) => (
              <button
                key={cf.id}
                onClick={() => onSelectHairColorFamily(cf.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedHairColorFamily === cf.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-surface-raised/60 border border-border/60 text-muted hover:text-white"
                }`}
              >
                {cf.dot && (
                  <span
                    className="w-2 h-2 rounded-full border border-white/20"
                    style={{ backgroundColor: cf.dot }}
                  />
                )}
                <span>{cf.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Hair Color Science: Salon Techniques & Dual-Tone Swatches */}
        <SalonColorSelector
          activeSwatch={selectedSwatch}
          onSwatchSelect={(swatch) => {
            if (swatch) {
              onSwatchSelect(swatch);
            } else {
              onResetSwatch();
            }
          }}
          showFormulaBadge={true}
        />

        {/* Hairstyle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          {filteredHairstyles.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-3">
              <Scissors className="w-8 h-8 text-muted/60" />
              <p className="text-xs font-mono text-muted">
                No hairstyles found matching your filters
              </p>
              <button
                onClick={onResetFilters}
                className="text-xs font-mono text-purple-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredHairstyles.map((hair) => (
              <HairstyleCard
                key={hair.id}
                hair={hair}
                variant="catalog"
                isSelected={activeHairstyle.id === hair.id}
                activeSwatch={selectedSwatch}
                onSelect={onSelectHairstyle}
                onInpaintSelect={onInpaintSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Side: Hairstyle Technical Blueprint */}
      <HairstyleBlueprintInspector
        hairstyle={activeHairstyle}
        selectedSwatch={selectedSwatch}
        onSwatchSelect={onSwatchSelect}
        onResetSwatch={onResetSwatch}
        onInpaintTrigger={onInpaintSelect}
      />
    </div>
  );
});
