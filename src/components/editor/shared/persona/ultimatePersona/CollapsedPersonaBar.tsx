/**
 * src/components/editor/shared/persona/ultimatePersona/CollapsedPersonaBar.tsx
 *
 * Compact summary row showing active persona avatar, voice model badge,
 * selected action loop/staging mode, and quick actions (audition, reroll, switch anchor).
 */

import React from "react";
import Image from "next/image";
import { User, Volume2, Square, Shuffle, ChevronDown } from "lucide-react";
import { Persona } from "@/lib/tts/personas";
import { getAvatarThumbnailUrl } from "@/lib/personas/avatarThumbnail";
import { MasterCoreLoopDef } from "./types";

export interface CollapsedPersonaBarProps {
  currentPersona: Persona;
  resolvedVoice: {
    language: string;
    locale: string;
    engine: string;
    checkpoint: string;
    isCloningEnabled?: boolean;
    referenceAudio?: string;
  };
  selectedEngine?: string;
  selectedModel?: string;
  speechSpeed?: number;
  isFaceOnlyActive: boolean;
  activeCoreLoop: MasterCoreLoopDef | null;
  isPlaying: boolean;
  handleAuditionVoice: (e: React.MouseEvent, persona: Persona) => void;
  hasActionLoops: boolean;
  onShuffleActiveSceneLoop?: () => void;
  onShuffleLoops?: () => void;
  onExpand: () => void;
  className?: string;
  compact?: boolean;
}

export const CollapsedPersonaBar: React.FC<CollapsedPersonaBarProps> = ({
  currentPersona,
  resolvedVoice,
  selectedEngine,
  selectedModel,
  speechSpeed = 1.0,
  isFaceOnlyActive,
  activeCoreLoop,
  isPlaying,
  handleAuditionVoice,
  hasActionLoops,
  onShuffleActiveSceneLoop,
  onShuffleLoops,
  onExpand,
  className = "",
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className={`rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md p-2.5 space-y-2 ${className}`}
      >
        {/* Row 1: Anchor info & Expand trigger */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative h-9 w-9 shrink-0 rounded-full border border-emerald-500/80 overflow-hidden shadow-sm bg-zinc-900">
              <Image
                src={getAvatarThumbnailUrl(currentPersona.avatarUrl || "/avatars/ruby.png")}
                alt={currentPersona.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-bold text-white tracking-wide truncate">
                  {currentPersona.name}
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400 border border-emerald-500/30 shrink-0">
                  {resolvedVoice.language.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-cyan-400 font-mono truncate">
                {(selectedEngine || resolvedVoice.engine).toUpperCase()}: {selectedModel || resolvedVoice.checkpoint}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onExpand}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
            title="Open Anchor & Wardrobe Matrix"
          >
            <span>Switch</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Row 2: Selected Mode Pill & Quick Actions */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-900">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[10px] min-w-0 flex-1">
            <span className="text-xs shrink-0">{isFaceOnlyActive || !activeCoreLoop ? "👤" : activeCoreLoop.icon}</span>
            <span className="font-bold text-zinc-300 truncate">
              {isFaceOnlyActive || !activeCoreLoop ? "Just the Face (Portrait)" : `${activeCoreLoop.name}`}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasActionLoops && !isFaceOnlyActive && (onShuffleActiveSceneLoop || onShuffleLoops) && (
              <button
                type="button"
                onClick={() => {
                  if (onShuffleActiveSceneLoop) onShuffleActiveSceneLoop();
                  else if (onShuffleLoops) onShuffleLoops();
                }}
                title="Reroll Action Loop"
                className="p-1 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                <Shuffle className="h-3 w-3 text-cyan-400" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => handleAuditionVoice(e, currentPersona)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer ${
                isPlaying
                  ? "bg-emerald-500 text-black border-emerald-400 font-bold animate-pulse"
                  : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              }`}
              title={isPlaying ? "Stop audition" : "Audition voice sample"}
            >
              {isPlaying ? <Square className="h-2.5 w-2.5 fill-current" /> : <Volume2 className="h-3 w-3 text-cyan-400" />}
              <span>{isPlaying ? "Stop" : "Audition"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md p-3 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      {/* Anchor Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1 basis-[240px]">
        <div className="relative h-11 w-11 shrink-0 rounded-full border-2 border-emerald-500/80 overflow-hidden shadow-md shadow-emerald-950/50 bg-zinc-900">
          <Image
            src={getAvatarThumbnailUrl(currentPersona.avatarUrl || "/avatars/ruby.png")}
            alt={currentPersona.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white tracking-wide truncate">
              {currentPersona.name}
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30 shrink-0">
              {currentPersona.gender.toUpperCase()} • {resolvedVoice.language.toUpperCase()} ({resolvedVoice.locale})
            </span>
          </div>

          {/* Voice Model Info Directly Beside Face */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 mt-0.5 truncate font-mono">
            <span className="text-cyan-400 text-[10px] font-bold">
              🎙️ {(selectedEngine || resolvedVoice.engine).toUpperCase()}: {selectedModel || resolvedVoice.checkpoint}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 text-[10px]">
              {(speechSpeed || 1.0).toFixed(2)}x
            </span>
            {resolvedVoice.isCloningEnabled && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-emerald-400 text-[10px] truncate">
                  Clone: {resolvedVoice.referenceAudio}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
        {/* Selected Wardrobe & Action Loop Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs shrink-0 max-w-full">
          <span className="text-base">{isFaceOnlyActive || !activeCoreLoop ? "👤" : activeCoreLoop.icon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              {isFaceOnlyActive || !activeCoreLoop ? "Staging Mode" : "Wardrobe (Loop)"}
            </span>
            <span className="font-bold text-zinc-200 truncate">
              {isFaceOnlyActive || !activeCoreLoop ? "Just the Face (Clean Headshot)" : `${activeCoreLoop.name} (${activeCoreLoop.id})`}
            </span>
          </div>
        </div>

        {/* Quick Actions: Audition, Shuffle & Switch Anchor */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => handleAuditionVoice(e, currentPersona)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isPlaying
                ? "bg-emerald-500 text-black border-emerald-400 font-bold animate-pulse"
                : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
            }`}
            title={isPlaying ? "Stop audition" : "Audition voice sample"}
          >
            {isPlaying ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5 text-cyan-400" />}
            <span>{isPlaying ? "Stop" : "Audition"}</span>
          </button>

          {hasActionLoops && !isFaceOnlyActive && (onShuffleActiveSceneLoop || onShuffleLoops) && (
            <button
              type="button"
              onClick={() => {
                if (onShuffleActiveSceneLoop) onShuffleActiveSceneLoop();
                else if (onShuffleLoops) onShuffleLoops();
              }}
              title="Reroll Action Loop for this scene"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5 text-cyan-400" />
              <span>Reroll Loop</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExpand}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            <User className="h-3.5 w-3.5" />
            <span>Change Anchor</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand anchor panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Expand panel"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
