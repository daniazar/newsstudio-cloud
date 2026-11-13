/**
 * src/components/editor/shared/visuals/components/ComparisonSlotsPicker.tsx
 *
 * Before & After Target Slots selection card for comparison modes (before_after_wipe, room_staging).
 * Displays primary (After) and secondary (Before) visual slots, active target switching, and 1-click swap.
 */

import React from "react";
import { AdScene } from "@/lib/types/ecommerce";
import { ArrowRightLeft, Image as ImageIcon } from "lucide-react";

export interface ComparisonSlotsPickerProps {
  currentScene: AdScene;
  activeSlot: "primary" | "secondary";
  onSelectSlot: (slot: "primary" | "secondary") => void;
  onSwapBeforeAfter: () => void;
}

export const ComparisonSlotsPicker: React.FC<ComparisonSlotsPickerProps> = ({
  currentScene,
  activeSlot,
  onSelectSlot,
  onSwapBeforeAfter,
}) => {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-bold text-blue-200">
            Comparison Image Setup
          </span>
        </div>
        <button
          type="button"
          onClick={onSwapBeforeAfter}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>⇄ Invert Before & After</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Slot A: BEFORE (Secondary Media) */}
        <button
          type="button"
          onClick={() => onSelectSlot("secondary")}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlot === "secondary"
              ? "border-blue-400 bg-blue-500/10 ring-2 ring-blue-500/30"
              : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-200">
              1. BEFORE (Original)
            </span>
            {activeSlot === "secondary" && (
              <span className="text-[9px] bg-blue-500 text-black px-1.5 py-0.5 rounded font-bold">
                SELECTING
              </span>
            )}
          </div>
          <div className="relative aspect-video w-full rounded-lg bg-black/60 overflow-hidden border border-zinc-800">
            {currentScene.secondaryMediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentScene.secondaryMediaUrl}
                alt="Before image"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-400 p-2 text-center">
                <ImageIcon className="h-5 w-5 text-blue-400 mb-1 opacity-70" />
                <span className="text-[10px] font-bold text-zinc-300">No Before Image</span>
                <span className="text-[9px] text-blue-400">Click gallery below to assign</span>
              </div>
            )}
          </div>
        </button>

        {/* Slot B: AFTER (Primary Media) */}
        <button
          type="button"
          onClick={() => onSelectSlot("primary")}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeSlot === "primary"
              ? "border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-500/30"
              : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-200">
              2. AFTER (Transformation)
            </span>
            {activeSlot === "primary" && (
              <span className="text-[9px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-bold">
                SELECTING
              </span>
            )}
          </div>
          <div className="relative aspect-video w-full rounded-lg bg-black/60 overflow-hidden border border-zinc-800">
            {currentScene.primaryMediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentScene.primaryMediaUrl}
                alt="After image"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-400 p-2 text-center">
                <ImageIcon className="h-5 w-5 text-emerald-400 mb-1 opacity-70" />
                <span className="text-[10px] font-bold text-zinc-300">No After Image</span>
                <span className="text-[9px] text-emerald-400">Click gallery below to assign</span>
              </div>
            )}
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between bg-zinc-900/80 rounded-lg px-3 py-2 border border-zinc-800 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">Targeting:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold text-xs ${
              activeSlot === "secondary"
                ? "bg-blue-500 text-black shadow-sm"
                : "bg-emerald-500 text-black shadow-sm"
            }`}
          >
            {activeSlot === "secondary" ? "1. BEFORE (Original)" : "2. AFTER (Transformation)"}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 hidden sm:inline">
          Click a card above to switch target slot
        </span>
      </div>
    </div>
  );
};
