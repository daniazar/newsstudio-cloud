/**
 * src/components/editor/shared/sceneDetail/components/ScenePresenterAnchorCard.tsx
 *
 * Scene presenter avatar preview, action loop selector, and reroll button.
 */

import React, { useMemo } from "react";
import { Sparkles, ExternalLink, Shuffle } from "lucide-react";
import { getPersonaById, PERSONAS } from "@/lib/tts/personas";
import { getAlgorithmicActionLoop, CAMERA_CUES, type CameraCue } from "@/lib/types/stateMachine";
import { BROADCAST_ACTION_LOOPS, ActionLoopOption } from "@/components/editor/PresenterStudioPanel";
import { getPersona37Clips } from "@/lib/ecommerce/actionLoopFsmEngine";
import { getAvatarThumbnailUrl, handleAvatarImgError } from "@/lib/personas/avatarThumbnail";
import { MediaSettingsData, Segment } from "../types";

interface ScenePresenterAnchorCardProps {
  segment: Segment;
  totalScenes: number;
  mediaSettings: MediaSettingsData;
  setMediaSettings: React.Dispatch<React.SetStateAction<MediaSettingsData>>;
  onUpdateMediaSettings: (index: number, settings: string, extraFields?: Record<string, unknown>) => void;
  onUpdateSegmentActionLoop?: (index: number, actionLoop: string, videoUrl?: string, avatarUrl?: string) => void;
  onSelectPresenterTab?: () => void;
  onSelectCameraCue?: (cue: CameraCue) => void;
  onTestLipSync?: () => void;
}

