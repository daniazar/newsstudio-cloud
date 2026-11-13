"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { UnifiedMediaStudioModal } from "./shared/media/UnifiedMediaStudioModal";
import {
  Film,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from "lucide-react";

import { GlobalBackdropPicker } from "./shared/backdrop/GlobalBackdropPicker";
import type { VideoBackdropConfig } from "@/lib/types/ecommerce";
import { resolveStorageUrl } from "@/lib/storage/storageUtils";

interface Segment {
  id: string;
  index: number;
  text: string;
  imagePrompt?: string;
  startTime: number;
  endTime: number;
  assetPath?: string | null;
  assetType?: string | null;
  mediaSettings?: string | null;
  keyword?: string | null;
  backupKeywords?: string[];
  actionLoop?: string | null;
}

interface VisualsStudioPanelProps {
  segments: Segment[];
  storyId: string;
  articleImageUrls?: string[] | null;
  onUpdateAsset: (index: number, url: string, type: "video" | "image") => void;
  onRegenerateBRoll: (index: number) => void;
  onSelectScene?: (index: number) => void;
  backdrop?: VideoBackdropConfig;
  onChangeBackdrop?: (updates: Partial<VideoBackdropConfig>) => void;
  aspectRatio?: string;
}

export const VisualsStudioPanel: React.FC<VisualsStudioPanelProps> = ({
  segments,
  storyId: _storyId,
  articleImageUrls,
  onUpdateAsset,
  onRegenerateBRoll,
  onSelectScene,
  backdrop,
  onChangeBackdrop,
  aspectRatio,
}) => {
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);
  const [isMatchingAll, setIsMatchingAll] = useState(false);
  const [matchingIndex, setMatchingIndex] = useState<number | null>(null);

  // Filter out Intro (index -1) and Outro (index -2) bumpers from B-roll matching & matrix
  const storySegments = useMemo(() => {
    return segments.filter((s) => s.index >= 0 && s.id !== "intro" && s.id !== "outro");
  }, [segments]);

  const readyCount = storySegments.filter((s) => s.assetPath).length;
  const coveragePercent = storySegments.length > 0 ? Math.round((readyCount / storySegments.length) * 100) : 0;

  const handleMatchAll = async () => {
    setIsMatchingAll(true);
    // Skip scene index 0 (Opening Anchor in Studio Set), auto-match remaining story scenes
    for (const seg of storySegments) {
      if (seg.index === 0) continue;
      setMatchingIndex(seg.index);
      onRegenerateBRoll(seg.index);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    setMatchingIndex(null);
    setIsMatchingAll(false);
  };

  const handleSingleMatch = (index: number) => {
    if (index === 0) return;
    setMatchingIndex(index);
    onRegenerateBRoll(index);
    setTimeout(() => setMatchingIndex(null), 2500);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto space-y-4 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/80 shrink-0">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span>Visuals & B-Roll Studio</span>
          </h2>
          <p className="text-[11px] text-muted font-sans mt-0.5">
            Stock footage, AI imagery, and media coverage
          </p>
        </div>
        <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-500/30">
          {`${readyCount}/${storySegments.length} READY (${coveragePercent}%)`}
        </span>
      </div>

      {/* Global Virtual Studio Backdrop & Set Selector */}
      {backdrop && onChangeBackdrop && (
        <GlobalBackdropPicker
          backdrop={backdrop}
          onChangeBackdrop={onChangeBackdrop}
          aspectRatio={(aspectRatio === "16:9" || aspectRatio === "horizontal") ? "16:9" : (aspectRatio === "1:1" || aspectRatio === "square") ? "1:1" : "9:16"}
          defaultCollapsed={true}
          hideTuningControls={true}
        />
      )}

      {/* Batch Auto-Match All Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-surface to-purple-950/30 border border-sky-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-foreground">Auto-Match Story B-Roll</span>
          </div>
          <span className="text-[10px] font-mono text-muted">{`Scenes 2–${storySegments.length}`}</span>
        </div>
        <p className="text-[11px] text-muted leading-relaxed">
          Auto-matches stock video clips for B-roll scenes. <strong>Scene 1 is protected</strong> as the Full Anchor Studio Set.
        </p>
        <Button
          size="sm"
          disabled={isMatchingAll}
          onClick={handleMatchAll}
          className="w-full text-xs font-bold flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isMatchingAll ? "animate-spin" : ""}`} />
          <span>{isMatchingAll ? `Matching Scene ${matchingIndex !== null ? matchingIndex + 1 : ""}...` : "⚡ Auto-Match All B-Roll Clips"}</span>
        </Button>
      </div>

      {/* Scene-by-Scene Visual Matrix */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono uppercase font-bold text-muted block">
          {`Scene Media Matrix (${storySegments.length} Scenes)`}
        </span>

        {storySegments.map((seg) => {
          const isOpeningScene = seg.index === 0;
          const hasAsset = !!seg.assetPath;
          const isCurrentlyMatching = matchingIndex === seg.index;

          if (isOpeningScene) {
            return (
              <div
                key={seg.id || 0}
                className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/40 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-purple-300">
                      Scene 1 (Opening Hook)
                    </span>
                    <span className="text-[10px] font-mono text-muted">
                      ({seg?.startTime ?? 0}s - {seg?.endTime ?? ((seg?.startTime ?? 0) + 4)}s)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/40 flex items-center gap-1">
                    🎭 ANCHOR STUDIO SET
                  </span>
                </div>

                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                  {seg.text}
                </p>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs">
                      🏢
                    </div>
                    <div>
                      <span className="font-bold text-foreground block text-[11px]">Virtual Newsroom Set</span>
                      <span className="text-[9px] text-muted block">Full persona framing with 3D studio background plate</span>
                    </div>
                  </div>
                  {onSelectScene && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-[10px] h-7 px-2.5 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                      onClick={() => onSelectScene(0)}
                    >
                      Configure Anchor
                    </Button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={seg.id || seg.index}
              className="p-3 rounded-2xl bg-surface/90 border border-border/80 hover:border-border transition-all space-y-2.5"
            >
              {/* Scene Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-accent">
                    {`Scene ${seg.index + 1}`}
                  </span>
                  <span className="text-[10px] font-mono text-muted">
                    {`(${seg?.startTime ?? 0}s - ${seg?.endTime ?? ((seg?.startTime ?? 0) + 4)}s)`}
                  </span>
                </div>
                {hasAsset ? (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    MEDIA READY
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    NEEDS B-ROLL
                  </span>
                )}
              </div>

              {/* Spoken Text Preview */}
              <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                {seg.text}
              </p>

              {/* Asset Media Card / Preview */}
              <div className="flex gap-3 items-center">
                <div className="w-28 h-16 rounded-xl bg-black border border-border/80 overflow-hidden shrink-0 relative group">
                  {hasAsset ? (
                    seg.assetType === "video" || seg.assetPath?.endsWith(".mp4") ? (
                      <video
                        src={resolveStorageUrl(seg.assetPath)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onError={(e) => {
                          (e.target as HTMLVideoElement).style.display = "none";
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveStorageUrl(seg.assetPath)}
                        alt={`Scene ${seg.index + 1} preview`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted bg-white/[0.02]">
                      <Film className="w-4 h-4 opacity-40 mb-0.5" />
                      <span className="text-[8px] font-mono opacity-60">No Media</span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <button
                    onClick={() => setActiveModalIndex(seg.index)}
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-[10px] text-white font-bold transition-opacity cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Swap</span>
                  </button>
                </div>

                {/* Actions & Keyword */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-[10px] font-mono text-muted truncate">
                    Tag: <strong className="text-sky-300">#{seg.keyword || "news"}</strong>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-[10px] py-1 px-2 h-7 gap-1 flex-1"
                      onClick={() => setActiveModalIndex(seg.index)}
                    >
                      <Search className="w-3 h-3" />
                      <span>Browse Stock</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isCurrentlyMatching}
                      className="text-[10px] py-1 px-2 h-7 gap-1"
                      onClick={() => handleSingleMatch(seg.index)}
                      title="Auto-match keyword from Pexels"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCurrentlyMatching ? "animate-spin text-sky-400" : ""}`} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Media Studio Modal */}
      {(() => {
        if (activeModalIndex === null) return null;
        const activeSeg = storySegments.find((s) => s.index === activeModalIndex) || segments.find((s) => s.index === activeModalIndex);
        if (!activeSeg) return null;

        return (
          <UnifiedMediaStudioModal
            referenceImageUrls={articleImageUrls}
            suggestedKeywords={
              activeSeg.keyword
                ? [activeSeg.keyword, "broadcast", "news", "technology"]
                : ["news", "broadcast", "technology"]
            }
            segmentId={activeSeg.id}
            onSelect={(url, type) => {
              onUpdateAsset(activeSeg.index, url, type);
              setActiveModalIndex(null);
            }}
            onClose={() => setActiveModalIndex(null)}
          />
        );
      })()}
    </div>
  );
};
