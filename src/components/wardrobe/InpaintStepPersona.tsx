"use client";

import React from "react";
import { Bookmark } from "lucide-react";
import { PersonaItem, PersonaLoopOption } from "./types";
import { LazyLoopPlayer } from "./LazyLoopPlayer";

export interface InpaintStepPersonaProps {
  personas: PersonaItem[];
  currentPersona: PersonaItem;
  selectedPersonaId: string;
  onPersonaChange: (id: string) => void;
  loops: PersonaLoopOption[];
  selectedLoop: PersonaLoopOption | null;
  onLoopSelect: (loop: PersonaLoopOption) => void;
  onOpenSavedLooks?: () => void;
  savedLooksCount?: number;
}

export const InpaintStepPersona = React.memo(function InpaintStepPersona({
  personas,
  currentPersona,
  selectedPersonaId,
  onPersonaChange,
  loops,
  selectedLoop,
  onLoopSelect,
  onOpenSavedLooks,
  savedLooksCount,
}: InpaintStepPersonaProps) {
  return (
    <>
      {/* Persona Switcher Bar */}
      <div className="glass-panel-raised flex items-center justify-between p-4 rounded-2xl border border-border/80 shadow-md flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-purple-500/40 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPersona.avatarUrl}
              alt={currentPersona.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">{currentPersona.name}</h3>
            <p className="text-[10px] text-muted font-mono">{currentPersona.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSavedLooks && (
            <button
              type="button"
              onClick={onOpenSavedLooks}
              aria-label="View saved looks for this persona"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-mono font-bold"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-300/40" />
              <span className="hidden sm:inline">Saved Looks</span>
              {savedLooksCount !== undefined && savedLooksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[9px] font-mono">
                  {savedLooksCount}
                </span>
              )}
            </button>
          )}

          <select
            value={selectedPersonaId}
            onChange={(e) => onPersonaChange(e.target.value)}
            aria-label="Select anchor persona"
            className="bg-surface-raised border border-border/80 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-purple-500/60 transition-all cursor-pointer"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 1: Candidate Action Loops */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 inline-flex items-center justify-center text-[10px]">
              1
            </span>
            Source Video Action Loop
          </span>
          <span className="text-[10px] font-mono text-muted">
            Select broadcast green screen loop
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {loops.map((loop) => {
            const isSelected = selectedLoop?.id === loop.id;
            return (
              <div
                key={loop.id}
                role="button"
                tabIndex={0}
                aria-label={`Select action loop: ${loop.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onLoopSelect(loop);
                  }
                }}
                onClick={() => onLoopSelect(loop)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                  isSelected
                    ? "border-purple-500 bg-purple-500/10 shadow-md ring-1 ring-purple-500/40"
                    : "border-border/80 bg-surface hover:border-border"
                }`}
              >
                <LazyLoopPlayer
                  videoUrl={loop.videoUrl}
                  name={loop.name}
                  frameCount={loop.frameCount}
                  durationSec={loop.durationSec}
                  isSelected={isSelected}
                  isVerifiedDemo={loop.isVerifiedDemo}
                  onClick={() => onLoopSelect(loop)}
                />

                <div>
                  <p className="text-xs font-bold text-foreground truncate">{loop.name}</p>
                  <p className="text-[10px] text-muted truncate mt-0.5">
                    Garment: {loop.sourceGarment}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
});
