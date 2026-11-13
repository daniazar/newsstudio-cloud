/**
 * src/components/editor/shared/presenter/components/PresenterSceneRow.tsx
 *
 * Individual scene row card with status indicator, avatar preview,
 * persona picker, generation actions, action loop switcher, and inline video player.
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { PERSONAS, getPersonaById } from "@/lib/tts/personas";
import { getAlgorithmicActionLoop } from "@/lib/types/stateMachine";
import { BROADCAST_ACTION_LOOPS, ModelSize, Segment, PresenterTtsClient } from "../types";

interface PresenterSceneRowProps {
  seg: Segment;
  totalSegments: number;
  isSelected: boolean;
  selectedModel: ModelSize;
  activePersonaId: string;
  isOnline: boolean;
  isGenerating: boolean;
  isGeneratingImage: boolean;
  cacheState: { status: string; videoUrl?: string };
  isExpanded: boolean;
  error?: string;
  message?: string;
  tts?: PresenterTtsClient;
  onSelectScene?: () => void;
  onUpdateAvatar: (url: string) => void;
  onUpdatePersona?: (personaId: string) => void;
  onDownloadAudio: () => void;
  onDownloadVideo: () => void;
  onToggleExpand: () => void;
  onDeleteVideo?: () => void;
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
  onUpdateActionLoop: (loopId: string) => void;
  onRerollLoop: () => void;
  onTestLipSync: () => void;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "done" || status === "cached")
    return <span className="text-accent">✓</span>;
  if (status === "generating")
    return <span className="text-yellow-400 animate-pulse">▶</span>;
  if (status === "error")
    return <span className="text-red-400">✗</span>;
  return <span className="text-muted/30">○</span>;
}

function InlineVideoPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-accent/30 bg-black relative">
      <button
        onClick={onClose}
        className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-black/70 text-white/80 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
      >
        ✕
      </button>
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="w-full max-h-48 object-contain bg-black"
      />
    </div>
  );
}

export function PresenterSceneRow({
  seg,
  totalSegments,
  isSelected,
  selectedModel,
  activePersonaId,
  isOnline,
  isGenerating,
  isGeneratingImage,
  cacheState,
  isExpanded,
  error,
  message,
  tts,
  onSelectScene,
  onUpdateAvatar,
  onUpdatePersona,
  onDownloadAudio,
  onDownloadVideo,
  onToggleExpand,
  onDeleteVideo,
  onGenerateImage,
  onGenerateVideo,
  onUpdateActionLoop,
  onRerollLoop,
  onTestLipSync,
}: PresenterSceneRowProps) {
  const hasAudio = !!seg.audioPath;
  const hasVideo = cacheState.status === "done" || cacheState.status === "cached";
  const personaId = seg.personaId ?? "ruby";
  const persona =
    getPersonaById(personaId) ||
    tts?.clonedPersonas?.find((p: { id: string }) => p.id === personaId);
  const avatarUrl = seg?.personaAvatarUrl || persona?.avatarUrl;

  const algo = getAlgorithmicActionLoop(seg?.index ?? 0, totalSegments || 1, seg?.text);
  let currentLoopId = seg?.actionLoop;
  if (!currentLoopId && seg?.mediaSettings) {
    try {
      currentLoopId = JSON.parse(seg.mediaSettings).actionLoop;
    } catch {}
  }
  if (!currentLoopId) currentLoopId = algo?.loopName || "ruby_idle";

  return (
    <div
      onClick={onSelectScene}
      className={`p-2.5 rounded-xl transition-all cursor-pointer ${
        isSelected
          ? "bg-purple-500/10 border border-purple-500/40 ring-1 ring-purple-500/30"
          : "border-b border-border/40 last:border-0 hover:bg-surface/60"
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 group">
        {/* Status icon */}
        <span
          className={`text-[10px] w-4 text-center flex-shrink-0 ${
            isGenerating
              ? "text-yellow-400"
              : hasVideo
              ? "text-accent"
              : error
              ? "text-red-400"
              : "text-muted/30"
          }`}
        >
          {isGenerating ? (
            <span className="inline-block animate-spin">⚙</span>
          ) : (
            <StatusIcon status={hasVideo ? "done" : error ? "error" : "pending"} />
          )}
        </span>

        {/* Thumbnail */}
        {avatarUrl && (
          <div className="w-5 h-7 rounded border border-border/80 overflow-hidden bg-surface flex-shrink-0 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Scene text preview */}
        <span
          className={`text-[9px] flex-1 truncate ${
            isGenerating ? "text-foreground font-medium" : "text-muted"
          }`}
        >
          <span className="font-bold text-muted/80 mr-1">{seg.index + 1}:</span>
          {seg.text?.slice(0, 32)}
          {seg.text?.length > 32 ? "…" : ""}
        </span>

        {/* Avatar Multi-Angle Picker */}
        {Boolean(persona && "avatars" in persona && Array.isArray(persona.avatars) && persona.avatars.length > 1) && (
          <div className="flex gap-0.5 items-center bg-surface/50 p-0.5 rounded border border-border/50">
            {(persona as { avatars: string[] }).avatars.map((url: string, i: number) => {
              const isAvatarSelected = seg.personaAvatarUrl
                ? seg.personaAvatarUrl === url
                : i === 0;
              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateAvatar(url);
                  }}
                  className={`w-4 h-4 rounded-sm overflow-hidden border ${
                    isAvatarSelected
                      ? "border-accent ring-1 ring-accent"
                      : "border-transparent opacity-50 hover:opacity-100"
                  } transition-all cursor-pointer`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Option ${i}`} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        )}

        {/* Per-Scene Persona Selector */}
        <select
          value={seg.personaId || activePersonaId}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onUpdatePersona?.(e.target.value);
          }}
          className="text-[9px] font-mono font-bold bg-surface border border-purple-500/30 text-purple-300 rounded px-1.5 py-0.5 focus:border-purple-400 focus:outline-none cursor-pointer flex-shrink-0"
          title="Change persona for this scene"
        >
          <optgroup label="Standard Anchors">
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          {Boolean(tts?.clonedPersonas && tts.clonedPersonas.length > 0) && (
            <optgroup label="Cloned Personas">
              {tts?.clonedPersonas?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasAudio && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownloadAudio();
              }}
              className="w-5 h-5 rounded-md bg-surface-raised border border-border text-muted hover:text-accent hover:border-accent/50 flex items-center justify-center transition-all cursor-pointer"
              title="Download Audio"
            >
              <span className="text-[10px]">🎙️</span>
            </button>
          )}

          {!hasAudio ? (
            <span className="text-[8px] text-muted/40 italic">no audio</span>
          ) : isGenerating ? (
            <span className="text-[9px] text-yellow-400 font-mono animate-pulse">
              generating...
            </span>
          ) : hasVideo ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadVideo();
                }}
                className="w-5 h-5 rounded-md bg-surface-raised border border-border text-muted hover:text-accent hover:border-accent/50 flex items-center justify-center transition-all cursor-pointer"
                title="Download Video"
              >
                <span className="text-[10px]">💾</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 hover:bg-accent/20 text-accent text-[10px] flex items-center justify-center cursor-pointer transition-colors"
                title={isExpanded ? "Hide video" : "Play video"}
              >
                {isExpanded ? "▼" : "▶"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteVideo?.();
                }}
                className="flex-shrink-0 w-6 h-6 rounded-md hover:bg-red-500/20 text-muted hover:text-red-400 flex items-center justify-center cursor-pointer transition-all"
                title="Delete generated presenter video"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateImage();
                }}
                disabled={isGeneratingImage || !isOnline || isGenerating}
                className={`text-[9px] px-2 py-0.5 rounded border font-bold transition-all cursor-pointer ${
                  isGeneratingImage
                    ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10 animate-pulse"
                    : isOnline
                    ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                    : "border-border text-muted/40 cursor-not-allowed"
                }`}
                title="Generate image starting frame variation"
              >
                {isGeneratingImage ? "🎨 Gen..." : "🎨 Gen Image"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateVideo();
                }}
                disabled={!isOnline || isGeneratingImage || isGenerating}
                className={`text-[9px] px-2 py-0.5 rounded border font-bold transition-all cursor-pointer ${
                  isOnline
                    ? selectedModel === "musetalk"
                      ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                      : "border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                    : "border-border text-muted/40 cursor-not-allowed"
                }`}
                title="Animate to lip-synced video scene"
              >
                🎬 Gen Video
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Loop Selector, Reroll & Test Lip-Sync */}
      <div className="mt-2 ml-6 flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border/40">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] text-muted font-semibold flex items-center gap-1">
            <span>🔄 Loop:</span>
          </span>
          <select
            value={currentLoopId}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onUpdateActionLoop(e.target.value);
            }}
            className="text-[9px] font-mono bg-surface border border-purple-500/30 text-purple-300 rounded px-1.5 py-0.5 focus:border-purple-400 focus:outline-none cursor-pointer max-w-[170px] truncate"
            title="Select action loop for this scene"
          >
            {[
              "Home / Clasped",
              "Right Explanatory",
              "Open Two Hands",
              "Left Presentation",
              "Lean / Thinking",
              "Transitions",
              "Classic Master",
            ].map((cat) => (
              <optgroup key={cat} label={cat}>
                {BROADCAST_ACTION_LOOPS.filter((l) => l.category === cat).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.icon} {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRerollLoop();
            }}
            className="w-5 h-5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] flex items-center justify-center transition-all cursor-pointer"
            title="Reroll loop for this scene"
          >
            🎲
          </button>
          <span className="text-[9px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-border/60">
            🎥 {algo.cameraLabel}
          </span>
        </div>

        {/* Instant Neural Lip-Sync Test Shortcut */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTestLipSync();
          }}
          className="text-[9px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold transition-all cursor-pointer flex items-center gap-1"
          title="Test Real-Time WebGL Neural Lip-Sync on this Action Loop"
        >
          <span>⚡</span> Test Lip-Sync
        </button>
      </div>

      {/* Status message while generating */}
      {(isGenerating || isGeneratingImage) && message && (
        <p className="mt-1 ml-6 text-[9px] text-yellow-400/70 italic leading-tight truncate">
          {message}
        </p>
      )}

      {/* Error message */}
      {error && !isGenerating && (
        <div className="mt-1 ml-6 flex items-center gap-2">
          <p className="text-[9px] text-red-400/80 italic leading-tight flex-1 line-clamp-2">
            {error}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateVideo();
            }}
            disabled={!isOnline || !hasAudio}
            className="text-[8px] text-red-400 hover:text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded cursor-pointer flex-shrink-0"
          >
            retry
          </button>
        </div>
      )}

      {/* Inline video player */}
      {isExpanded && cacheState.videoUrl && (
        <InlineVideoPlayer
          url={
            cacheState.videoUrl +
            (cacheState.videoUrl.includes("?") ? "&" : "?") +
            `t=${Date.now()}`
          }
          onClose={onToggleExpand}
        />
      )}
    </div>
  );
}
