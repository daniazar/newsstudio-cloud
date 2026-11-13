"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Brain, Copy, Download, RefreshCw, Shirt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LazyThumbnail } from "./LazyThumbnail";
import { OutfitItem, SamAnalysisResult } from "./types";
import { useToast } from "@/components/global/ToastContainer";

export interface AttireBlueprintInspectorProps {
  activeOutfit: OutfitItem;
  samAnalysisData: Record<string, SamAnalysisResult>;
  analyzingOutfitId: string | null;
  onAnalyzeSamVision: (outfit: OutfitItem) => void;
  onSelectForInpaint: (outfit: OutfitItem) => void;
  selectedPersonaId: string;
  storyId?: string | null;
  onApplyToTrackPrompt?: (samPrompt?: string) => void;
}

export const AttireBlueprintInspector = React.memo(function AttireBlueprintInspector({
  activeOutfit,
  samAnalysisData,
  analyzingOutfitId,
  onAnalyzeSamVision,
  onSelectForInpaint,
  selectedPersonaId,
  storyId,
  onApplyToTrackPrompt,
}: AttireBlueprintInspectorProps) {
  const { toast } = useToast();

  const isAnalyzing = analyzingOutfitId === activeOutfit.id;
  const analysis = samAnalysisData[activeOutfit.id];

  return (
    <div className="w-full xl:w-[420px] xl:border-l border-t xl:border-t-0 border-border/80 bg-surface/80 p-4 xl:p-6 overflow-y-auto flex flex-col gap-4 shrink-0">
      {/* 4-Panel Master Blueprint View */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl group">
        {activeOutfit?.imageUrl ? (
          <LazyThumbnail
            src={activeOutfit.imageUrl}
            alt={activeOutfit.name}
            aspectRatio="aspect-video"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-2">
            <Shirt className="w-8 h-8 opacity-40" />
            <p className="text-xs font-bold">Select an outfit to preview</p>
          </div>
        )}
      </div>

      {/* 4-Panel Technical Breakdown */}
      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-surface-raised border border-border/80 text-[9px] font-mono text-center">
        <div className="p-1.5 rounded bg-black/40 border border-white/5">
          <span className="text-purple-300 font-bold block">1. Front</span>
          <span className="text-muted text-[8px] truncate block">Full Cut</span>
        </div>
        <div className="p-1.5 rounded bg-black/40 border border-white/5">
          <span className="text-purple-300 font-bold block">2. Side</span>
          <span className="text-muted text-[8px] truncate block">Profile</span>
        </div>
        <div className="p-1.5 rounded bg-black/40 border border-white/5">
          <span className="text-purple-300 font-bold block">3. Back</span>
          <span className="text-muted text-[8px] truncate block">Rear Seam</span>
        </div>
        <div className="p-1.5 rounded bg-black/40 border border-white/5">
          <span className="text-purple-300 font-bold block">4. Macro</span>
          <span className="text-muted text-[8px] truncate block">Accessories</span>
        </div>
      </div>

      {/* Attire Specification Card */}
      <div className="p-4 rounded-xl bg-surface border border-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-accent uppercase flex items-center gap-1.5">
            <span>
              {activeOutfit.gender === "female"
                ? "🎙️ Female Attire"
                : activeOutfit.gender === "male"
                ? "👔 Male Attire"
                : "🧥 Unisex Attire"}
            </span>
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
            {activeOutfit.category}
          </span>
        </div>
        <h3 className="text-sm font-bold text-foreground">{activeOutfit.name}</h3>
        <p className="text-xs text-muted leading-relaxed">
          {activeOutfit.description || activeOutfit.prompt}
        </p>

        {/* Multimodal Vision SAM 3.1 Inspector Card */}
        <div className="p-3 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>SAM 3.1 Vision Analyzer</span>
            </div>
            {analysis && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {(analysis.confidence * 100).toFixed(0)}% • {analysis.providerUsed.toUpperCase()}
              </span>
            )}
          </div>

          {activeOutfit.samPrompt ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-purple-300 bg-black/40 p-2 rounded-lg border border-purple-500/20">
                <span className="font-bold text-muted block text-[9px] uppercase">
                  SAM 3.1 Mask Targets:
                </span>
                <span className="text-foreground leading-relaxed break-words">
                  {activeOutfit.samPrompt}
                </span>
              </div>

              {analysis?.groundingDinoPrompt && (
                <div className="text-[10px] font-mono text-blue-300 bg-black/40 p-2 rounded-lg border border-blue-500/20">
                  <span className="font-bold text-muted block text-[9px] uppercase">
                    GroundingDINO Tokens:
                  </span>
                  <span className="text-blue-200 leading-relaxed break-words">
                    {analysis.groundingDinoPrompt}
                  </span>
                </div>
              )}

              {analysis?.detectedGarments && analysis.detectedGarments.length > 0 && (
                <div className="flex flex-col gap-1 mt-0.5">
                  <span className="text-[9px] font-mono font-bold text-muted uppercase">
                    Visual Garment Decomposition:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {analysis.detectedGarments.map((g, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-200 border border-purple-500/30 flex items-center gap-1"
                        title={`Category: ${g.category} | Material: ${g.material || "N/A"}`}
                      >
                        <span className="font-bold">{g.label}</span>
                        {g.color && <span className="text-[8px] text-muted">({g.color})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onAnalyzeSamVision(activeOutfit)}
                  isLoading={isAnalyzing}
                  aria-label="Re-analyze attire plate with Vision LLM"
                  className="text-[10px] font-mono flex items-center gap-1 py-1 h-7 text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Analyze</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(activeOutfit.samPrompt || "");
                    toast("Copied", "SAM 3.1 tokens copied to clipboard", "success");
                  }}
                  aria-label="Copy SAM 3.1 tokens"
                  className="text-[10px] font-mono flex items-center gap-1 py-1 h-7"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </Button>
                {onApplyToTrackPrompt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onApplyToTrackPrompt(activeOutfit.samPrompt);
                      toast("Applied", "SAM prompt applied to inpainting track prompt!", "success");
                    }}
                    aria-label="Apply SAM prompt to inpaint track prompt"
                    className="text-[10px] font-mono text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 py-1 h-7 ml-auto"
                  >
                    <span>Apply to Inpaint</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-muted leading-relaxed">
                No segmentation prompt formulated yet. Use Multimodal Vision (Gemini 2.5 Flash) to inspect this 4-panel plate and derive precision mask tokens.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onAnalyzeSamVision(activeOutfit)}
                isLoading={isAnalyzing}
                aria-label="Inspect plate with Vision LLM (SAM 3.1)"
                className="text-[10px] font-mono border-purple-500/40 text-purple-300 hover:bg-purple-500/10 flex items-center justify-center gap-1.5 py-1.5 h-8 w-full"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Inspect Plate with Vision LLM (SAM 3.1)</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-surface border border-border">
        <Button
          size="sm"
          variant="emerald-glow"
          onClick={() => onSelectForInpaint(activeOutfit)}
          aria-label="Inpaint this outfit onto video loop"
          className="w-full flex items-center justify-center gap-2 text-xs font-mono font-bold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Inpaint this Outfit onto Video Loop →</span>
        </Button>

        <div className="flex items-center justify-between">
          {activeOutfit?.imageUrl && (
            <a
              href={activeOutfit.imageUrl}
              download={`${selectedPersonaId}_${activeOutfit.id}.png`}
              aria-label={`Download look plate for ${activeOutfit.name}`}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-white/5 text-xs font-bold text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Look Plate</span>
            </a>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(activeOutfit.prompt);
              toast("Prompt Copied", "Wardrobe prompt copied to clipboard", "success");
            }}
            aria-label="Copy look prompt"
          >
            📋 Copy Look Prompt
          </Button>
        </div>

        {storyId ? (
          <Link
            href={`/editor/${storyId}?attire=${encodeURIComponent(activeOutfit.name)}&attirePrompt=${encodeURIComponent(activeOutfit.prompt)}`}
            className="w-full py-2 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors text-center block"
          >
            🎬 Assign Outfit to Story Segment →
          </Link>
        ) : (
          <Link
            href="/personas"
            className="text-xs font-bold text-accent hover:underline text-center block"
          >
            View in Persona Roster Vault →
          </Link>
        )}
      </div>
    </div>
  );
});
