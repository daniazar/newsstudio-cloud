import React from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Wand2, Grid, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EditorActionHub, type EditorMode, type CommercialReadinessMatrix } from "@/components/editor/shared";
import { PERSONAS } from "@/lib/tts/personas";
import type { AspectRatio } from "@/lib/types";
import type { StoryData, StorySegment } from "./hooks/useStoryEditorState";

export interface EditorTopBarProps {
  story: StoryData | null;
  storyId: string;
  isEditingTitle: boolean;
  setIsEditingTitle: (v: boolean) => void;
  titleEditValue: string;
  setTitleEditValue: (v: string) => void;
  handleSaveTitle: (title: string) => void;
  handleRecastPersona: (personaId: string) => void;
  clonedPersonas: { id: string; name: string }[];
  isAutoDirecting: boolean;
  handleMagicAutoDirect: () => void;
  aspectRatio: AspectRatio;
  handleUpdateVideoSettings: (settings: Record<string, unknown>) => void;
  showSafeZones: boolean;
  setShowSafeZones: (v: boolean) => void;
  showTickerTape: boolean;
  setShowTickerTape: (v: boolean) => void;
  sfxEnabled: boolean;
  setSfxEnabled: (v: boolean) => void;
  isSplitPreview: boolean;
  setIsSplitPreview: (v: boolean) => void;
  handleSaveTakeSnapshot: () => void;
  editorMode: EditorMode;
  setEditorMode: (m: EditorMode) => void;
  undoCount: number;
  redoCount: number;
  handleUndo: () => void;
  handleRedo: () => void;
  setShowShortcutsModal: (v: boolean) => void;
  readinessMatrix: CommercialReadinessMatrix;
  handleAutoProduceEpisode: () => void;
  isAutoProducing: boolean;
  presenterConfig: Record<string, unknown>;
  handlePolishScriptWithLlm: () => void;
  isPolishingScript: boolean;
  handleAutoMatchAllBRoll: () => void;
  setShowLocalizationModal: (v: boolean) => void;
  scriptSegments: StorySegment[];
  handleShuffleActionLoops: (loopsList?: string[], personaId?: string) => void;
  selectedSceneIndex: number | null;
  handleReshuffleActiveSceneLoop: (targetSceneIndex?: number, loopsList?: string[], personaId?: string) => void;
  setRenderQuality: (q: "draft" | "master") => void;
  handleRenderVideo: () => void;
  isRendering: boolean;
  setShowOmnichannelModal: (v: boolean) => void;
  isBatchExporting: boolean;
  setShowPublishModal: (v: boolean) => void;
  setStory: (updater: StoryData | null | ((prev: StoryData | null) => StoryData | null), recordUndo?: boolean) => void;
}

