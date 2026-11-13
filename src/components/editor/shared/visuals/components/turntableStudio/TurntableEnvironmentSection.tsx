/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableEnvironmentSection.tsx
 *
 * Contextual Environment & Semantic Background selector:
 * Displays 24+ curated commercial backdrops across 9 realms,
 * with 1-click AI Recommendation and customizable backdrop prompt.
 */

import React, { useState } from "react";
import { Sparkles, Wand2, Compass, Check } from "lucide-react";
import {
  TURNTABLE_REALMS,
  TURNTABLE_ENVIRONMENT_PRESETS,
  TurntableEnvironmentPreset,
  getEnvironmentById,
} from "@/lib/ecommerce/turntableEnvironmentEngine";

interface TurntableEnvironmentSectionProps {
  environmentId: string;
  onSelectEnvironment: (preset: TurntableEnvironmentPreset) => void;
  environmentPrompt: string;
  onChangeEnvironmentPrompt: (prompt: string) => void;
  onAutoRecommendEnvironment: () => void;
}

export function TurntableEnvironmentSection({
  environmentId,
  onSelectEnvironment,
  environmentPrompt,
  onChangeEnvironmentPrompt,
  onAutoRecommendEnvironment,
}: TurntableEnvironmentSectionProps) {
  const [selectedRealm, setSelectedRealm] = useState<string>("all");
  const [_isExpanded, _setIsExpanded] = useState<boolean>(true);

  const activePreset = getEnvironmentById(environmentId) || TURNTABLE_ENVIRONMENT_PRESETS[0];

  const filteredPresets =
    selectedRealm === "all"
      ? TURNTABLE_ENVIRONMENT_PRESETS
      : TURNTABLE_ENVIRONMENT_PRESETS.filter((p) => p.realm === selectedRealm);

  return (
    <div className="space-y-2.5 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
            3. Contextual Environment & Backdrop
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAutoRecommendEnvironment}
            className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Auto-match the best commercial environment based on product title and keywords"
          >
            <Wand2 className="h-3 w-3" />
            <span>✨ AI Recommend</span>
          </button>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {activePreset.name}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-zinc-400 leading-relaxed">
        Select a thematic background matched to your product (rooftop for luggage, mountain road for sneakers, espresso bar for coffee).
      </p>

      {/* Realm Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[9.5px]">
        <button
          type="button"
          onClick={() => setSelectedRealm("all")}
          className={`px-2 py-1 rounded-md font-bold shrink-0 transition-colors cursor-pointer ${
            selectedRealm === "all"
              ? "bg-amber-500 text-black shadow-sm"
              : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          All (24)
        </button>
        {TURNTABLE_REALMS.map((realm) => (
          <button
            key={realm.id}
            type="button"
            onClick={() => setSelectedRealm(realm.id)}
            className={`px-2 py-1 rounded-md font-bold shrink-0 transition-colors cursor-pointer ${
              selectedRealm === realm.id
                ? "bg-amber-500 text-black shadow-sm"
                : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {realm.label}
          </button>
        ))}
      </div>

      {/* Preset Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {filteredPresets.map((preset) => {
          const isSelected = preset.id === environmentId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectEnvironment(preset)}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "border-amber-500 bg-amber-500/15 text-white shadow-sm shadow-amber-950/40"
                  : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/70 text-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10.5px] font-bold truncate leading-tight">
                  {preset.name}
                </span>
                {isSelected && (
                  <Check className="h-3 w-3 text-amber-400 shrink-0 ml-1" />
                )}
              </div>
              <p className="text-[8.5px] text-zinc-400 line-clamp-1 leading-tight">
                {preset.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Environment Prompt Details */}
      <div className="pt-1 border-t border-zinc-800/80 space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[9.5px] font-bold text-zinc-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Environment Description Prompt</span>
          </label>
          <span className="text-[8.5px] text-zinc-500 font-mono">
            {environmentPrompt.length} chars
          </span>
        </div>
        <textarea
          rows={2}
          value={environmentPrompt}
          onChange={(e) => onChangeEnvironmentPrompt(e.target.value)}
          placeholder="Detailed environment and lighting prompt..."
          className="w-full text-[10.5px] font-mono leading-relaxed bg-black/90 border border-zinc-800 hover:border-zinc-700 focus:border-amber-500/50 rounded-lg p-2 text-zinc-300 focus:outline-none custom-scrollbar"
        />
      </div>
    </div>
  );
}
