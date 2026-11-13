"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  ArrowUp,
  ArrowDown,
  Film,
  Check,
  Clock,
  Play,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { AdScene } from "@/lib/types/ecommerce";
import {
  calculateStoryboardContinuity,
  healStoryboardActionLoopContinuity,
  getScenePoseBounds,
  isActionLoopScene,
} from "@/lib/ecommerce/actionLoopFsmEngine";

export interface StoryboardReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: AdScene[];
  onReorder: (newScenes: AdScene[]) => void;
  selectedSceneIndex?: number;
  onSelectScene?: (index: number) => void;
  fps?: number;
  personaId?: string;
}

export const StoryboardReorderModal: React.FC<StoryboardReorderModalProps> = ({
  isOpen,
  onClose,
  scenes,
  onReorder,
  selectedSceneIndex,
  onSelectScene,
  fps = 30,
  personaId = "ruby",
}) => {
  const [localScenes, setLocalScenes] = useState<AdScene[]>(scenes);
  const [autoHealOnReorder, setAutoHealOnReorder] = useState(true);

  // Sync internal state with external prop changes when opened or scenes update
  useEffect(() => {
    setLocalScenes(scenes);
  }, [scenes, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const totalFrames = useMemo(() => {
    return localScenes.reduce((acc, s) => acc + (s.durationFrames || 0), 0);
  }, [localScenes]);

  const continuityReport = useMemo(() => {
    return calculateStoryboardContinuity(localScenes, personaId);
  }, [localScenes, personaId]);

  const handleHealContinuity = () => {
    const healed = healStoryboardActionLoopContinuity(localScenes, personaId);
    setLocalScenes(healed.healedScenes);
    onReorder(healed.healedScenes);
  };

  const handleShift = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= localScenes.length) return;
    const next = [...localScenes];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    if (autoHealOnReorder) {
      const healed = healStoryboardActionLoopContinuity(next, personaId);
      setLocalScenes(healed.healedScenes);
      onReorder(healed.healedScenes);
    } else {
      setLocalScenes(next);
      onReorder(next);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in p-4 select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                Storyboard Sequence & Scene Reordering
              </h3>
              <p className="text-[11px] text-zinc-400">
                Use Earlier (↑) and Later (↓) to rearrange sequence order. Postures and timeline recalculate automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* FSM Kinematic Continuity Banner */}
        {continuityReport.totalBoundaries > 0 && (
          <div
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs shrink-0 transition-all ${
              continuityReport.isSeamless
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200 shadow-sm shadow-emerald-950/30"
                : "bg-amber-950/25 border-amber-500/40 text-amber-100 shadow-sm shadow-amber-950/30"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {continuityReport.isSeamless ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs">
                    {continuityReport.isSeamless
                      ? `🎭 Kinematic Continuity: 100% Seamless`
                      : `⚠️ ${continuityReport.discontinuities.length} Pose Discontinuity Detected`}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                    {continuityReport.seamlessBoundaries}/{continuityReport.totalBoundaries} boundaries
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 truncate">
                  {continuityReport.isSeamless
                    ? "Presenter entry and exit postures are mathematically boundary-locked across all scenes."
                    : "Adjacent scenes have mismatched poses (e.g. M1 exit followed by M3 entry)."}
                </p>
              </div>
            </div>

            {!continuityReport.isSeamless && (
              <button
                type="button"
                onClick={handleHealContinuity}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-950/50 shrink-0 ml-2"
                title="Auto-heal all posture discontinuities using continuity-preserving loops"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Heal Postures</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Scene List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[240px]">
          {localScenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-xs">
              <Film className="w-8 h-8 mb-2 opacity-40" />
              No scenes available to reorder.
            </div>
          ) : (
            <div className="space-y-2">
              {localScenes.map((scene, index) => {
                const isSelected = selectedSceneIndex === index;
                const mediaUrl = scene.customVeoVideoUrl || scene.primaryMediaUrl;
                const isVideo =
                  mediaUrl?.endsWith(".mp4") ||
                  mediaUrl?.endsWith(".webm") ||
                  Boolean(scene.customVeoVideoUrl);
                const isLoopPresenter = isActionLoopScene(scene);
                const poseBounds = isLoopPresenter ? getScenePoseBounds(scene, personaId) : null;

                return (
                  <div
                    key={scene.id || `scene-${index}`}
                    className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >

                    {/* Scene Number Badge */}
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/80 text-[11px] font-mono font-bold text-zinc-300 shrink-0">
                      {index + 1}
                    </div>

                    {/* Media Thumbnail */}
                    <div className="w-14 h-10 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                      {mediaUrl ? (
                        isVideo ? (
                          <video
                            src={mediaUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl}
                            alt={scene.headline || `Scene ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <Film className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {scene.headline || `Scene #${index + 1}`}
                        </span>
                        {scene.sceneType && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono shrink-0">
                            {scene.sceneType.replace(/_/g, " ")}
                          </span>
                        )}
                        {/* Pose Bounds Indicator */}
                        {poseBounds && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300 font-mono flex items-center gap-1 shrink-0" title={`Kinematic Pose Bounds: Entry ${poseBounds.entryPose} -> Exit ${poseBounds.exitPose}`}>
                            <Sparkles className="w-2.5 h-2.5 text-fuchsia-400" />
                            <span>{poseBounds.entryPose}➔{poseBounds.exitPose}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate opacity-80">
                        {scene.voiceoverScript || scene.visualActionPrompt || "No voiceover specified"}
                      </p>
                    </div>

                    {/* Duration Badge */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-950/80 px-2 py-1 rounded-md border border-zinc-800 shrink-0">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{((scene.durationFrames || 0) / fps).toFixed(1)}s</span>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSelectScene && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectScene(index);
                            onClose();
                          }}
                          title="Jump to scene in editor"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShift(index, -1);
                        }}
                        title="Move Scene Earlier (Shift Up in Sequence)"
                        aria-label={`Move scene ${index + 1} earlier`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-cyan-300 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer text-xs"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-semibold hidden sm:inline">Earlier</span>
                      </button>
                      <button
                        type="button"
                        disabled={index === localScenes.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShift(index, 1);
                        }}
                        title="Move Scene Later (Shift Down in Sequence)"
                        aria-label={`Move scene ${index + 1} later`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-cyan-300 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer text-xs"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-semibold hidden sm:inline">Later</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-xs text-zinc-400 font-mono">
              {localScenes.length} scenes • {(totalFrames / fps).toFixed(1)}s total runtime
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoHealOnReorder}
                onChange={(e) => setAutoHealOnReorder(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer"
              />
              <span>Auto-heal posture continuity on shift</span>
            </label>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

