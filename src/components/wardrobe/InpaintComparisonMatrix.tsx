"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SplitSquareHorizontal, RefreshCw, ArrowUpRight, Eye, Download, CheckCircle2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComparisonPlayer } from "./ComparisonPlayer";
import { InpaintProgressState, InpaintResultState, TransformationType } from "./types";
import { SavePersonaLookModal } from "./SavePersonaLookModal";
import { PersonaLook, PoseTag } from "@/lib/wardrobe/personaLookTypes";

export interface InpaintComparisonMatrixProps {
  playerViewMode: "side_by_side" | "slider" | "gif";
  onPlayerViewModeChange: (mode: "side_by_side" | "slider" | "gif") => void;
  isInpainting: boolean;
  inpaintProgress: InpaintProgressState;
  inpaintResult: InpaintResultState | null;
  activeJobId: string | null;
  onLoadVerifiedDemo: () => void;
  currentPersonaId: string;
  targetOutfitId: string;
  targetOutfitName: string;
  storyId?: string | null;
  transformationType?: TransformationType;
  currentPersonaName?: string;
  targetPersonaId?: string;
  targetPersonaName?: string;
  activeHairstyleName?: string;
  activeHairstyleId?: string;
  activeColorSwatch?: string;
  lightingPresetName?: string;
  poseTag?: PoseTag;
  recentJobs?: import("./SavePersonaLookModal").RecentJobItem[];
  existingLooks?: PersonaLook[];
  onSaveLookSuccess?: (look: PersonaLook) => void;
}

