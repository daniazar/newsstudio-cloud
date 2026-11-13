/**
 * src/components/editor/shared/persona/BatchPresenterScenesCard.tsx
 *
 * Presenter & Avatar Scenes Panel for Commercial Video Ads.
 * Faithful implementation of the News Studio Presenter Studio "SCENES" card (media_1788977364695.png).
 *
 * Features:
 * - Header: SCENES with 🎬 GENERATE ALL
 * - Per-scene rows with status icon (✓, ○, ▶, ✗)
 * - Persona avatar thumbnail image
 * - Per-scene Persona selector (overrides avatar & voice for that scene only)
 * - Audio (🎙️) and Video download (💾) shortcuts
 * - Circular green play / expand button (▼ / ▶)
 * - Algorithmic Action Loop FSM badge (⚡ FSM Auto: 👐 Intro Welcome)
 * - Camera cue badge (🎥 Cam 1 Center Wide)
 * - Instant "⚡ Test Lip-Sync" shortcut button
 * - Expandable inline video player with ✕ close button
 */

"use client";

import React, { useState } from "react";
import { AdScene } from "@/lib/types/ecommerce";
import { PERSONAS, getPersonaById } from "@/lib/tts/personas";
import { getAvatarThumbnailUrl, handleAvatarImgError } from "@/lib/personas/avatarThumbnail";
import { getAlgorithmicActionLoop } from "@/lib/types/stateMachine";
import { isVideoScene } from "@/lib/ecommerce/voiceSynthesisCalibrator";
import { isLipSyncUpToDate } from "@/lib/ecommerce/lipSyncValidator";
import { Film, Play, ChevronDown, Sparkles, Mic, Download, X, CheckCircle2, Circle, Loader2, Trash2, Shuffle } from "lucide-react";

/**
 * Normalizes MinIO/S3 or absolute URLs to same-origin public static assets when available.
 */
export function resolvePublicVideoUrl(url?: string | null): string {
  if (!url) return "";
  const match = url.match(/(presenter_[a-zA-Z0-9_-]+\.(?:mp4|webm))/i);
  if (match) {
    return `/assets/cache/ecommerce/${match[1]}`;
  }
  return url;
}

interface SceneVideoPreviewProps {
  url: string;
  onClose: () => void;
}

const SceneVideoPreview: React.FC<SceneVideoPreviewProps> = ({ url, onClose }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const normalizedUrl = resolvePublicVideoUrl(url);
  const [prevUrl, setPrevUrl] = React.useState(normalizedUrl);

  if (prevUrl !== normalizedUrl) {
    setPrevUrl(normalizedUrl);
    setIsLoading(true);
    setHasError(false);
  }

  // Safety timeout to dismiss spinner
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [normalizedUrl]);

  const handleDismissLoading = () => {
    setIsLoading(false);
  };

  return (
    <div className="mt-2.5 ml-6 relative rounded-lg overflow-hidden border border-purple-500/40 bg-black min-h-[140px] flex items-center justify-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-black/80 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-zinc-700 shadow-md"
        title="Close video preview"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 z-10 pointer-events-none">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <span className="text-[11px] font-mono text-zinc-400">Loading scene video...</span>
        </div>
      )}

      {/* Error Fallback with Retry */}
      {hasError ? (
        <div className="p-4 text-center space-y-2 z-10">
          <p className="text-xs font-semibold text-rose-400">Failed to load video stream</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                const video = videoRef.current;
                if (video) {
                  video.load();
                }
              }}
              className="text-[10px] font-bold px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 cursor-pointer"
            >
              Retry
            </button>
            <a
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          key={normalizedUrl}
          src={normalizedUrl}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={handleDismissLoading}
          onLoadedData={handleDismissLoading}
          onCanPlay={handleDismissLoading}
          onPlay={handleDismissLoading}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className="w-full max-h-52 object-contain bg-black"
        />
      )}
    </div>
  );
};

