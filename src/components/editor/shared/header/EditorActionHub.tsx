"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronDown,
  Globe2,
  Wand2,
  Layers,
  Share2,
  Download,
  Loader2,
  RotateCcw,
  RotateCw,
  Command,
  Zap,
  Film,
  Shuffle,
  CheckCircle2,
  Video,
} from "lucide-react";

export type EditorMode = "simple" | "pro";

export interface CommercialReadinessMatrix {
  totalScenes: number;
  audioReadyCount: number;
  presenterTotal: number;
  presenterReadyCount: number;
  isFullySynced: boolean;
  pendingAudioCount: number;
  pendingPresenterCount: number;
}

export interface EditorActionHubProps {
  editorMode?: EditorMode;
  onChangeEditorMode?: (mode: EditorMode) => void;
  // History & Shortcuts
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onOpenShortcuts: () => void;
  // Readiness & Smart Sync
  readinessMatrix?: CommercialReadinessMatrix;
  onSmartCommercialSync?: () => void;
  isSmartSyncing?: boolean;
  // Persona & Interactive Call Bridge
  personaId?: string;
  // AI Actions
  onTriggerLlmScript: () => void;
  isGeneratingScript: boolean;
  onAutoMatchAssets?: () => void;
  onOpenLocalization: () => void;
  onShuffleLoops?: () => void;
  onShuffleActiveSceneLoop?: () => void;
  activeSceneNumber?: number;
  // Export & Render Actions
  onRender: (quality: "draft" | "master") => void;
  isRendering: boolean;
  renderProgress: number;
  onOpenOmnichannel: () => void;
  isBatchRendering?: boolean;
  onOpenPublish: () => void;
  className?: string;
}

