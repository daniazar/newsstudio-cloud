/**
 * src/components/editor/shared/persona/ultimatePersona/WardrobeLoopsTab.tsx
 *
 * Space-Efficient Persona Wardrobe & Master Poses Matrix:
 * - Ultra-compact, non-cluttered layout fitting comfortably in the 400px editor sidebar
 * - Card 0: Just the Face (e.g. ruby.png, taylor.png) for clean portrait neural lip-sync
 * - Cards 1..N: Exactly one compact entry for each Master Pose (M1-M5) / Attire
 * - Top Toolbar: Sleek inline shuffle buttons (🔀 Reshuffle, 🎲 Shuffle, ⚡ Auto-FSM)
 * - Video preview on hover/selection without cluttering the screen
 */

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Sparkles, Shuffle, Check } from "lucide-react";
import { Persona } from "@/lib/tts/personas";
import { ActionLoopRaw } from "./types";

export interface MasterPoseEntry {
  id: string;
  label: string;
  outfit: string;
  category: string;
  pose: string;
  poseLabel?: string;
  color?: string;
  badgeBg?: string;
  src: string;
  correspondingLoopId?: string;
  correspondingVideoUrl?: string;
}

export interface WardrobeLoopsTabProps {
  hasActionLoops: boolean;
  allActionLoops: ActionLoopRaw[];
  wardrobePoses?: MasterPoseEntry[];
  isFaceOnlyActive: boolean;
  selectedActionLoopId?: string;
  selectedAttireId?: string;
  hoveredLoopId: string | null;
  setHoveredLoopId: (id: string | null) => void;
  onSelectActionLoop?: (loopId: string, loopSrc?: string) => void;
  onSelectAttire?: (attireId: string, attireSrc: string) => void;
  onAutoSequenceLoops?: (loops?: ActionLoopRaw[], personaId?: string) => void;
  onShuffleLoops?: (loops?: ActionLoopRaw[], personaId?: string) => void;
  onShuffleActiveSceneLoop?: (loops?: ActionLoopRaw[], personaId?: string) => void;
  currentPersona: Persona;
  isBlazeActive?: boolean;
  isMateoActive?: boolean;
  isRubyActive?: boolean;
  compact?: boolean;
  isAutoSequencing?: boolean;
}