export function EditorTopBar({
  story,
  storyId,
  isEditingTitle,
  setIsEditingTitle,
  titleEditValue,
  setTitleEditValue,
  handleRecastPersona,
  clonedPersonas,
  isAutoDirecting,
  handleMagicAutoDirect,
  aspectRatio,
  handleUpdateVideoSettings,
  showSafeZones,
  setShowSafeZones,
  showTickerTape,
  setShowTickerTape,
  sfxEnabled,
  setSfxEnabled,
  isSplitPreview,
  setIsSplitPreview,
  handleSaveTakeSnapshot,
  editorMode,
  setEditorMode,
  undoCount,
  redoCount,
  handleUndo,
  handleRedo,
  setShowShortcutsModal,
  readinessMatrix,
  handleAutoProduceEpisode,
  isAutoProducing,
  presenterConfig,
  handlePolishScriptWithLlm,
  isPolishingScript,
  handleAutoMatchAllBRoll,
  setShowLocalizationModal,
  scriptSegments,
  handleShuffleActionLoops,
  selectedSceneIndex,
  handleReshuffleActiveSceneLoop,
  setRenderQuality,
  handleRenderVideo,
  isRendering,
  setShowOmnichannelModal,
  isBatchExporting,
  setShowPublishModal,
  setStory,
}: EditorTopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border/80 glass-panel z-20">
      <div className="flex items-center gap-4">
        <Link
          href="/newsroom"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-border/80 text-subtle hover:text-white hover:border-white/20 transition-all text-xs font-mono font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Control Center</span>
        </Link>
        <div>
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              className="text-sm font-bold bg-surface-raised border border-emerald-500/60 rounded-xl px-2.5 py-1 text-foreground w-72 focus:outline-none font-mono"
              value={titleEditValue}
              onChange={(e) => setTitleEditValue(e.target.value)}
              onBlur={async () => {
                setIsEditingTitle(false);
                if (titleEditValue.trim() && titleEditValue !== story?.script?.headline) {
                  setStory((prev: StoryData | null) => {
                    if (!prev?.script) return prev;
                    return { ...prev, script: { ...prev.script, headline: titleEditValue } };
                  });
                  try {
                    await fetch(`/api/stories/${storyId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "update-script", headline: titleEditValue }),
                    });
                  } catch {
                    console.error("Failed to update headline");
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          ) : (
            <h1
              className="text-sm font-black text-foreground truncate max-w-md cursor-text hover:text-emerald-400 transition-colors flex items-center gap-2"
              onClick={() => {
                setTitleEditValue(story?.script?.headline || "");
                setIsEditingTitle(true);
              }}
              title="Click to edit title"
            >
              <span>{story?.script?.headline || "Untitled Story"}</span>
              <Edit3 className="w-3 h-3 text-muted hover:text-foreground" />
            </h1>
          )}
          <p className="text-[10px] font-mono text-muted">{story?.feed?.name}</p>
        </div>
        <StatusBadge status={story?.status || "draft"} />
      </div>

      <div className="flex items-center gap-2">
        {/* Global Story Persona Quick-Recaster */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-border/80 px-2.5 py-1 rounded-xl">
          <span className="text-[10px] font-bold text-muted font-mono">Anchor:</span>
          <select
            value={story?.script?.segments?.[0]?.personaId || "ruby"}
            onChange={(e) => handleRecastPersona(e.target.value)}
            className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface text-foreground">
                {p.name} ({p.title})
              </option>
            ))}
            {clonedPersonas.map((cp: { id: string; name: string }) => (
              <option key={cp.id} value={cp.id} className="bg-surface text-foreground">
                ✨ {cp.name} (Cloned)
              </option>
            ))}
          </select>
        </div>

        {/* 🪄 1-Click Magic Auto-Direct */}
        <Button
          size="sm"
          variant="secondary"
          disabled={isAutoDirecting}
          onClick={handleMagicAutoDirect}
          className="font-mono text-xs border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 gap-1.5 cursor-pointer shadow-sm"
          title="Auto-generate missing audio, stock B-roll, and camera cuts in 1 click"
        >
          <Wand2 className={`w-3.5 h-3.5 ${isAutoDirecting ? "animate-spin text-amber-400" : "text-amber-400"}`} />
          <span>{isAutoDirecting ? "Directing..." : "Auto-Direct"}</span>
        </Button>

        {/* Aspect Ratio Segmented Toggle */}
        <div className="flex rounded-xl border border-border/80 bg-surface-raised/80 p-0.5 overflow-hidden">
          <button
            onClick={() => handleUpdateVideoSettings({ aspectRatio: "vertical" })}
            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
              aspectRatio === "vertical"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "text-muted hover:text-foreground"
            }`}
            title="9:16 Vertical (TikTok, Reels, Shorts)"
          >
            9:16
          </button>
          <button
            onClick={() => handleUpdateVideoSettings({ aspectRatio: "horizontal" })}
            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
              aspectRatio === "horizontal"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "text-muted hover:text-foreground"
            }`}
            title="16:9 Widescreen (YouTube, TV)"
          >
            16:9
          </button>
          <button
            onClick={() => handleUpdateVideoSettings({ aspectRatio: "square" })}
            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
              aspectRatio === "square"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "text-muted hover:text-foreground"
            }`}
            title="1:1 Square (Instagram Feed, LinkedIn)"
          >
            1:1
          </button>
        </div>

        {/* Safe Zones Toggle */}
        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
            showSafeZones
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-sm shadow-emerald-500/10"
              : "border-border/80 bg-white/[0.03] text-subtle hover:text-foreground"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Safe Zones</span>
        </button>

        {/* Broadcast Ticker Tape Toggle */}
        <button
          onClick={() => setShowTickerTape(!showTickerTape)}
          className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
            showTickerTape
              ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/10"
              : "border-border/80 bg-white/[0.03] text-subtle hover:text-foreground"
          }`}
          title="Toggle broadcast breaking news & financial marquee ticker tape"
        >
          <span>📊 Ticker</span>
        </button>

        {/* Sound Effects (SFX) Toggle */}
        <button
          onClick={() => setSfxEnabled(!sfxEnabled)}
          className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
            sfxEnabled
              ? "border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-sm shadow-amber-500/10"
              : "border-border/80 bg-white/[0.03] text-subtle hover:text-foreground"
          }`}
          title="Toggle automated broadcast sound effects (whooshes, stingers, pops)"
        >
          <span>🔊 SFX</span>
        </button>

        {/* Multi-Platform Split View Toggle */}
        <button
          onClick={() => setIsSplitPreview(!isSplitPreview)}
          className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
            isSplitPreview
              ? "border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm shadow-purple-500/10"
              : "border-border/80 bg-white/[0.03] text-subtle hover:text-foreground"
          }`}
          title="Simultaneous 16:9 Landscape & 9:16 Vertical split preview"
        >
          <span>📱 Split View</span>
        </button>

        {/* Story Snapshot Take */}
        <button
          onClick={handleSaveTakeSnapshot}
          className="px-2.5 py-1.5 rounded-xl border border-border/80 bg-white/[0.03] text-subtle hover:text-foreground hover:bg-white/[0.06] text-xs font-mono font-bold transition-colors cursor-pointer"
          title="Save Story Snapshot as Take B"
        >
          <span>📸 Take B</span>
        </button>

        {/* SRT Subtitles */}
        {story?.video?.id && (
          <a
            href={`/api/videos/${story.video.id}/subtitles?format=srt`}
            download
            className="px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border border-border/80 bg-white/[0.03] text-subtle hover:text-foreground hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors"
            title="Download subtitles for external editors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SRT</span>
          </a>
        )}

        {/* Unified Editor Action Hub */}
        <EditorActionHub
          editorMode={editorMode}
          onChangeEditorMode={setEditorMode}
          undoCount={undoCount}
          redoCount={redoCount}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onOpenShortcuts={() => setShowShortcutsModal(true)}
          readinessMatrix={readinessMatrix}
          onSmartCommercialSync={handleAutoProduceEpisode}
          isSmartSyncing={isAutoProducing}
          personaId={story?.script?.segments?.find((s) => (s.index ?? -1) >= 0)?.personaId || (presenterConfig.personaId as string | undefined) || "ruby"}
          onTriggerLlmScript={handlePolishScriptWithLlm}
          isGeneratingScript={isPolishingScript}
          onAutoMatchAssets={handleAutoMatchAllBRoll}
          onOpenLocalization={() => setShowLocalizationModal(true)}
          onShuffleLoops={() => {
            const currentPersona = scriptSegments.find((s) => s.personaId)?.personaId || (presenterConfig.personaId as string | undefined) || "ruby";
            handleShuffleActionLoops(undefined, currentPersona);
          }}
          onShuffleActiveSceneLoop={() => {
            const currentSeg = selectedSceneIndex !== null ? scriptSegments[selectedSceneIndex] : undefined;
            const currentPersona = currentSeg?.personaId || scriptSegments.find((s) => s.personaId)?.personaId || (presenterConfig.personaId as string | undefined) || "ruby";
            handleReshuffleActiveSceneLoop(undefined, undefined, currentPersona);
          }}
          activeSceneNumber={selectedSceneIndex !== null ? selectedSceneIndex + 1 : undefined}
          onRender={(quality) => {
            setRenderQuality(quality);
            handleRenderVideo();
          }}
          isRendering={isRendering}
          renderProgress={story?.video?.renderProgress ?? 0}
          onOpenOmnichannel={() => setShowOmnichannelModal(true)}
          isBatchRendering={isBatchExporting}
          onOpenPublish={() => setShowPublishModal(true)}
        />
      </div>
    </div>
  );
}
