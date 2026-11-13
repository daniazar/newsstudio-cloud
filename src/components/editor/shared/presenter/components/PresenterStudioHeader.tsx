/**
 * src/components/editor/shared/presenter/components/PresenterStudioHeader.tsx
 *
 * Header banner and 1-Click Auto-Generate batch orchestrator bar
 * for PresenterStudioPanel.
 */

import React from "react";
import { Wand2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModelSize } from "../types";

interface PresenterStudioHeaderProps {
  doneCount: number;
  validSegmentsCount: number;
  audioCount: number;
  selectedModel: ModelSize;
  isAnyGenerating: boolean;
  onGenerateAll: (forceAll?: boolean) => void;
}

export function PresenterStudioHeader({
  doneCount,
  validSegmentsCount,
  audioCount,
  selectedModel,
  isAnyGenerating,
  onGenerateAll,
}: PresenterStudioHeaderProps) {
  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between text-purple-400 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎬</span>
          <h3 className="text-sm font-bold uppercase tracking-widest">Presenter Studio</h3>
        </div>
        <span className="text-[10px] font-mono text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-500/40">
          {doneCount}/{validSegmentsCount} RENDERED
        </span>
      </div>

      {/* ── 1-Click Auto-Generate All Presenter Lip-Sync Banner ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/50 via-surface to-emerald-950/30 border border-purple-500/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-foreground">Auto-Generate All Presenter Videos</span>
          </div>
          <span className="text-[10px] font-mono text-muted">{selectedModel.toUpperCase()} ENGINE</span>
        </div>
        <p className="text-[11px] text-muted leading-relaxed">
          Synthesize full neural lip-sync videos across all {validSegmentsCount} scenes using the selected model engine.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={isAnyGenerating || audioCount === 0}
            onClick={() => onGenerateAll(doneCount === audioCount)}
            className="flex-1 text-xs font-bold flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 h-9 cursor-pointer disabled:opacity-50"
          >
            {isAnyGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Presenter Videos...</span>
              </>
            ) : doneCount === audioCount && doneCount > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Regenerate All Presenter Videos ({audioCount}/{validSegmentsCount})</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Auto-Generate All Presenter Videos ({audioCount}/{validSegmentsCount} Audio Ready)</span>
              </>
            )}
          </Button>
          {doneCount > 0 && doneCount < audioCount && (
            <Button
              size="sm"
              variant="glass"
              disabled={isAnyGenerating}
              onClick={() => onGenerateAll(true)}
              className="text-[11px] font-bold border-purple-500/50 hover:bg-purple-950/50 text-purple-200 h-9 cursor-pointer"
              title="Force regenerate all scenes from scratch"
            >
              <RefreshCw className="w-3 h-3 text-purple-400 mr-1" />
              Force All
            </Button>
          )}
        </div>
        {audioCount < validSegmentsCount && (
          <p className="text-[10px] text-amber-400/80 italic text-center">
            💡 Tip: Generate all scene voiceovers in the <strong>🎙️ Voice</strong> tab first for best lip-sync accuracy.
          </p>
        )}
      </div>
    </>
  );
}