export const WardrobeLoopsTab: React.FC<WardrobeLoopsTabProps> = ({
  hasActionLoops,
  allActionLoops,
  wardrobePoses = [],
  isFaceOnlyActive,
  selectedActionLoopId,
  selectedAttireId,
  hoveredLoopId: _hoveredLoopId,
  setHoveredLoopId,
  onSelectActionLoop,
  onSelectAttire,
  onAutoSequenceLoops,
  onShuffleLoops,
  onShuffleActiveSceneLoop,
  currentPersona,
  compact: _compact = false,
  isAutoSequencing = false,
}) => {
  const [selectedAttireFilter, setSelectedAttireFilter] = useState<string>("all");
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnterCard = (id: string) => {
    setHoveredLoopId(id);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // Debounce video decoding/playback by 180ms to prevent lag during rapid mouse scrolling
    hoverTimerRef.current = setTimeout(() => {
      setActivePreviewId(id);
    }, 180);
  };

  const handleMouseLeaveCard = () => {
    setHoveredLoopId(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setActivePreviewId(null);
  };

  // Clean up any pending hover timer on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Extract unique outfits/attires for filter pills if multiple exist
  const uniqueAttires = useMemo(() => {
    const set = new Set<string>();
    for (const p of wardrobePoses) {
      if (p.outfit) set.add(p.outfit);
      else if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [wardrobePoses]);

  // Filtered master poses - strictly isolated to current persona
  const displayedPoses = useMemo(() => {
    const slug = (currentPersona?.id || "").toLowerCase();
    const isRuby = slug === "ruby" || slug === "ruby_vance" || slug === "ruby_es";

    // Strictly retain only poses that belong to this persona
    const filteredByPersona = wardrobePoses.filter((p) => {
      if (isRuby) {
        return p.id.toLowerCase().startsWith("ruby") || p.src.toLowerCase().includes("ruby");
      }
      return (
        p.id.toLowerCase().startsWith(slug) ||
        p.src.toLowerCase().includes(`master_${slug}_archive`) ||
        p.src.toLowerCase().includes(`/${slug}`) ||
        p.src.toLowerCase().includes(`_${slug}_`)
      );
    });

    const candidateList = filteredByPersona.length > 0 ? filteredByPersona : wardrobePoses;

    if (selectedAttireFilter === "all") return candidateList;
    return candidateList.filter(
      (p) => p.outfit === selectedAttireFilter || p.category === selectedAttireFilter
    );
  }, [wardrobePoses, selectedAttireFilter, currentPersona.id]);

  // Resolve currently active video name for subtle display
  const activeVideoDisplay = useMemo(() => {
    if (isFaceOnlyActive) return "Neural Headshot (MuseTalk / KeySync)";
    const slug = (currentPersona?.id || "").toLowerCase();
    const isRuby = slug === "ruby" || slug === "ruby_vance" || slug === "ruby_es";

    // If selectedActionLoopId belongs to another persona (e.g. ruby_burgundy on Mateo), ignore it
    if (!isRuby && selectedActionLoopId?.startsWith("ruby_")) {
      return "Default M1 Neutral Clasp";
    }
    if (!selectedActionLoopId) return "Default M1 Neutral Clasp";
    const found = allActionLoops.find(
      (l) => l.id === selectedActionLoopId || l.id.toLowerCase() === selectedActionLoopId.toLowerCase()
    );
    return found?.name || found?.label || selectedActionLoopId;
  }, [isFaceOnlyActive, selectedActionLoopId, allActionLoops, currentPersona.id]);

  return (
    <div className="p-2 space-y-2.5">
      {/* Sleek Compact Header & Shuffle Toolbar */}
      <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/80 to-purple-950/40 border border-emerald-500/20">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="h-3 w-3" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-zinc-100 text-[11px] truncate">{currentPersona.name}</span>
              <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-mono border border-emerald-500/20 shrink-0">
                {hasActionLoops ? "1080p Loops" : "Realtime Face"}
              </span>
            </div>
            <p className="text-[9px] text-zinc-400 truncate">
              Loop: <span className="text-emerald-300 font-mono font-medium">{activeVideoDisplay}</span>
            </p>
          </div>
        </div>

        {/* Shuffle & Auto-Sequence Actions */}
        {hasActionLoops && (
          <div className="flex items-center gap-1 shrink-0">
            {onShuffleActiveSceneLoop && (
              <button
                type="button"
                onClick={() => onShuffleActiveSceneLoop(allActionLoops, currentPersona.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 text-[10px] font-bold border border-fuchsia-500/30 transition-all cursor-pointer active:scale-95"
                title="Reshuffle active scene video variation"
              >
                <Shuffle className="h-2.5 w-2.5" />
                <span>Reshuffle</span>
              </button>
            )}

            {onShuffleLoops && (
              <button
                type="button"
                onClick={() => onShuffleLoops(allActionLoops, currentPersona.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer active:scale-95"
                title="Shuffle all scene videos"
              >
                <Shuffle className="h-2.5 w-2.5" />
                <span>Shuffle</span>
              </button>
            )}

            {onAutoSequenceLoops && (
              <button
                type="button"
                onClick={() => onAutoSequenceLoops(allActionLoops, currentPersona.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer active:scale-95 ${
                  isAutoSequencing
                    ? "bg-emerald-400 text-black animate-pulse"
                    : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm"
                }`}
                title="Auto-sequence FSM across scenes"
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span>Auto-FSM</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Attire Filter Pills (if persona has multiple outfits) */}
      {uniqueAttires.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedAttireFilter("all")}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
              selectedAttireFilter === "all"
                ? "bg-zinc-200 text-zinc-900"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            All ({wardrobePoses.length})
          </button>
          {uniqueAttires.map((attire) => (
            <button
              key={attire}
              type="button"
              onClick={() => setSelectedAttireFilter(attire)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
                selectedAttireFilter === attire
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {attire}
            </button>
          ))}
        </div>
      )}

      {/* Compact Master Poses Grid (3 columns on sidebar, 4 on wider screens) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1">
        {/* ENTRY 1: The Face (Clean Portrait Headshot) */}
        <div
          onClick={() => {
            onSelectActionLoop?.("face_only", "");
            onSelectAttire?.("face_only", currentPersona.avatarUrl || "/avatars/ruby.png");
          }}
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "100px 140px",
          }}
          className={`group relative flex flex-col rounded-lg border p-1 cursor-pointer transition-all ${
            isFaceOnlyActive
              ? "border-cyan-500 bg-cyan-500/15 shadow-sm ring-1 ring-cyan-500/50"
              : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
          }`}
        >
          <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden bg-black border border-zinc-800 shadow-inner flex items-center justify-center">
            <Image
              src={currentPersona.avatarUrl || "/avatars/ruby.png"}
              alt={currentPersona.name}
              fill
              sizes="(max-width: 640px) 90px, 120px"
              loading="lazy"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {isFaceOnlyActive && (
              <div className="absolute top-1 right-1 bg-cyan-500 text-black p-0.5 rounded-full shadow-md z-10">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </div>
            )}
            <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-xs px-1 py-0.2 text-[7px] font-mono text-cyan-300 rounded border border-white/10">
              Face
            </div>
            <div className="absolute bottom-1 left-1 right-1 bg-black/85 backdrop-blur-xs px-1 py-0.2 text-[8px] font-mono text-cyan-400 rounded text-center truncate border border-white/10">
              Clean
            </div>
          </div>

          <div className="pt-1 text-center">
            <h4 className="text-[10px] font-bold text-zinc-200 group-hover:text-cyan-400 truncate">
              Just the Face
            </h4>
          </div>
        </div>

        {/* ENTRIES 2..N: Master Poses */}
        {displayedPoses.map((pose) => {
          const isSelected = !isFaceOnlyActive && Boolean(
            (selectedAttireId && (selectedAttireId === pose.id || selectedAttireId === pose.src)) ||
            (selectedActionLoopId && (
              selectedActionLoopId === pose.correspondingLoopId ||
              selectedActionLoopId.toLowerCase() === pose.pose.toLowerCase() ||
              (pose.correspondingLoopId && selectedActionLoopId.toLowerCase() === pose.correspondingLoopId.toLowerCase())
            ))
          );

          return (
            <div
              key={pose.id}
              onClick={() => {
                onSelectAttire?.(pose.id, pose.src);
                if (pose.correspondingLoopId) {
                  onSelectActionLoop?.(pose.correspondingLoopId, pose.correspondingVideoUrl);
                } else {
                  onSelectActionLoop?.(pose.pose.toLowerCase(), pose.correspondingVideoUrl);
                }
              }}
              onMouseEnter={() => handleMouseEnterCard(pose.id)}
              onMouseLeave={handleMouseLeaveCard}
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "100px 140px",
              }}
              className={`group relative flex flex-col rounded-lg border p-1 cursor-pointer transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/50"
                  : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
              }`}
            >
              <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden bg-black border border-zinc-800 shadow-inner">
                {pose.correspondingVideoUrl && (isSelected || activePreviewId === pose.id) ? (
                  <video
                    src={pose.correspondingVideoUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                    onLoadedData={(e) => {
                      const vid = e.currentTarget;
                      vid.muted = true;
                      vid.play()?.catch?.(() => {});
                    }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      pose.src.startsWith("/avatars/") && !pose.src.startsWith("/avatars/thumbs/")
                        ? pose.src.replace(/^\/avatars\//, "/avatars/thumbs/").replace(/\.[^.]+$/, ".webp")
                        : pose.src
                    }
                    alt={pose.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target && target.src !== pose.src) {
                        target.src = pose.src;
                      }
                    }}
                  />
                )}

                {isSelected && (
                  <div className="absolute top-1 right-1 bg-emerald-500 text-black p-0.5 rounded-full shadow-md z-10">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}

                <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-xs px-1 py-0.2 text-[7px] font-mono text-zinc-300 rounded border border-white/10">
                  {pose.pose}
                </div>

                <div className="absolute bottom-1 left-1 right-1 bg-black/85 backdrop-blur-xs px-1 py-0.2 text-[8px] font-mono text-emerald-400 rounded text-center truncate border border-white/10">
                  {pose.poseLabel || pose.pose}
                </div>
              </div>

              <div className="pt-1 text-center">
                <h4 className="text-[10px] font-bold text-zinc-200 group-hover:text-emerald-400 truncate">
                  {pose.poseLabel || pose.outfit || pose.pose}
                </h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