export const InpaintComparisonMatrix = React.memo(function InpaintComparisonMatrix({
  playerViewMode,
  onPlayerViewModeChange,
  isInpainting,
  inpaintProgress,
  inpaintResult,
  activeJobId,
  onLoadVerifiedDemo,
  currentPersonaId,
  targetOutfitId,
  targetOutfitName,
  storyId,
  transformationType = "attire",
  currentPersonaName,
  targetPersonaId,
  targetPersonaName,
  activeHairstyleName,
  activeHairstyleId,
  activeColorSwatch,
  lightingPresetName,
  poseTag = "M1",
  recentJobs,
  existingLooks,
  onSaveLookSuccess,
}: InpaintComparisonMatrixProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savedLook, setSavedLook] = useState<PersonaLook | null>(null);
  return (
    <div className="w-full xl:w-5/12 p-4 sm:p-6 flex flex-col gap-4 bg-background/50 overflow-y-visible xl:overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase text-muted tracking-wider flex items-center gap-2">
          <SplitSquareHorizontal className="w-4 h-4 text-purple-400" />
          Broadcast Comparison Matrix
        </h2>
        <div
          role="group"
          aria-label="Comparison view mode"
          className="flex items-center p-0.5 rounded-lg bg-black/40 border border-border text-[10px] font-mono"
        >
          <button
            onClick={() => onPlayerViewModeChange("side_by_side")}
            aria-label="Side-by-side comparison"
            aria-pressed={playerViewMode === "side_by_side"}
            className={`px-2 py-0.5 rounded ${
              playerViewMode === "side_by_side" ? "bg-purple-600 text-white" : "text-muted"
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => onPlayerViewModeChange("slider")}
            aria-label="Split slider comparison"
            aria-pressed={playerViewMode === "slider"}
            className={`px-2 py-0.5 rounded ${
              playerViewMode === "slider" ? "bg-purple-600 text-white" : "text-muted"
            }`}
          >
            Split Slider
          </button>
          <button
            onClick={() => onPlayerViewModeChange("gif")}
            aria-label="Loop GIF comparison"
            aria-pressed={playerViewMode === "gif"}
            className={`px-2 py-0.5 rounded ${
              playerViewMode === "gif" ? "bg-purple-600 text-white" : "text-muted"
            }`}
          >
            Loop GIF
          </button>
        </div>
      </div>

      {/* Progress Monitor if generating */}
      {isInpainting && (
        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/40 shadow-lg flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-300 font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              {inpaintProgress.message}
            </span>
            <span className="text-purple-400 font-bold">{inpaintProgress.percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-purple-500/20">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${inpaintProgress.percent}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-muted text-center pt-1">
            {transformationType === "compound" ? (
              <>
                <span className={inpaintProgress.percent >= 15 ? "text-purple-300 font-bold" : ""}>
                  1. Attire (0-25%)
                </span>
                <span className={inpaintProgress.percent >= 35 ? "text-purple-300 font-bold" : ""}>
                  2. Attire Diffusion
                </span>
                <span className={inpaintProgress.percent >= 60 ? "text-purple-300 font-bold" : ""}>
                  3. Hair Diffusion
                </span>
                <span className={inpaintProgress.percent >= 90 ? "text-purple-300 font-bold" : ""}>
                  4. Composite & Save
                </span>
              </>
            ) : (
              <>
                <span className={inpaintProgress.percent >= 15 ? "text-purple-300 font-bold" : ""}>
                  1. Audio/Latents
                </span>
                <span className={inpaintProgress.percent >= 35 ? "text-purple-300 font-bold" : ""}>
                  2. SAM 3.1 Tracking
                </span>
                <span className={inpaintProgress.percent >= 60 ? "text-purple-300 font-bold" : ""}>
                  3. H3 Diffusion
                </span>
                <span className={inpaintProgress.percent >= 90 ? "text-purple-300 font-bold" : ""}>
                  4. Uncrop & Save
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-muted pt-2 border-t border-purple-500/20 mt-1">
            <span className="truncate max-w-[200px]">
              Job ID: <span className="text-purple-300 font-bold">{activeJobId || "queued"}</span>
            </span>
            <Link
              href={`/pipeline?jobId=${activeJobId || ""}`}
              target="_blank"
              className="text-purple-400 hover:text-purple-300 underline flex items-center gap-1 shrink-0"
            >
              <span>View in Pipeline</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Master Video Display Box */}
      {inpaintResult ? (
        <ComparisonPlayer
          key={`${inpaintResult.originalVideoUrl}__${inpaintResult.outputPublicUrl}`}
          originalVideoUrl={inpaintResult.originalVideoUrl}
          inpaintedVideoUrl={inpaintResult.outputPublicUrl}
          outfitName={inpaintResult.outfitName}
          initialMode={playerViewMode}
        />
      ) : (
        <div className="relative w-full aspect-[9/16] rounded-2xl bg-black border-2 border-border overflow-hidden shadow-2xl flex items-center justify-center">
          <div className="p-8 text-center text-muted flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl">
              👗
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">No Video Inpaint Active</p>
              <p className="text-[10px] text-muted mt-1 max-w-xs">
                Select a loop and target outfit, then click &ldquo;Transform Video Outfit&rdquo;, or
                load the pre-verified demo.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={onLoadVerifiedDemo}
              className="text-xs font-mono mt-1"
            >
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>Preview Verified Sapphire Demo</span>
            </Button>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      {inpaintResult && (
        <div className="p-4 rounded-2xl bg-surface border border-border/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <a
                href={inpaintResult.outputPublicUrl}
                download={`inpainted_${currentPersonaId}_${targetOutfitId}.mp4`}
                className="px-3 py-1.5 rounded-xl bg-surface-raised border border-border hover:bg-white/5 text-xs font-bold text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Download Inpainted MP4</span>
              </a>

              <Button
                size="sm"
                variant="emerald-glow"
                onClick={() => setIsSaveModalOpen(true)}
                aria-label="Save as Persona Look"
                className="text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>⭐ Save as Persona Look</span>
              </Button>
            </div>

            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Boundary Locked (24fps)
            </span>
          </div>

          {/* Success Badge after saving */}
          {savedLook && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">✓ Saved to Persona Vault ({savedLook.lookName})</span>
              </div>
              {storyId ? (
                <Link
                  href={`/editor/${storyId}?attire=${encodeURIComponent(savedLook.outfitName)}&videoOverride=${encodeURIComponent(savedLook.videoUrl)}`}
                  className="underline text-white hover:text-emerald-200 font-sans font-bold text-xs"
                >
                  Test in Story Editor →
                </Link>
              ) : (
                <Link
                  href="/personas"
                  className="underline text-emerald-300 hover:text-white font-sans font-bold text-xs"
                >
                  Test in Story Editor →
                </Link>
              )}
            </div>
          )}

          {storyId ? (
            <Link
              href={`/editor/${storyId}?attire=${encodeURIComponent(targetOutfitName)}&videoOverride=${encodeURIComponent(inpaintResult.outputPublicUrl)}`}
              className="w-full py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors text-center block shadow-lg shadow-purple-600/20"
            >
              🎬 Apply Inpainted Loop to Story Segment →
            </Link>
          ) : (
            <Link
              href="/personas"
              className="text-xs font-bold text-purple-400 hover:underline text-center block pt-1"
            >
              View in Persona Roster Vault →
            </Link>
          )}
        </div>
      )}

      {/* Save as Persona Look Modal */}
      {inpaintResult && (
        <SavePersonaLookModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          personaId={transformationType === "persona" && targetPersonaId ? targetPersonaId : currentPersonaId}
          personaName={
            transformationType === "persona" && targetPersonaName
              ? targetPersonaName
              : currentPersonaName || currentPersonaId
          }
          videoUrl={inpaintResult.outputPublicUrl}
          outfitName={
            inpaintResult.outfitName ||
            (transformationType === "persona" ? `Transferred Outfit (${targetOutfitName})` : targetOutfitName)
          }
          outfitId={targetOutfitId}
          hairstyleName={activeHairstyleName}
          hairstyleId={activeHairstyleId}
          hairColorSwatch={activeColorSwatch}
          lightingPreset={lightingPresetName}
          poseTag={poseTag || "M1"}
          recentJobs={recentJobs}
          existingLooks={transformationType === "persona" ? undefined : existingLooks}
          onLookSaved={(look) => {
            setSavedLook(look);
            onSaveLookSuccess?.(look);
          }}
        />
      )}
    </div>
  );
});