export function EditorActionHub({
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  onOpenShortcuts,
  readinessMatrix,
  onSmartCommercialSync,
  isSmartSyncing = false,
  personaId,
  onTriggerLlmScript,
  isGeneratingScript,
  onAutoMatchAssets,
  onOpenLocalization,
  onShuffleLoops,
  onShuffleActiveSceneLoop,
  activeSceneNumber,
  onRender,
  isRendering,
  renderProgress,
  onOpenOmnichannel,
  isBatchRendering = false,
  onOpenPublish,
  className = "",
}: EditorActionHubProps) {
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const aiMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setAiMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 1. Undo / Redo & Shortcuts */}
      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={undoCount === 0}
          title="Undo (Ctrl+Z)"
          className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <div className="h-3 w-px bg-zinc-800" />
        <button
          type="button"
          onClick={onRedo}
          disabled={redoCount === 0}
          title="Redo (Ctrl+Y)"
          className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenShortcuts}
        title="Keyboard Shortcuts (?)"
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <Command className="h-3 w-3 text-emerald-400" />
        <span className="font-mono text-[10px]">?</span>
      </button>

      {/* 2. Readiness Matrix & 1-Click Smart Sync */}
      {readinessMatrix && (
        <div className="flex items-center gap-2">
          {/* Readiness Status Pill */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono select-none transition-all ${
              readinessMatrix.isFullySynced
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "bg-zinc-900 border-zinc-800 text-zinc-300"
            }`}
            title={`Readiness Matrix: Audio ${readinessMatrix.audioReadyCount}/${readinessMatrix.totalScenes}, Presenter ${readinessMatrix.presenterReadyCount}/${readinessMatrix.presenterTotal}${
              readinessMatrix.isFullySynced ? " — 100% Ready for Export" : ""
            }`}
          >
            {readinessMatrix.isFullySynced ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <div className="flex items-center gap-2 text-[11px]">
              <span
                className={
                  readinessMatrix.audioReadyCount === readinessMatrix.totalScenes
                    ? "text-emerald-400 font-semibold"
                    : "text-amber-400 font-semibold"
                }
              >
                🎙️ {readinessMatrix.audioReadyCount}/{readinessMatrix.totalScenes}
              </span>
              <span className="text-zinc-600">•</span>
              <span
                className={
                  readinessMatrix.presenterReadyCount === readinessMatrix.presenterTotal
                    ? "text-emerald-400 font-semibold"
                    : "text-amber-400 font-semibold"
                }
              >
                🎬 {readinessMatrix.presenterReadyCount}/{readinessMatrix.presenterTotal}
              </span>
            </div>
          </div>

          {/* 1-Click Smart Sync Button (Visible when unready or syncing) */}
          {onSmartCommercialSync && (!readinessMatrix.isFullySynced || isSmartSyncing) && (
            <button
              type="button"
              onClick={onSmartCommercialSync}
              disabled={isSmartSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold transition-all shadow-sm shadow-cyan-950/30 disabled:opacity-50 cursor-pointer"
              title="1-Click Smart Commercial Sync: Synthesizes missing voice tracks & presenter lip-sync in an automated batch sequence"
            >
              {isSmartSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-cyan-400 fill-current" />
              )}
              <span>{isSmartSyncing ? "Syncing Commercial..." : "⚡ Smart Sync"}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. ✨ AI Tools Dropdown Menu */}
      <div ref={aiMenuRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setAiMenuOpen(!aiMenuOpen);
            setExportMenuOpen(false);
          }}
          aria-expanded={aiMenuOpen}
          aria-label="Toggle AI Tools Menu"
          aria-haspopup="true"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            aiMenuOpen
              ? "bg-purple-900/40 border-purple-500/50 text-purple-200"
              : "bg-purple-950/20 border-purple-500/30 text-purple-300 hover:bg-purple-900/30 hover:text-white"
          }`}
        >
          {isGeneratingScript ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          )}
          <span>AI Tools</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>

        {aiMenuOpen && (
          <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md z-50 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80">
              Generative AI Studio
            </div>

            {/* 1-Click Smart Commercial Sync */}
            {onSmartCommercialSync && (
              <button
                type="button"
                onClick={() => {
                  setAiMenuOpen(false);
                  onSmartCommercialSync();
                }}
                disabled={isSmartSyncing}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-cyan-950/40 hover:text-white transition-colors"
              >
                <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold block text-cyan-300">⚡ Smart Commercial Sync</span>
                  <span className="text-[10px] text-zinc-400 block">
                    Auto-synthesize missing voiceover & lip-sync for unready scenes
                  </span>
                </div>
              </button>
            )}

            {/* Live CVI Call Bridge */}
            <Link
              href={personaId ? `/interactive-call?persona=${encodeURIComponent(personaId)}` : "/interactive-call"}
              onClick={() => setAiMenuOpen(false)}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-emerald-950/40 hover:text-white transition-colors"
            >
              <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Video className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-semibold block text-emerald-300">🎥 Live CVI Call</span>
                <span className="text-[10px] text-zinc-400 block">
                  Launch interactive video call with {personaId ? personaId.toUpperCase() : "presenter"}
                </span>
              </div>
            </Link>

            {/* AI Script Rewrite */}
            <button
              type="button"
              onClick={() => {
                setAiMenuOpen(false);
                onTriggerLlmScript();
              }}
              disabled={isGeneratingScript}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-purple-950/40 hover:text-white transition-colors"
            >
              <div className="p-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <Wand2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-semibold block">✨ AI Script Rewrite</span>
                <span className="text-[10px] text-zinc-400 block">
                  Synthesize viral commercial copy via Gemini 2.5 Flash
                </span>
              </div>
            </button>

            {/* Auto-Match Assets */}
            {onAutoMatchAssets && (
              <button
                type="button"
                onClick={() => {
                  setAiMenuOpen(false);
                  onAutoMatchAssets();
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-cyan-950/40 hover:text-white transition-colors"
              >
                <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Film className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold block">🎯 Auto-Match Visuals</span>
                  <span className="text-[10px] text-zinc-400 block">
                    Direct scene styles & non-repeating catalog media
                  </span>
                </div>
              </button>
            )}

            {/* 6-Language Dubbing Matrix */}
            <button
              type="button"
              onClick={() => {
                setAiMenuOpen(false);
                onOpenLocalization();
              }}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-blue-950/40 hover:text-white transition-colors"
            >
              <div className="p-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Globe2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-semibold block">🌐 6-Language Matrix</span>
                <span className="text-[10px] text-zinc-400 block">
                  Translate & dub video to ES, EN, PT, FR, DE, IT
                </span>
              </div>
            </button>

            {/* Shuffle Action Loops */}
            {onShuffleLoops && (
              <button
                type="button"
                onClick={() => {
                  setAiMenuOpen(false);
                  onShuffleLoops();
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-pink-950/40 hover:text-white transition-colors"
              >
                <div className="p-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                  <Shuffle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold block">💃 Shuffle All Motion Loops</span>
                  <span className="text-[10px] text-zinc-400 block">
                    Randomize FSM kinematic presenter loops across entire story
                  </span>
                </div>
              </button>
            )}

            {/* Shuffle Active Scene Loop (Continuity-Locked) */}
            {onShuffleActiveSceneLoop && (
              <button
                type="button"
                onClick={() => {
                  setAiMenuOpen(false);
                  onShuffleActiveSceneLoop();
                }}
                className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-fuchsia-950/40 hover:text-white transition-colors"
              >
                <div className="p-1 rounded bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shrink-0">
                  <Shuffle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-semibold block">
                    🔀 Reshuffle Scene {activeSceneNumber !== undefined ? `#${activeSceneNumber}` : "Active"}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    Continuity-locked loop matching adjacent scene poses
                  </span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. 🚀 Consolidated Export CTA Button & Menu */}
      <div ref={exportMenuRef} className="relative flex items-center">
        <div className="flex items-center rounded-xl border border-emerald-500/40 bg-emerald-500 shadow-md shadow-emerald-950/40">
          {/* Main 1080p Render Action */}
          <button
            type="button"
            onClick={() => onRender("master")}
            disabled={isRendering}
            className="flex items-center gap-1.5 font-mono text-xs h-7 px-3 text-black font-bold hover:bg-emerald-400 rounded-l-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Render 1080p Master Video (Remotion MP4)"
          >
            {isRendering ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isRendering ? `Rendering ${renderProgress}%` : "Export MP4"}</span>
          </button>

          {/* Export Options Dropdown Trigger */}
          <button
            type="button"
            onClick={() => {
              setExportMenuOpen(!exportMenuOpen);
              setAiMenuOpen(false);
            }}
            aria-expanded={exportMenuOpen}
            aria-label="Toggle Export Menu"
            aria-haspopup="true"
            disabled={isRendering}
            className="h-7 px-1.5 text-black hover:bg-emerald-400 rounded-r-lg border-l border-emerald-600/40 transition-colors cursor-pointer"
            title="More Export & Publishing Options"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {exportMenuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md z-50 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80">
              Export & Publishing
            </div>

            {/* 1080p Master */}
            <button
              type="button"
              onClick={() => {
                setExportMenuOpen(false);
                onRender("master");
              }}
              disabled={isRendering}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-emerald-950/40 hover:text-white transition-colors"
            >
              <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Download className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-semibold block text-emerald-300">💎 1080p Master MP4</span>
                <span className="text-[10px] text-zinc-400 block">
                  Broadcast quality with full neural lip-sync & 60fps effects
                </span>
              </div>
            </button>

            {/* 720p Fast Draft */}
            <button
              type="button"
              onClick={() => {
                setExportMenuOpen(false);
                onRender("draft");
              }}
              disabled={isRendering}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <div className="p-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-semibold block">⚡ 720p Quick Draft</span>
                <span className="text-[10px] text-zinc-400 block">
                  Fast render preset for client review and previews
                </span>
              </div>
            </button>

            {/* 3x Omnichannel Package */}
            <button
              type="button"
              onClick={() => {
                setExportMenuOpen(false);
                onOpenOmnichannel();
              }}
              disabled={isBatchRendering}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-cyan-950/40 hover:text-white transition-colors"
            >
              <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-semibold block text-cyan-300">📱 3x Omnichannel Package</span>
                <span className="text-[10px] text-zinc-400 block">
                  Simultaneous 9:16 (TikTok), 16:9 (YouTube), 1:1 (Feed)
                </span>
              </div>
            </button>

            {/* Direct Social Publish */}
            <button
              type="button"
              onClick={() => {
                setExportMenuOpen(false);
                onOpenPublish();
              }}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs text-zinc-200 hover:bg-pink-950/40 hover:text-white transition-colors"
            >
              <div className="p-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                <Share2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="font-semibold block text-pink-300">📢 Publish to Social</span>
                <span className="text-[10px] text-zinc-400 block">
                  Direct upload to TikTok Shop, Instagram Reels, YouTube Shorts
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