export function ScenePresenterAnchorCard({
  segment,
  totalScenes,
  mediaSettings,
  setMediaSettings,
  onUpdateMediaSettings,
  onUpdateSegmentActionLoop,
  onSelectPresenterTab,
  onSelectCameraCue,
  onTestLipSync,
}: ScenePresenterAnchorCardProps) {
  const personaId = segment?.personaId || "ruby";
  const persona = getPersonaById(personaId) || PERSONAS[0];
  const avatarUrl = segment?.personaAvatarUrl || persona?.avatarUrl || "/avatars/ruby.png";
  const isRuby = personaId.toLowerCase().includes("ruby");

  const loopOptions: ActionLoopOption[] = useMemo(() => {
    if (isRuby) {
      return BROADCAST_ACTION_LOOPS;
    }
    const clips = getPersona37Clips(personaId);
    return clips.map((c) => {
      let category: ActionLoopOption["category"] = "Home / Clasped";
      let icon = "🧘";
      if (c.startPose === "M1") {
        category = "Home / Clasped";
        icon = c.type === "dynamic_loop" ? "⚡" : "🧘";
      } else if (c.startPose === "M2") {
        category = "Right Explanatory";
        icon = "👉";
      } else if (c.startPose === "M3") {
        category = "Open Two Hands";
        icon = "👐";
      } else if (c.startPose === "M4") {
        category = "Left Presentation";
        icon = "👈";
      } else if (c.startPose === "M5") {
        category = "Lean / Thinking";
        icon = "🤔";
      }
      if (c.type === "transition") {
        category = "Transitions";
        icon = "🔄";
      }
      const cleanId = c.file.replace(/\.mp4$/, "");
      const label = c.type === "transition"
        ? `${c.startPose} ➔ ${c.endPose}`
        : `${c.startPose} ${c.id.replace(/^M\d_/, "").replace(/_/g, " ")}`;

      return {
        id: cleanId,
        name: label,
        pose: c.startPose,
        category,
        icon,
        desc: `${c.type} (${c.durationSec}s)`,
      };
    });
  }, [personaId, isRuby]);

  // If this is an Intro, Outro, or invalid segment, do not render presenter anchor card
  if (!segment || segment.index < 0 || segment.id === "intro" || segment.id === "outro") {
    return null;
  }

  const algo = getAlgorithmicActionLoop(segment?.index ?? 0, totalScenes || 5, segment?.text);
  let currentLoopId = mediaSettings.actionLoop || segment?.actionLoop;
  if (!currentLoopId && segment?.mediaSettings) {
    try {
      currentLoopId = JSON.parse(segment.mediaSettings).actionLoop;
    } catch {}
  }
  if (!currentLoopId) currentLoopId = algo?.loopName || loopOptions[0]?.id || "ruby_idle";

  const matchedLoop = loopOptions.find((l) => l.id === currentLoopId || l.id.toLowerCase() === currentLoopId?.toLowerCase());

  return (
    <div className="mb-6 p-4 rounded-xl bg-surface-raised border border-purple-500/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-[11px] uppercase tracking-wider font-bold text-foreground">
            Scene Anchor & Action Loop
          </span>
        </div>
        {onSelectPresenterTab && (
          <button
            type="button"
            onClick={onSelectPresenterTab}
            className="text-[10px] font-bold text-purple-300 hover:text-white flex items-center gap-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            title="Open Presenter Studio tab to customize wardrobe, poses, and multi-scene sequences"
          >
            <span>Presenter Studio</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface border border-border/80">
          <div className="w-10 h-10 rounded-full border border-purple-500/40 overflow-hidden bg-black shrink-0 relative shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAvatarThumbnailUrl(avatarUrl)}
              alt={persona?.name || "Anchor"}
              loading="lazy"
              onError={(e) => handleAvatarImgError(e, avatarUrl)}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate">
                {persona?.name || "Anchor"}
              </span>
              <span className="text-[9px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                Scene {segment.index + 1}
              </span>
            </div>
            <p className="text-[10px] text-muted truncate mt-0.5">
              {matchedLoop ? `${matchedLoop.icon} ${matchedLoop.name}` : algo?.cameraLabel || "Cam 1 (Center Wide)"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const candidates = loopOptions.filter((l) => l.id !== currentLoopId);
              const chosen =
                candidates[Math.floor(Math.random() * candidates.length)] || candidates[0] || loopOptions[0];
              if (!chosen) return;
              const newMs = { ...mediaSettings, actionLoop: chosen.id };
              setMediaSettings(newMs);
              onUpdateMediaSettings(segment.index, JSON.stringify(newMs), {
                actionLoop: chosen.id,
              });
              onUpdateSegmentActionLoop?.(segment.index, chosen.id);
            }}
            className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs transition-colors cursor-pointer"
            title="Reroll Action Loop for this scene"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase text-muted shrink-0 w-16">
            Action Loop
          </label>
          <select
            value={currentLoopId}
            onChange={(e) => {
              const chosenId = e.target.value;
              const newMs = { ...mediaSettings, actionLoop: chosenId };
              setMediaSettings(newMs);
              onUpdateMediaSettings(segment.index, JSON.stringify(newMs), {
                actionLoop: chosenId,
              });
              onUpdateSegmentActionLoop?.(segment.index, chosenId);
            }}
            className="flex-1 bg-surface border border-purple-500/30 rounded px-2 py-1.5 text-xs text-purple-200 focus:border-purple-400 focus:outline-none cursor-pointer truncate"
          >
            {Array.from(new Set(loopOptions.map((l) => l.category))).map((cat) => (
              <optgroup key={cat} label={cat}>
                {loopOptions.filter((l) => l.category === cat).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.icon} {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Camera Rig Angle Switcher */}
        <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
              🎥 Camera Rig Angle
            </span>
            <span className="text-[10px] text-purple-300 font-mono">
              {mediaSettings.cameraCue || "cam1_wide"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {CAMERA_CUES.map((cue) => {
              const isSelected = (mediaSettings.cameraCue || "cam1_wide") === cue.id;
              return (
                <button
                  key={cue.id}
                  type="button"
                  onClick={() => {
                    const cueId = cue.id as CameraCue;
                    const newMs = { ...mediaSettings, cameraCue: cueId };
                    setMediaSettings(newMs);
                    onUpdateMediaSettings(segment.index, JSON.stringify(newMs), {
                      cameraCue: cueId,
                    });
                    onSelectCameraCue?.(cueId);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-purple-400 bg-purple-500/20 text-purple-200 shadow-sm"
                      : "border-border bg-surface hover:border-purple-500/30 text-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{cue.icon}</span>
                    <span className="text-[11px] font-bold truncate">{cue.name}</span>
                  </div>
                  <span className="text-[9px] text-muted opacity-80 truncate">
                    {cue.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Neural Lip-Sync Test Modal Trigger */}
        {onTestLipSync && (
          <div className="pt-2 border-t border-purple-500/20">
            <button
              type="button"
              onClick={onTestLipSync}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/40 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <span>⚡</span> Test Real-Time Neural Lip-Sync
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
