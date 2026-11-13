/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableVideoPreviewSection.tsx
 *
 * Active video playback player and attachment toolbar for Neural Turntable videos:
 * - Native video playback with looping
 * - Audio mute toggle
 * - Attach to Current Scene & Apply to All Scenes
 * - Save to Product Assets catalog
 * - Revert / Detach from scene
 */

import React, { useState } from "react";
import {
  Film,
  Volume2,
  VolumeX,
  Check,
  BookmarkPlus,
  Copy,
  RotateCcw,
  Trash2,
  Sparkles,
  Package,
} from "lucide-react";
import { AdScene, ExtractedProductAsset } from "@/lib/types/ecommerce";

interface TurntableVideoPreviewSectionProps {
  currentScene: AdScene;
  activeTurntableUrl?: string;
  allScenes?: AdScene[];
  productAssets: ExtractedProductAsset[];
  onUpdateScene: (updates: Partial<AdScene>) => void;
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  onOpenExportModal?: () => void;
  onOpenHookMatrixModal?: () => void;
  handleDeleteTurntableVideo: () => Promise<void>;
  handleDetachMediaFromScene: (e?: React.MouseEvent) => void;
  isDeletingTurntable: boolean;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
}

export function TurntableVideoPreviewSection({
  currentScene,
  activeTurntableUrl,
  allScenes = [],
  productAssets = [],
  onUpdateScene,
  onAddAsset,
  onAssignMediaToScene,
  onOpenExportModal,
  onOpenHookMatrixModal,
  handleDeleteTurntableVideo,
  handleDetachMediaFromScene,
  isDeletingTurntable,
  toast,
}: TurntableVideoPreviewSectionProps) {
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showApplyMenu, setShowApplyMenu] = useState<boolean>(false);
  const [safeZone, setSafeZone] = useState<"none" | "tiktok" | "reels">("none");

  if (!activeTurntableUrl) return null;

  const isSavedInCatalog = productAssets.some((a) => a.url === activeTurntableUrl);

  const handleSaveToCatalog = () => {
    if (onAddAsset && activeTurntableUrl) {
      onAddAsset({
        id: `asset_turntable_${Date.now()}`,
        url: activeTurntableUrl,
        type: "existing_video",
        altText: `Neural Turntable Packshot: Scene #${(currentScene.sceneIndex ?? 0) + 1}`,
      });
      toast("Saved to Catalog", "Turntable video added to product assets.", "success");
    }
  };

  const handleApplyToScene = (targetIdx: number) => {
    if (onAssignMediaToScene && activeTurntableUrl) {
      onAssignMediaToScene(targetIdx, activeTurntableUrl, true);
      toast("Applied to Scene", `Turntable video applied to Scene #${targetIdx + 1}.`, "success");
    }
    setShowApplyMenu(false);
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-zinc-950/80 p-3.5 space-y-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold text-zinc-100 uppercase tracking-wide">
            Active Turntable Video Packshot
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Platform Safe-Zone Guide Toggle */}
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-zinc-800 text-[9px] font-mono">
            <span className="text-zinc-500 px-1">Guides:</span>
            {(["none", "tiktok", "reels"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSafeZone(mode)}
                className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  safeZone === mode
                    ? mode === "tiktok"
                      ? "bg-red-500 text-white"
                      : mode === "reels"
                      ? "bg-fuchsia-500 text-white"
                      : "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {mode === "none" ? "Off" : mode === "tiktok" ? "TikTok" : "Reels"}
              </button>
            ))}
          </div>

          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
            5.16s · 24fps
          </span>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-72 mx-auto border border-zinc-800 shadow-inner group">
        <video
          src={activeTurntableUrl}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Platform Safe-Zone Visual Guides */}
        {safeZone === "tiktok" && (
          <div className="absolute inset-0 pointer-events-none z-10 border-2 border-red-500/40 rounded-lg">
            <div className="absolute top-0 inset-x-0 h-[15%] bg-red-500/10 border-b border-red-500/30 flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold text-red-300">TikTok Header UI (15%)</span>
            </div>
            <div className="absolute top-[15%] bottom-[22%] right-0 w-[18%] bg-red-500/10 border-l border-red-500/30 flex items-center justify-center">
              <span className="text-[7.5px] font-mono font-bold text-red-300 rotate-90 whitespace-nowrap">TikTok Actions (18%)</span>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-[22%] bg-red-500/10 border-t border-red-500/30 flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold text-red-300">TikTok Captions & Audio (22%)</span>
            </div>
            <div className="absolute top-[18%] left-[5%] text-[8px] font-bold text-red-400 bg-black/60 px-1 rounded">
              Safe Area
            </div>
          </div>
        )}
        {safeZone === "reels" && (
          <div className="absolute inset-0 pointer-events-none z-10 border-2 border-fuchsia-500/40 rounded-lg">
            <div className="absolute top-0 inset-x-0 h-[12%] bg-fuchsia-500/10 border-b border-fuchsia-500/30 flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold text-fuchsia-300">Reels Header UI (12%)</span>
            </div>
            <div className="absolute top-[12%] bottom-[18%] right-0 w-[16%] bg-fuchsia-500/10 border-l border-fuchsia-500/30 flex items-center justify-center">
              <span className="text-[7.5px] font-mono font-bold text-fuchsia-300 rotate-90 whitespace-nowrap">Reels Actions (16%)</span>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-[18%] bg-fuchsia-500/10 border-t border-fuchsia-500/30 flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold text-fuchsia-300">Reels Audio & Captions (18%)</span>
            </div>
            <div className="absolute top-[15%] left-[5%] text-[8px] font-bold text-fuchsia-400 bg-black/60 px-1 rounded">
              Safe Area
            </div>
          </div>
        )}

        {/* Audio Mute/Unmute Overlay Toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-2.5 right-2.5 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm transition-all shadow-md cursor-pointer z-20"
          title={isMuted ? "Unmute audio" : "Mute audio"}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>

        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 text-[9px] font-mono text-cyan-300 font-bold backdrop-blur-sm border border-cyan-500/30 z-20">
          Scene #{(currentScene.sceneIndex ?? 0) + 1}
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Attach / Make Active Scene Turntable */}
          <button
            type="button"
            onClick={() => {
              onUpdateScene({
                sceneType: "product_turntable",
                customTurntableVideoUrl: activeTurntableUrl,
                primaryMediaUrl: activeTurntableUrl,
              });
              toast(
                "Attached to Scene",
                "Turntable video set as active visual mode for this scene.",
                "success"
              );
            }}
            className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Attach to Current Scene</span>
          </button>

          {/* Save to Catalog */}
          <button
            type="button"
            onClick={handleSaveToCatalog}
            disabled={isSavedInCatalog}
            className="py-1.5 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Save this turntable clip to product asset catalog"
          >
            <BookmarkPlus className="h-3.5 w-3.5 text-amber-400" />
            <span>{isSavedInCatalog ? "In Catalog" : "Save to Assets"}</span>
          </button>

          {/* Export 360° Pack */}
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="py-1.5 px-2.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Open Omnichannel 360° Export Media Kit & Embed Snippet"
            >
              <Package className="h-3.5 w-3.5 text-cyan-400" />
              <span>Export 360° Pack</span>
            </button>
          )}

          {/* 3-Hook A/B Ad Pack Matrix */}
          {onOpenHookMatrixModal && (
            <button
              type="button"
              onClick={onOpenHookMatrixModal}
              className="py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Open Paid Social 3-Hook Variation Matrix"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>3-Hook A/B Matrix</span>
            </button>
          )}

          {/* Apply to Other Scenes Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowApplyMenu(!showApplyMenu)}
              className="py-1.5 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-cyan-400" />
              <span>Apply to...</span>
            </button>

            {showApplyMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-44 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl p-1 z-20 space-y-0.5">
                <div className="px-2 py-1 text-[9.5px] font-bold text-zinc-400 uppercase">
                  Select Target Scene
                </div>
                {allScenes.map((scene) => (
                  <button
                    key={scene.id || scene.sceneIndex}
                    type="button"
                    onClick={() => handleApplyToScene(scene.sceneIndex)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-zinc-200 hover:bg-zinc-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>Scene #{scene.sceneIndex + 1}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {scene.sceneType}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Revert / Remove Toolbar */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px]">
          <button
            type="button"
            onClick={handleDetachMediaFromScene}
            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Revert to Static Packshot</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteTurntableVideo}
            disabled={isDeletingTurntable}
            className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            <span>Remove Video</span>
          </button>
        </div>
      </div>
    </div>
  );
}