export interface BatchPresenterScenesCardProps {
  scenes: AdScene[];
  defaultPersonaId: string;
  defaultAvatarSrc?: string;
  onUpdateScenePersona: (sceneIndex: number, personaId: string, avatarUrl: string) => void;
  onSelectScene?: (sceneIndex: number) => void;
  selectedSceneIndex?: number | null;
  onTestLipSync?: (sceneIndex: number, personaId: string, audioUrl?: string, options?: { force?: boolean }) => void;
  onGenerateAllVideos?: () => void;
  isGeneratingAll?: boolean;
  onDeleteSceneVideo?: (sceneIndex: number) => void;
  onDeleteAllVideos?: () => void;
  onShuffleLoops?: () => void;
  onRerollSceneLoop?: (sceneIndex: number) => void;
  expandedVideoIndex?: number | null;
  onToggleExpandVideo?: (sceneIndex: number | null) => void;
  defaultCollapsed?: boolean;
}

export const BatchPresenterScenesCard: React.FC<BatchPresenterScenesCardProps> = ({
  scenes,
  defaultPersonaId,
  defaultAvatarSrc,
  onUpdateScenePersona,
  onSelectScene,
  selectedSceneIndex,
  onTestLipSync,
  onGenerateAllVideos,
  isGeneratingAll,
  onDeleteSceneVideo,
  onDeleteAllVideos,
  onShuffleLoops,
  onRerollSceneLoop,
  expandedVideoIndex: controlledExpandedIndex,
  onToggleExpandVideo,
  defaultCollapsed = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [internalExpandedIndex, setInternalExpandedIndex] = useState<number | null>(null);
  const activeExpandedIndex = controlledExpandedIndex !== undefined ? controlledExpandedIndex : internalExpandedIndex;

  const handleToggleExpand = (idx: number | null) => {
    if (onToggleExpandVideo) {
      onToggleExpandVideo(idx);
    } else {
      setInternalExpandedIndex(idx);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasAnyVideos = scenes.some((s) => isLipSyncUpToDate(s));
  const generatedCount = scenes.filter((s) => isLipSyncUpToDate(s)).length;

  if (isCollapsed) {
    return (
      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Film className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Scenes Avatar Matrix
              </h4>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-500/30 shrink-0">
                {generatedCount}/{scenes.length} Generated ({Math.round((generatedCount / Math.max(1, scenes.length)) * 100)}%)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              Per-scene avatar assignment, kinematic FSM action loops & lip-sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onShuffleLoops && (
            <button
              type="button"
              onClick={onShuffleLoops}
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-fuchsia-500/50 text-fuchsia-200 bg-fuchsia-950/70 hover:bg-fuchsia-900/80 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-fuchsia-950/40"
              title="🎲 Reroll & Shuffle Markov Action Loop sequence across all scenes with random start"
            >
              <Shuffle className="h-3 w-3 text-fuchsia-400" />
              <span className="hidden sm:inline">Reroll Loops</span>
            </button>
          )}

          {hasAnyVideos && onDeleteAllVideos && (
            <button
              type="button"
              disabled={isGeneratingAll}
              onClick={onDeleteAllVideos}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Delete all generated presenter videos across all scenes"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGenerateAllVideos}
            disabled={isGeneratingAll || scenes.length === 0}
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-purple-500/40 text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>🎬</span>
                <span>Generate All</span>
              </>
            )}
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand scenes avatar matrix"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Expand panel"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Scenes
            </h4>
            <p className="text-[11px] text-zinc-400">
              Per-scene avatar assignment, kinematic FSM action loops & lip-sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAnyVideos && onDeleteAllVideos && (
            <button
              type="button"
              onClick={onDeleteAllVideos}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-red-500/40 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 transition-all flex items-center gap-1 cursor-pointer"
              title="Delete all generated presenter videos across all scenes"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
              <span>Clear All</span>
            </button>
          )}

          {onShuffleLoops && (
            <button
              type="button"
              onClick={onShuffleLoops}
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-fuchsia-500/50 text-fuchsia-200 bg-fuchsia-950/70 hover:bg-fuchsia-900/80 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-fuchsia-950/40"
              title="🎲 Reroll & Shuffle Markov Action Loop sequence across all scenes with random start"
            >
              <Shuffle className="h-3 w-3 text-fuchsia-400" />
              <span>🎲 Reroll Loops</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGenerateAllVideos}
            disabled={isGeneratingAll || scenes.length === 0}
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-purple-500/40 text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>🎬</span>
                <span>Generate All</span>
              </>
            )}
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse scenes avatar matrix"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Collapse panel"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Scrollable Scene List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
        {scenes.map((scene, idx) => {
          const sceneIdx = typeof scene.sceneIndex === "number" ? scene.sceneIndex : idx;
          const isSelected = selectedSceneIndex === sceneIdx;
          const isExpanded = activeExpandedIndex === sceneIdx;

          // Resolve scene-specific persona
          const activePersonaId =
            scene.presenterConfig?.personaId ||
            scene.presenter?.personaId ||
            defaultPersonaId;
          const persona = getPersonaById(activePersonaId);
          const avatarUrl =
            scene.presenterConfig?.avatarSrc ||
            persona?.avatarUrl ||
            defaultAvatarSrc ||
            "/avatars/ruby.png";

          const isVeo = isVideoScene(scene);
          const isLipSynced = isLipSyncUpToDate(scene);
          const hasAudio = !!scene.audioUrl;
          const hasVideo = isLipSynced;

          // Algorithmic Action Loop FSM cadence
          const algo = getAlgorithmicActionLoop(sceneIdx, scenes.length, scene.voiceoverScript);

          return (
            <div
              key={scene.id || sceneIdx}
              onClick={() => onSelectScene?.(sceneIdx)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-purple-900/30 border-purple-500/60 ring-1 ring-purple-500/30 shadow-sm"
                  : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
              }`}
            >
              {/* Row 1: Status, Avatar Thumbnail, Persona Selector, Actions */}
              <div className="flex items-center gap-2 group">
                {/* Status Indicator */}
                <span
                  className={`text-[11px] w-4 text-center shrink-0 flex items-center justify-center ${
                    hasVideo
                      ? "text-emerald-400"
                      : hasAudio
                      ? "text-purple-300"
                      : "text-zinc-600"
                  }`}
                >
                  {hasVideo ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : hasAudio ? (
                    <span className="text-xs text-purple-300 font-bold">✓</span>
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </span>

                {/* Avatar Circular Thumbnail */}
                <div className="w-7 h-7 rounded-full overflow-hidden border border-purple-500/40 shrink-0 bg-zinc-900 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAvatarThumbnailUrl(avatarUrl)}
                    alt={persona?.name || "Avatar"}
                    loading="lazy"
                    onError={(e) => handleAvatarImgError(e, avatarUrl)}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Per-Scene Persona Selector (Updates scene override only) */}
                <select
                  value={activePersonaId}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newPersonaId = e.target.value;
                    const p = getPersonaById(newPersonaId);
                    onUpdateScenePersona(sceneIdx, newPersonaId, p?.avatarUrl || avatarUrl);
                  }}
                  className="flex-1 min-w-0 text-xs font-mono font-bold bg-zinc-900/90 border border-purple-500/40 text-purple-200 rounded-lg px-2 py-1 focus:border-purple-400 focus:outline-none cursor-pointer"
                  title="Change persona for this scene"
                >
                  <optgroup label="Standard Anchors">
                    {PERSONAS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {/* Action Buttons: Audio, Video Save, Circular Expand */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Audio Status */}
                  {hasAudio ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(scene.audioUrl!, `scene-${sceneIdx + 1}-audio.wav`);
                      }}
                      className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700/80 text-purple-300 hover:text-purple-200 hover:border-purple-500/50 flex items-center justify-center transition-all cursor-pointer"
                      title="Download scene audio"
                    >
                      <Mic className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-[9px] text-zinc-500 italic">no audio</span>
                  )}

                  {/* Video Download */}
                  {hasVideo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const vid = scene.presenterVideoUrl || scene.customVeoVideoUrl || scene.primaryMediaUrl!;
                        handleDownload(vid, `scene-${sceneIdx + 1}-${isVeo ? "veo" : "presenter"}.mp4`);
                      }}
                      className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700/80 text-purple-300 hover:text-purple-200 hover:border-purple-500/50 flex items-center justify-center transition-all cursor-pointer"
                      title={isVeo ? "Download scene Veo video" : "Download scene presenter video"}
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  )}

                  {/* Delete Scene Video */}
                  {hasVideo && onDeleteSceneVideo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSceneVideo(sceneIdx);
                      }}
                      className="w-6 h-6 rounded-md bg-zinc-900 border border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center justify-center transition-all cursor-pointer"
                      title="Delete this scene's generated presenter video"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}

                  {/* Green Circular Expand/Play Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpand(isExpanded ? null : sceneIdx);
                    }}
                    className="w-6 h-6 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 flex items-center justify-center transition-colors cursor-pointer"
                    title={isExpanded ? "Collapse preview" : "Play scene video preview"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Algorithmic Action Loop FSM Cadence & Camera Cue */}
              <div className="mt-2.5 ml-6 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-500/20">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Markov Action Loop Badge */}
                  {scene.actionLoopSlices && scene.actionLoopSlices.length > 0 ? (
                    <span
                      className="text-[10px] font-mono text-fuchsia-300 bg-fuchsia-950/70 border border-fuchsia-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"
                      title={scene.actionLoopSlices.map((sl) => `${sl.clipId} (${sl.sliceDurationFrames}f)`).join(" ➔ ")}
                    >
                      <span className="text-fuchsia-400 font-bold">⚡ Markov:</span>
                      <strong className="text-zinc-100 truncate max-w-[150px]">
                        {scene.actionLoopSlices.length === 1
                          ? scene.actionLoopSlices[0].clipId.replace(/^ruby_burgundy_/, "")
                          : `${scene.actionLoopSlices[0].clipId.replace(/^ruby_burgundy_/, "")} +${scene.actionLoopSlices.length - 1}`}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/70 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      <span className="text-purple-400 font-bold">⚡ Loop:</span>
                      <strong className="text-zinc-100 truncate max-w-[130px]">
                        {(scene.presenterConfig?.selectedActionLoopId || scene.presenter?.selectedActionLoopId || algo?.label || "Intro Welcome").replace(/^ruby_burgundy_/, "")}
                      </strong>
                    </span>
                  )}

                  {/* Per-Scene Reroll Button */}
                  {onRerollSceneLoop && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRerollSceneLoop(sceneIdx);
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-purple-500/40 text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                      title="Reroll starting loop from this scene forward"
                    >
                      <Shuffle className="h-2.5 w-2.5 text-purple-400" />
                      <span>Reroll</span>
                    </button>
                  )}

                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                    🎥 {algo?.cameraLabel || "Cam 1 (Center Wide)"}
                  </span>
                </div>

                {/* Instant Neural Lip-Sync Test Shortcut, Lip-Sync Ready Badge, OR Veo Native Badge */}
                {isVeo ? (
                  <span
                    className="text-[10px] px-2.5 py-0.5 rounded-full border border-purple-500/40 text-purple-300 bg-purple-950/70 font-semibold flex items-center gap-1 shadow-sm"
                    title="Veo video scene already features native presenter performance (lip-sync skipped)"
                  >
                    <Film className="h-2.5 w-2.5 text-purple-400" />
                    <span>Veo Native (Lip-Sync Skipped)</span>
                  </span>
                ) : isLipSynced ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTestLipSync?.(sceneIdx, activePersonaId, scene.audioUrl, { force: true });
                    }}
                    className="text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    title="Lip-sync video is up to date with current audio and action loop. Click to re-sync."
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    <span>Lip-Sync Ready</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTestLipSync?.(sceneIdx, activePersonaId, scene.audioUrl, { force: true });
                    }}
                    className="text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Test real-time neural lip-sync for this scene"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Test Lip-Sync</span>
                  </button>
                )}
              </div>

              {/* Row 3: Inline Video Player when Expanded */}
              {isExpanded && (
                (scene.presenterVideoUrl || (isVeo && (scene.customVeoVideoUrl || scene.primaryMediaUrl))) ? (
                  <SceneVideoPreview
                    url={scene.presenterVideoUrl || scene.customVeoVideoUrl || scene.primaryMediaUrl!}
                    onClose={() => handleToggleExpand(null)}
                  />
                ) : (
                  <div className="mt-2.5 ml-6 relative rounded-lg overflow-hidden border border-purple-500/40 bg-black p-6 text-center text-xs text-zinc-400 space-y-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(null);
                      }}
                      className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/80 hover:bg-black text-zinc-300 hover:text-white flex items-center justify-center text-xs"
                      title="Close video preview"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="font-semibold text-zinc-300">No scene video generated yet.</p>
                    <p className="text-[10px] text-zinc-500">
                      Click &quot;⚡ Test Lip-Sync&quot; above to preview real-time neural lip-sync.
                    </p>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
